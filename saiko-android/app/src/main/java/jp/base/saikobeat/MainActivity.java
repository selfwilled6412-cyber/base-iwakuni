package jp.base.saikobeat;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.database.Cursor;
import android.provider.OpenableColumns;
import android.media.MediaPlayer;
import android.media.AudioAttributes;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.PermissionRequest;
import android.webkit.ConsoleMessage;
import android.view.View;

import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewAssetLoader.AssetsPathHandler;

import org.json.JSONObject;
import org.json.JSONArray;

import org.schabi.newpipe.extractor.NewPipe;
import org.schabi.newpipe.extractor.downloader.Downloader;
import org.schabi.newpipe.extractor.downloader.Request;
import org.schabi.newpipe.extractor.downloader.Response;
import org.schabi.newpipe.extractor.stream.AudioStream;
import org.schabi.newpipe.extractor.stream.StreamInfo;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.net.SocketException;
import java.net.SocketTimeoutException;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.RequestBody;

import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

/** Native on-device YouTube audio analysis; never sends audio to a cloud API. */
public final class MainActivity extends Activity {
  private static final Pattern VIDEO_ID=Pattern.compile("^[A-Za-z0-9_-]{11}$");
  private static final int MAX_AUDIO_BYTES=48*1024*1024;
  private static final int PICK_AUDIO_REQUEST=941;
  private WebView view;
  private final ExecutorService worker=Executors.newSingleThreadExecutor();
  private final AtomicBoolean busy=new AtomicBoolean(false);
  private WebViewAssetLoader assetLoader;
  private final Object musicLock = new Object();
  private MediaPlayer musicPlayer;
  private File musicFile;
  private volatile boolean musicCompleted=false;
  private String localDifficulty="normal";
  private static final OkHttpClient HTTP = new OkHttpClient.Builder()
    .connectTimeout(15, TimeUnit.SECONDS)
    .readTimeout(35, TimeUnit.SECONDS)
    .callTimeout(100, TimeUnit.SECONDS)
    .retryOnConnectionFailure(true).build();

