package jp.base.saikobeat;

import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.AudioFormat;
import android.os.SystemClock;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Generates actual timestamped notes from native-decoded waveform. */
public final class NativeBeatAnalyzer {
  private NativeBeatAnalyzer(){}

  public static JSONObject analyze(File file,String difficulty) throws Exception {
    MediaExtractor extractor=new MediaExtractor();
    MediaCodec decoder=null;
    try {
      extractor.setDataSource(file.getAbsolutePath());
      int track=-1;
      MediaFormat format=null;
      for(int i=0;i<extractor.getTrackCount();i++){
        MediaFormat f=extractor.getTrackFormat(i);
        String mime=f.getString(MediaFormat.KEY_MIME);
        if(mime!=null&&mime.startsWith("audio/")){track=i;format=f;break;}
      }
      if(track<0||format==null)throw new IOException("音声として解析できない動画です");
      long durationUs=format.containsKey(MediaFormat.KEY_DURATION)?format.getLong(MediaFormat.KEY_DURATION):0;
      if(durationUs>600000000L)throw new IOException("10分を超える動画は未対応");
      extractor.selectTrack(track);
      decoder=MediaCodec.createDecoderByType(format.getString(MediaFormat.KEY_MIME));
      decoder.configure(format,null,null,0);
      decoder.start();

      ArrayList<Double> energies=new ArrayList<>();
      int channels=format.containsKey(MediaFormat.KEY_CHANNEL_COUNT)?format.getInteger(MediaFormat.KEY_CHANNEL_COUNT):2;
      int rate=format.containsKey(MediaFormat.KEY_SAMPLE_RATE)?format.getInteger(MediaFormat.KEY_SAMPLE_RATE):44100;
      int framesPerWindow=Math.max(256,rate/45); // about 22 ms per onset window
      double sum=0;
      int frames=0;
      boolean inputDone=false,outputDone=false;
      MediaCodec.BufferInfo bufferInfo=new MediaCodec.BufferInfo();
      long deadline=SystemClock.elapsedRealtime()+90000;
      int watchdog=0;
      while(!outputDone && watchdog++<100000&&SystemClock.elapsedRealtime()<deadline){
        if(!inputDone){
          int inIndex=decoder.dequeueInputBuffer(10000);
          if(inIndex>=0){
            ByteBuffer input=decoder.getInputBuffer(inIndex);
            if(input==null)throw new IOException("オーディオバッファがありません");
            input.clear();
            int read=extractor.readSampleData(input,0);
            if(read<0){
              decoder.queueInputBuffer(inIndex,0,0,0,MediaCodec.BUFFER_FLAG_END_OF_STREAM);
              inputDone=true;
            }else{
              long pts=extractor.getSampleTime();
              decoder.queueInputBuffer(inIndex,0,read,pts,0);
              extractor.advance();
            }
          }
        }
        int outIndex=decoder.dequeueOutputBuffer(bufferInfo,10000);
        if(outIndex==MediaCodec.INFO_OUTPUT_FORMAT_CHANGED){
          MediaFormat output=decoder.getOutputFormat();
          if(output.containsKey(MediaFormat.KEY_SAMPLE_RATE))rate=output.getInteger(MediaFormat.KEY_SAMPLE_RATE);
          if(output.containsKey(MediaFormat.KEY_CHANNEL_COUNT))channels=output.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
          framesPerWindow=Math.max(256,rate/45);
          if(output.containsKey(MediaFormat.KEY_PCM_ENCODING)&&output.getInteger(MediaFormat.KEY_PCM_ENCODING)!=AudioFormat.ENCODING_PCM_16BIT)
            throw new IOException("この端末のPCM音声形式に未対応");
        } else if(outIndex>=0){
          ByteBuffer b=decoder.getOutputBuffer(outIndex);
          if(b!=null&&bufferInfo.size>0){
            b.order(ByteOrder.LITTLE_ENDIAN);
            b.position(bufferInfo.offset);
            b.limit(bufferInfo.offset+bufferInfo.size);
            while(b.remaining()>=2*Math.max(1,channels)){
              double level=0;
              for(int ch=0;ch<channels;ch++){
                short pcm=b.getShort();
                double sample=pcm/32768.0;
                level+=sample*sample;
              }
              sum+=level/channels;
              if(++frames>=framesPerWindow){
                energies.add(Math.sqrt(sum/frames));sum=0;frames=0;
              }
            }
          }
          decoder.releaseOutputBuffer(outIndex,false);
          if((bufferInfo.flags&MediaCodec.BUFFER_FLAG_END_OF_STREAM)!=0)outputDone=true;
        }
        if(energies.size()>30000)break;
      }
      if(!outputDone&&energies.isEmpty())throw new IOException("音声デコードが完了しませんでした");
      if(energies.size()<150)throw new IOException("リズム解析には音声が短すぎます");
      return deriveChart(energies,rate,framesPerWindow,difficulty);
    }finally{
      if(decoder!=null){
        try{decoder.stop();}catch(Exception ignored){}
        decoder.release();
      }
      extractor.release();
    }
  }

