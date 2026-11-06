package jp.base.saikobeat;

import org.schabi.newpipe.extractor.NewPipe;
import org.schabi.newpipe.extractor.downloader.Downloader;
import org.schabi.newpipe.extractor.downloader.Request;
import org.schabi.newpipe.extractor.downloader.Response;
import org.schabi.newpipe.extractor.stream.AudioStream;
import org.schabi.newpipe.extractor.stream.StreamInfo;

import okhttp3.OkHttpClient;
import okhttp3.RequestBody;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.SocketException;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/** Debug-only YouTube diagnostic. NEVER include this GPL-3.0 extractor in
 * a release build; production music must come from authorized local files
 * or a separately licensed audio catalog.
 */
final class DebugYoutubeExtractor {
  private DebugYoutubeExtractor(){}
  private static final int MAX_AUDIO_BYTES=48*1024*1024;
  private static final OkHttpClient HTTP=new OkHttpClient.Builder()
    .connectTimeout(15,TimeUnit.SECONDS)
    .readTimeout(35,TimeUnit.SECONDS)
    .callTimeout(100,TimeUnit.SECONDS)
    .retryOnConnectionFailure(true).build();

  static void initialize(){NewPipe.init(new BasicDownloader());}

  static void loadAudio(String id,File out,Consumer<String> progress)throws Exception{
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
    progress.accept("スマホ内で音の波形を準備しています…");
    downloadAudio(mediaUrl,out);
  }

  private static void downloadAudio(String streamUrl,File out)throws IOException{
    URL url=new URL(streamUrl);
    if(!"https".equals(url.getProtocol()))throw new IOException("音声URLが不正です");
    okhttp3.Request request=new okhttp3.Request.Builder().url(streamUrl)
      .header("User-Agent","Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/129.0.0.0 Mobile Safari/537.36")
      .header("Accept","*/*").build();
    IOException last=null;
    for(int attempt=0;attempt<2;attempt++){
      try(okhttp3.Response response=HTTP.newCall(request).execute()){
        if(!response.isSuccessful())throw new IOException("音声取得 HTTP "+response.code());
        if(!response.request().url().isHttps())throw new IOException("安全でない転送先です");
        okhttp3.ResponseBody body=response.body();
        if(body==null)throw new IOException("音声データが空です");
        if(body.contentLength()>MAX_AUDIO_BYTES)throw new IOException("音声が48MBを超えています");
        try(InputStream in=body.byteStream();FileOutputStream output=new FileOutputStream(out,false)){
          byte[] buffer=new byte[65536];int n,total=0;
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

  private static final class BasicDownloader extends Downloader {
    @Override public Response execute(Request req)throws IOException{
      okhttp3.Request.Builder request=new okhttp3.Request.Builder().url(req.url())
        .header("User-Agent","Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0");
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
}