  @SuppressLint("SetJavaScriptEnabled")
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    getWindow().setStatusBarColor(Color.rgb(7,14,35));
    getWindow().setNavigationBarColor(Color.rgb(7,14,35));
    try {NewPipe.init(new BasicDownloader());} catch(Exception ex) {android.util.Log.e("SAIKO","extractor init",ex);}
    assetLoader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new AssetsPathHandler(this)).build();
    view=new WebView(this);
    view.setBackgroundColor(Color.rgb(6,12,28));
    setContentView(view);
    WebSettings settings=view.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setMediaPlaybackRequiresUserGesture(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    view.setWebViewClient(new WebViewClient(){
      @Override public boolean shouldOverrideUrlLoading(WebView v,android.webkit.WebResourceRequest request){
        Uri target=request.getUrl();
        if("https".equals(target.getScheme())&&"appassets.androidplatform.net".equals(target.getHost())&&
           target.getPath()!=null&&target.getPath().startsWith("/assets/"))return false;
        if(request.isForMainFrame()&&"https".equals(target.getScheme())){
          try{startActivity(new Intent(Intent.ACTION_VIEW,target));}catch(Exception ignored){}
        }
        return true; // Never expose the privileged native JS bridge to another origin.
      }
      @Override public void onPageFinished(WebView v,String url){
        if(url.startsWith("https://appassets.androidplatform.net/assets/"))
          acceptSharedLink(getIntent());
      }
      @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView v,android.webkit.WebResourceRequest req) {
        return assetLoader.shouldInterceptRequest(req.getUrl());
      }
    });
    view.setWebChromeClient(new WebChromeClient(){
      @Override public boolean onConsoleMessage(ConsoleMessage message){
        android.util.Log.d("SAIKO-Web",message.message());return true;
      }
      // No microphone or camera permissions are required for this app.
      @Override public void onPermissionRequest(PermissionRequest req) {req.deny();}
    });
    view.addJavascriptInterface(new NativeAutoChart(),"SaikoNativeAutoChart");
    view.loadUrl("https://appassets.androidplatform.net/assets/piano-tiles.html");
  }

  private void acceptSharedLink(Intent intent){
    if(view==null||intent==null||!Intent.ACTION_SEND.equals(intent.getAction()))return;
    String raw=intent.getStringExtra(Intent.EXTRA_TEXT);
    if(raw==null)return;
    java.util.regex.Matcher match=java.util.regex.Pattern
      .compile("https?://(?:www\\.)?(?:youtube\\.com/watch\\?[^\\s]*v=|youtu\\.be/)[A-Za-z0-9_-]{11}[^\\s]*")
      .matcher(raw);
    if(!match.find())return;
    String shared=match.group();
    String expression="(function(){var x=document.getElementById('videoUrl');if(x){x.value="+
      JSONObject.quote(shared)+";document.getElementById('load').click();}})()";
    view.evaluateJavascript(expression,null);
  }
  @Override protected void onNewIntent(Intent intent){
    super.onNewIntent(intent);setIntent(intent);acceptSharedLink(intent);
  }

  private void notifyJS(String fn,String value) {
    final String expression="window."+fn+"("+JSONObject.quote(value)+");";
    runOnUiThread(()->{
      if(view!=null)view.evaluateJavascript(expression,null);
    });
  }

  public final class NativeAutoChart {
    /** Select an owned/licensed audio file without accessing device storage broadly. */
    @JavascriptInterface public void chooseLocalAudio(String level){
      final String difficulty=("easy".equals(level)||"hard".equals(level))?level:"normal";
      if(!busy.compareAndSet(false,true)){
        notifyJS("SaikoNativeLocalError","ほかの曲を解析しています");return;
      }
      runOnUiThread(()->{
        try{
          Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);
          pick.setType("audio/*");
          pick.addCategory(Intent.CATEGORY_OPENABLE);
          pick.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
          localDifficulty=difficulty;
          startActivityForResult(pick,PICK_AUDIO_REQUEST);
        }catch(Exception ex){
          busy.set(false);
          notifyJS("SaikoNativeLocalError","音楽ファイル選択画面を開けませんでした");
        }
      });
    }
    /** Audio drives the game position, never a simulated YouTube timer. */
    @JavascriptInterface public double currentSeconds(){
      synchronized(musicLock){
        try {return musicPlayer==null?0:musicPlayer.getCurrentPosition()/1000.0;}
        catch(IllegalStateException ignored){return 0;}
      }
    }
    @JavascriptInterface public boolean isMusicFinished(){return musicCompleted;}
    @JavascriptInterface public void playMusic(){
      runOnUiThread(()->{synchronized(musicLock){
        if(musicPlayer!=null)try{
          if(musicPlayer.getCurrentPosition()>=musicPlayer.getDuration()-100)musicPlayer.seekTo(0);
          musicCompleted=false;
          musicPlayer.start();
        }catch(IllegalStateException ignored){}
      }});
    }
    @JavascriptInterface public void pauseMusic(){
      runOnUiThread(()->{synchronized(musicLock){
        if(musicPlayer!=null)try{
          if(musicPlayer.isPlaying())musicPlayer.pause();
        }catch(IllegalStateException ignored){}
      }});
    }
    @JavascriptInterface public void analyze(String videoId,String level){
      if(videoId==null||!VIDEO_ID.matcher(videoId).matches()){
        notifyJS("SaikoNativeChartError","YouTubeの動画URLが正しくありません");return;
      }
      if(level==null||!(level.equals("easy")||level.equals("normal")||level.equals("hard")))level="normal";
      if(!busy.compareAndSet(false,true)){
        notifyJS("SaikoNativeChartError","ほかの曲を解析しています");return;
      }
      final String id=videoId,difficulty=level;
      worker.execute(()->{
        File cache=null;
        String stage="動画情報の取得";
        try {
          notifyJS("SaikoNativeChartProgress","動画の音声情報を取得しています…");
          StreamInfo info=StreamInfo.getInfo("https://www.youtube.com/watch?v="+id);
          if(info.getDuration()<5||info.getDuration()>600)
            throw new IOException("5秒から10分の動画に対応しています");
          String mediaUrl=null;
          for(AudioStream stream:info.getAudioStreams()){
            if(stream.isUrl()&&stream.getContent().startsWith("https://")){
              mediaUrl=stream.getContent();break;
            }
          }
          if(mediaUrl==null)throw new IOException("音声ストリームを取得できません");
          notifyJS("SaikoNativeChartProgress","スマホ内で音の波形を準備しています…");
          stage="音声データの取得";
          cache=File.createTempFile("saiko-audio-", ".media", getCacheDir());
          downloadAudio(mediaUrl,cache);
          stage="曲のリズム解析";
          notifyJS("SaikoNativeChartProgress","音楽のリズムを解析しています…");
          JSONObject chart=NativeBeatAnalyzer.analyze(cache,difficulty);
          // The same decoded source now drives the game audio. Do not hand
          // out a beatmap for a track we cannot actually play.
          prepareTrack(cache);
          cache=null; // Ownership transferred to the native music player.
          chart.put("video_id",id);
          notifyJS("SaikoNativeChartReady",chart.toString());
        } catch(Exception error) {
          android.util.Log.w("SAIKO","native chart failed",error);
          String msg=error.getMessage()==null?"アクセスに失敗しました":error.getMessage();
          String lower=msg.toLowerCase(java.util.Locale.ROOT);
          if(error instanceof SocketException||error instanceof SocketTimeoutException||
             lower.contains("connection abort")||lower.contains("connection reset"))
            msg="通信が途中で切断されました。Wi-Fi/4Gを切り替えて再試行してください";
          else if(lower.contains("bot")||lower.contains("sign in"))
            msg="YouTube側で自動取得が制限されています";
          else if(lower.contains("403")||lower.contains("429"))
            msg="YouTube側からアクセスを拒否されました";
          notifyJS("SaikoNativeChartError",stage+"："+msg.substring(0,Math.min(msg.length(),130)));
        } finally {
          if(cache!=null&&cache.exists()&&!cache.delete())cache.deleteOnExit();
          busy.set(false);
        }
      });
    }
  }

  @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
    super.onActivityResult(requestCode,resultCode,data);
    if(requestCode!=PICK_AUDIO_REQUEST)return;
    if(resultCode!=RESULT_OK||data==null||data.getData()==null){
      busy.set(false);notifyJS("SaikoNativeLocalCancelled","");return;
    }
    final Uri selected=data.getData();
    final String difficulty=localDifficulty;
    worker.execute(()->{
      File cache=null;
      try{
        notifyJS("SaikoNativeChartProgress","選択した音楽を端末内で解析しています…");
        cache=File.createTempFile("saiko-local-", ".media",getCacheDir());
        try(InputStream in=getContentResolver().openInputStream(selected);
            FileOutputStream out=new FileOutputStream(cache)){
          if(in==null)throw new IOException("ファイルを開けませんでした");
          byte[] buffer=new byte[65536];int n;long total=0;
          while((n=in.read(buffer))!=-1){
            total+=n;
            if(total>MAX_AUDIO_BYTES)throw new IOException("音源は48MB以下にしてください");
            out.write(buffer,0,n);
          }
          if(total<3000)throw new IOException("音声ファイルが空です");
        }
        JSONObject chart=NativeBeatAnalyzer.analyze(cache,difficulty);
        prepareTrack(cache);
        cache=null;
        String title="選択した音楽";
        try(Cursor cursor=getContentResolver().query(selected,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){
          if(cursor!=null&&cursor.moveToFirst())title=cursor.getString(0);
        }catch(Exception ignored){}
        if(title==null||title.isEmpty())title="選択した音楽";
        chart.put("title",title.substring(0,Math.min(90,title.length())));
        notifyJS("SaikoNativeLocalReady",chart.toString());
      }catch(Exception error){
        android.util.Log.w("SAIKO","local audio failed",error);
        String msg=error.getMessage()==null?"読み込みに失敗しました":error.getMessage();
        notifyJS("SaikoNativeLocalError",msg.substring(0,Math.min(140,msg.length())));
      }finally{
        if(cache!=null&&cache.exists())cache.delete();
        busy.set(false);
      }
    });
  }

  private void prepareTrack(File file) throws IOException {
    synchronized(musicLock){
      releaseTrackLocked();
      MediaPlayer next = new MediaPlayer();
      try {
        next.setAudioAttributes(new AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
        next.setDataSource(file.getAbsolutePath());
        next.prepare();
        musicCompleted=false;
        next.setOnCompletionListener(player->musicCompleted=true);
        musicPlayer=next;
        musicFile=file;
      }catch(IOException|RuntimeException ex){next.release();throw ex;}
    }
  }
  private void releaseTrackLocked(){
    musicCompleted=false;
    if(musicPlayer!=null){
      try{musicPlayer.stop();}catch(Exception ignored){}
      try{musicPlayer.release();}catch(Exception ignored){}
      musicPlayer=null;
    }
    if(musicFile!=null){if(musicFile.exists())musicFile.delete();musicFile=null;}
  }
  private void releaseTrack(){synchronized(musicLock){releaseTrackLocked();}}

  private static void downloadAudio(String streamUrl, File out) throws IOException {
    URL u = new URL(streamUrl);
    if (!"https".equals(u.getProtocol())) throw new IOException("音声URLが不正です");
    // Media endpoints can be on googlevideo.com. Use a streamed response and
    // never follow non-HTTPS redirects or load the complete file into RAM.
    okhttp3.Request request = new okhttp3.Request.Builder().url(streamUrl)
      .header("User-Agent", "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/129.0.0.0 Mobile Safari/537.36")
      .header("Accept", "*/*").build();
    IOException last = null;
    for (int attempt = 0; attempt < 2; attempt++) {
      try (okhttp3.Response response=HTTP.newCall(request).execute()) {
        if (!response.isSuccessful()) throw new IOException("音声取得 HTTP " + response.code());
        if (!response.request().url().isHttps()) throw new IOException("安全でない転送先です");
        okhttp3.ResponseBody body=response.body();
        if (body==null) throw new IOException("音声データが空です");
        if(body.contentLength()>MAX_AUDIO_BYTES) throw new IOException("音声が48MBを超えています");
        try(InputStream in=body.byteStream(); FileOutputStream output=new FileOutputStream(out,false)){
          byte[] buffer=new byte[65536]; int n, total=0;
          while((n=in.read(buffer))!=-1){
            total+=n;
            if(total>MAX_AUDIO_BYTES)throw new IOException("音声が48MBを超えています");
            output.write(buffer,0,n);
          }
          if(total<3000)throw new IOException("音声データを最後まで取得できませんでした");
          return;
        }
      }catch(SocketException|SocketTimeoutException error){
        last=error;
        if(attempt==1)throw error;
      }
    }
    if(last!=null)throw last;
  }

  /** Follow NewPipe's reference implementation: OkHttp handles HTTP/2, gzip,
   * redirects and idle socket failures better than raw HttpURLConnection. */
  private static final class BasicDownloader extends Downloader {
    @Override public Response execute(Request req) throws IOException {
      okhttp3.Request.Builder request=new okhttp3.Request.Builder().url(req.url())
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0");
      byte[] payload=req.dataToSend();
      RequestBody body=payload==null?null:RequestBody.create(payload);
      request.method(req.httpMethod(),body);
      if(req.headers()!=null)for(Map.Entry<String,List<String>> header:req.headers().entrySet()){
        request.removeHeader(header.getKey());
        if(header.getValue()!=null)for(String value:header.getValue())request.addHeader(header.getKey(),value);
      }
      try(okhttp3.Response response=HTTP.newCall(request.build()).execute()){
        if(!response.request().url().isHttps())throw new IOException("安全でない動画情報URLです");
        okhttp3.ResponseBody responseBody=response.body();
        String text=responseBody==null?"":responseBody.string();
        if(text.length()>4*1024*1024)throw new IOException("動画情報が大きすぎます");
        return new Response(response.code(),response.message(),response.headers().toMultimap(),text,response.request().url().toString());
      }
    }
  }

  @Override protected void onPause(){
    // Android may suspend WebView JS before visibilitychange is dispatched.
    // Pause audio immediately and let the UI enter a paused state on resume.
    synchronized(musicLock){
      if(musicPlayer!=null)try{
        if(musicPlayer.isPlaying())musicPlayer.pause();
      }catch(IllegalStateException ignored){}
    }
    if(view!=null)view.evaluateJavascript("window.SaikoPianoAutoPause&&window.SaikoPianoAutoPause();",null);
    super.onPause();
  }
  @Override protected void onResume(){
    super.onResume();
    if(view!=null)view.evaluateJavascript("window.SaikoPianoAutoPause&&window.SaikoPianoAutoPause();",null);
  }

  @Override public void onBackPressed(){
    if(view!=null&&view.canGoBack())view.goBack();else super.onBackPressed();
  }
  @Override public void onDestroy() {
    worker.shutdownNow();
    releaseTrack();
    if(view!=null){view.removeJavascriptInterface("SaikoNativeAutoChart");view.destroy();view=null;}
    super.onDestroy();
  }
}