  private static double meanEnergy(double[] values,double hop,double start,double end){
    int from=Math.max(0,(int)Math.floor(start/hop));
    int to=Math.min(values.length,(int)Math.ceil(end/hop));
    if(to<=from)return 0;
    double sum=0;
    for(int i=from;i<to;i++)sum+=values[i];
    return sum/(to-from);
  }

  public static JSONObject deriveChart(List<Double> envelope,int sampleRate,int samplesPerWindow,String difficulty)throws Exception{
    int n=envelope.size();
    final double hop=(double)samplesPerWindow/sampleRate;
    double peak=0;
    for(double v:envelope)peak=Math.max(peak,v);
    if(peak<0.008)throw new IOException("無音または音量が小さすぎる動画です");
    int radius=14;
    double[] onset=new double[n];
    double[] values=new double[n];
    for(int i=0;i<n;i++)values[i]=envelope.get(i);
    // Short-term attack increases based on measured samples, not evenly spaced BPM.
    for(int i=radius;i<n;i++){
      double mean=0;
      for(int j=i-radius;j<i;j++)mean+=values[j];
      mean/=radius;
      onset[i]=Math.max(0,values[i]-mean);
    }
    ArrayList<Double> sorted=new ArrayList<>();
    for(int i=radius;i<n;i++)if(values[i]>0.012)sorted.add(onset[i]);
    Collections.sort(sorted);
    if(sorted.isEmpty())throw new IOException("リズムを検出できません");
    double reference=sorted.get(Math.min(sorted.size()-1,(int)(sorted.size()*.92)));
    double threshold=Math.max(.024,Math.max(peak*.085,reference*.37));
    double gap="easy".equals(difficulty)?0.36:("hard".equals(difficulty)?0.13:0.20);
    int maxNotes="easy".equals(difficulty)?380:("hard".equals(difficulty)?1000:700);
    JSONArray notes=new JSONArray();
    double lastTime=-2;
    int lane=0;
    for(int i=radius+1;i<n-1;i++){
      double t=(i+.5)*hop;
      if(onset[i]<threshold||onset[i]<onset[i-1]||onset[i]<onset[i+1]||t-lastTime<gap)continue;
      if(values[i]<peak*.08)continue;
      JSONObject note=new JSONObject();
      note.put("t",Math.round(t*1000.0)/1000.0);
      note.put("lane",("easy".equals(difficulty)?1+lane%2:lane%4));
      notes.put(note);
      lastTime=t;lane++;
      if(notes.length()>=maxNotes)break;
    }
    if(notes.length()<5)throw new IOException("有効なビートを十分検出できませんでした");
    // Long notes require measured sustained energy after the onset, plus
    // enough space before the next detected attack. Never synthesize a hold
    // from BPM alone or from the UI's rendering speed.
    for(int k=0;k<notes.length();k++){
      JSONObject note=notes.getJSONObject(k);
      double t=note.getDouble("t");
      double next=k+1<notes.length()?notes.getJSONObject(k+1).getDouble("t"):n*hop;
      double gap=next-t;
      if(gap<.78)continue;
      double attack=meanEnergy(values,hop,t+.04,t+.16);
      double sustain=meanEnergy(values,hop,t+.37,t+.56);
      if(attack>.018&&sustain>Math.max(.018,attack*.26)){
        note.put("hold",Math.round(Math.min(1.2,gap-.22)*100.0)/100.0);
      }
    }
    JSONObject chart=new JSONObject();
    chart.put("version",1);
    chart.put("duration",Math.round(n*hop*1000.0)/1000.0);
    chart.put("level",difficulty);
    chart.put("source","android-native-waveform-onsets");
    chart.put("notes",notes);
    return chart;
  }
}
