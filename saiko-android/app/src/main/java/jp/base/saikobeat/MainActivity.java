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
          cache=File.createTempFile("saiko-audio-", ".media", getCacheDir());
          downloadAudio(mediaUrl,cache);
          notifyJS("SaikoNativeChartProgress","音楽のリズムを解析しています…");
          JSONObject chart=NativeBeatAnalyzer.analyze(cache,difficulty);
          chart.put("video_id",id);
          notifyJS("SaikoNativeChartReady",chart.toString());
        } catch(Exception error) {
          android.util.Log.w("SAIKO","native chart failed",error);
          String type=error.getClass().getSimpleName();
          String msg=error.getMessage()==null?"動画の音声を取得できませんでした":error.getMessage();
          if(msg.toLowerCase().contains("bot")||msg.contains("Sign in"))msg="YouTubeがアクセスを制限しています";
          notifyJS("SaikoNativeChartError",type+": "+msg.substring(0,Math.min(msg.length(),120)));
        } finally {
          if(cache!=null&&cache.exists()&&!cache.delete())cache.deleteOnExit();
          busy.set(false);
        }
      });
    }
  }

  private static void downloadAudio(String streamUrl,File out) throws IOException {
    URL url=new URL(streamUrl);
    if(!url.getProtocol().equals("https"))throw new IOException("音声URLの形式が不正");
    HttpURLConnection conn=(HttpURLConnection)url.openConnection();
    conn.setConnectTimeout(12000);conn.setReadTimeout(20000);
    conn.setRequestProperty("User-Agent","Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/132.0.0.0 Mobile Safari/537.36");
    conn.setRequestProperty("Accept","*/*");
    try {
      if(conn.getResponseCode()<200||conn.getResponseCode()>299)
        throw new IOException("音声のアクセスが拒否されました ("+conn.getResponseCode()+")");
      if(conn.getContentLengthLong()>MAX_AUDIO_BYTES)throw new IOException("この音声はサイズ制限を超えます");
      try(InputStream in=conn.getInputStream();FileOutputStream fout=new FileOutputStream(out)){
        byte[] buffer=new byte[65536];int size,total=0;
        while((size=in.read(buffer))!=-1){
          total+=size;if(total>MAX_AUDIO_BYTES)throw new IOException("音声の最大容量を超えました");
          fout.write(buffer,0,size);
        }
        if(total<3000)throw new IOException("音声データが不完全です");
      }
    }finally{conn.disconnect();}
  }

  /** Metadata downloader required by NewPipeExtractor. */
  private static final class BasicDownloader extends Downloader {
    @Override public Response execute(Request req) throws IOException {
      HttpURLConnection conn=(HttpURLConnection)new URL(req.url()).openConnection();
      conn.setRequestMethod(req.httpMethod());
      conn.setConnectTimeout(12000);
      conn.setReadTimeout(20000);
      conn.setInstanceFollowRedirects(true);
      conn.setRequestProperty("User-Agent","Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/132.0.0.0 Mobile Safari/537.36");
      if(req.headers()!=null)for(Map.Entry<String,List<String>> header:req.headers().entrySet())
        if(header.getValue()!=null)for(String value:header.getValue())conn.addRequestProperty(header.getKey(),value);
      if(req.dataToSend()!=null&&req.dataToSend().length>0){
        conn.setDoOutput(true);
        try(java.io.OutputStream stream=conn.getOutputStream()){stream.write(req.dataToSend());}
      }
      try {
        int status=conn.getResponseCode();
        InputStream input=(status>=400?conn.getErrorStream():conn.getInputStream());
        ByteArrayOutputStream data=new ByteArrayOutputStream();
        if(input!=null)try(InputStream in=input){
          byte[] buf=new byte[8192];int n,total=0;
          while((n=in.read(buf))!=-1){
            total+=n;if(total>4*1024*1024)throw new IOException("Metadata too large");
            data.write(buf,0,n);
          }
        }
        return new Response(status,conn.getResponseMessage(),conn.getHeaderFields(),data.toString("UTF-8"),conn.getURL().toString());
      }finally{conn.disconnect();}
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
