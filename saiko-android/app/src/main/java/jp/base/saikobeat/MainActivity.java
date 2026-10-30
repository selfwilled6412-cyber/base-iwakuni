package jp.base.saikobeat;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
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
  private WebView view;
  private final ExecutorService worker=Executors.newSingleThreadExecutor();
  private final AtomicBoolean busy=new AtomicBoolean(false);
  private WebViewAssetLoader assetLoader;
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
    view.loadUrl("https://appassets.androidplatform.net/assets/youtube.html");
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

  @Override public void onBackPressed(){
    if(view!=null&&view.canGoBack())view.goBack();else super.onBackPressed();
  }
  @Override public void onDestroy() {
    worker.shutdownNow();
    if(view!=null){view.removeJavascriptInterface("SaikoNativeAutoChart");view.destroy();view=null;}
    super.onDestroy();
  }
}
