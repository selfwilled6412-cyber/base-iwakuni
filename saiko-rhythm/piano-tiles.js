/* SAIKO BEAT PIANO RUSH – audio is the master clock, not an IFrame.
 * The demo synthesizes an ORIGINAL melody in memory, extracts transients from
 * the actual samples, and uses that SAME AudioBuffer for audible playback. */
(()=>{'use strict';
const $=id=>document.getElementById(id), core=window.SaikoPianoCore, analyzer=window.SaikoBeatAnalyzer;
if(!core||!analyzer){$('status').textContent='音声解析エンジンを読み込めませんでした';return}
let level='easy',playing=false,paused=false,game=null,track=null,source=null,ctx=null,audioBuffer=null;
let startClock=0,offset=0,raf=0,chartDuration=0,sourceMode='demo',nativePending=false,lastRender=0;
let timingMs=0;
try{timingMs=Math.max(-200,Math.min(200,Number(localStorage.getItem('saiko-piano-timing-ms')||0)||0))}catch(e){}
$('timingAdjust').value=String(timingMs);$('timingValue').textContent=(timingMs>0?'+':'')+timingMs+' ms';
$('timingAdjust').addEventListener('input',event=>{
 timingMs=Number(event.target.value)||0;
 $('timingValue').textContent=(timingMs>0?'+':'')+timingMs+' ms';
 try{localStorage.setItem('saiko-piano-timing-ms',String(timingMs))}catch(e){}
});
const canvas=$('tilesCanvas'),stage=$('stage'),g=canvas.getContext('2d',{alpha:false});
const native=!!window.SaikoNativeAutoChart;
$('youtubeMode').hidden=!native;
const colors=['#f6a5ff','#64f0ee','#fbe795','#95bbff'];
const now=()=>sourceMode==='native'?(native?Number(window.SaikoNativeAutoChart.currentSeconds())||0:0):
  playing&&ctx?Math.max(0,(paused?offset:ctx.currentTime-startClock+offset)):offset;
function status(message){$('status').textContent=message}
function updateStats(){
 if(!game)return;
 const s=game.state();
 $('score').textContent=s.score.toLocaleString('ja-JP');
 $('combo').textContent=s.combo;
 $('perfect').textContent=s.perfect;
}
function resize(){
 const r=stage.getBoundingClientRect(),scale=Math.min(2,window.devicePixelRatio||1);
 const width=Math.max(1,Math.round(r.width*scale)),height=Math.max(1,Math.round(r.height*scale));
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
}
function rounded(x,y,w,h,r,fill,stroke){
 if(y>canvas.height+100||y+h< -100)return;
 g.beginPath();g.roundRect(x,y,w,h,Math.min(r,w/3,h/3));g.fillStyle=fill;g.fill();
 if(stroke){g.lineWidth=2*gScale();g.strokeStyle=stroke;g.stroke();}
}
function gScale(){return Math.max(1,canvas.width/Math.max(1,stage.clientWidth))}
function render(time){
 if(!game)return;
 resize();
 const w=canvas.width,h=canvas.height,s=w/4,target=h*.81,tileHeight=Math.max(42,h*.135),lead=1.9;
 const grad=g.createLinearGradient(0,0,0,h);
 grad.addColorStop(0,'#14133f');grad.addColorStop(.55,'#23166c');grad.addColorStop(1,'#07142e');
 g.fillStyle=grad;g.fillRect(0,0,w,h);
 // Slow-moving aurora bands; original, not imported game artwork.
 for(let i=0;i<14;i++){
  const x=((i*91+Math.sin(time*.3+i)*18)%1000)/1000*w;
  const y=((i*57+time*26)%650)/650*h;
  g.fillStyle=i%2===0?'#ffffff17':'#5fffd014';
  g.beginPath();g.arc(x,y,Math.max(2,w*.008),0,Math.PI*2);g.fill();
 }
 for(let lane=0;lane<4;lane++){
  g.fillStyle=lane%2?'#ffffff09':'#03071c28';g.fillRect(lane*s,0,s,h);
  if(lane){g.fillStyle='#b4c8fc55';g.fillRect(lane*s-1.1,0,2.2,h)}
 }
 const noteList=game.state().notes;
 for(const n of noteList){
  if(n.judged)continue;
  const y=target-(n.t-time)/lead*(target+tileHeight*.3)-tileHeight*.5;
  const tailY=n.hold>0?target-(n.t+n.hold-time)/lead*(target+tileHeight*.3)-tileHeight*.5:y;
  if((y>h+80&&tailY>h+80)||(y< -tileHeight-80&&tailY< -tileHeight-80))continue;
  const x=n.lane*s+5*gScale(),ww=s-10*gScale();
  if(n.hold>0){
   const bottom=n.holding?target+tileHeight*.5:y+tileHeight;
   const top=Math.max(-tileHeight,tailY);
   if(bottom>top){
    const body=g.createLinearGradient(x,top,x+ww,top);
    body.addColorStop(0,'#6352d0');body.addColorStop(.5,colors[n.lane]);body.addColorStop(1,'#3a2877');
    rounded(x+7*gScale(),top,ww-14*gScale(),bottom-top,8*gScale(),body,colors[n.lane]);
   }
  }
  const headY=n.holding?target-tileHeight*.5:y;
  g.shadowBlur=16*gScale();g.shadowColor=colors[n.lane];
  rounded(x,headY,ww,tileHeight,13*gScale(),'#050716',colors[n.lane]);g.shadowBlur=0;
  rounded(x+5*gScale(),headY+5*gScale(),ww-10*gScale(),Math.max(9,tileHeight*.12),4*gScale(),colors[n.lane]);
  const shine=g.createLinearGradient(x,headY,x+ww,headY);
  shine.addColorStop(0,'#ffffff11');shine.addColorStop(.5,'#ffffff3e');shine.addColorStop(1,'#ffffff0c');
  rounded(x+6*gScale(),headY+17*gScale(),ww-12*gScale(),tileHeight*.37,8*gScale(),shine);
  g.fillStyle='#ffffffb0';g.beginPath();g.arc(x+ww*.5,headY+tileHeight*.75,Math.max(3,4*gScale()),0,Math.PI*2);g.fill();
 }
 g.shadowColor='#fff9c0';g.shadowBlur=16*gScale();g.fillStyle='#fff3c1';g.fillRect(0,target+tileHeight*.5,w,4*gScale());g.shadowBlur=0;
 // Press region ends at the same target line used by the input engine.
 g.fillStyle='#ffffff10';g.fillRect(0,target+tileHeight*.5,w,h-target);
 $('progress').style.width=Math.min(100,Math.max(0,time/chartDuration*100))+'%';
}
function animate(){
 if(!playing)return;
 const time=now();
 if(!paused){
  game.tick(time);updateStats();render(time);
  if(time>chartDuration+.45||(sourceMode==='native'&&native&&window.SaikoNativeAutoChart.isMusicFinished())){finish();return;}
 }else if(!lastRender){render(time);}
 lastRender=time;
 raf=requestAnimationFrame(animate);
}
function showHit(text){
 const el=$('hitText');el.textContent=text;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
}
function tap(lane,pointerId=null){
 if(!playing||paused||!game)return;
 const result=game.press(lane,now()+timingMs/1000,pointerId);
 if(result)showHit(result.result==='hold'?'HOLD!':result.result==='perfect'?'PERFECT!':'GOOD!');
 else showHit('KEEP GOING');
 updateStats();
}
function release(pointerId,cancel=false){
 if(!playing||paused||!game)return;
 const result=game.release(pointerId,now()+timingMs/1000,cancel);
 if(result)showHit(result.result==='miss'?'TOO SOON!':'GREAT HOLD!');
 updateStats();
}
canvas.addEventListener('pointerdown',event=>{
 event.preventDefault();
 const r=canvas.getBoundingClientRect();
 if(event.pointerId!==undefined&&canvas.setPointerCapture)try{canvas.setPointerCapture(event.pointerId)}catch(e){}
 tap(Math.max(0,Math.min(3,Math.floor((event.clientX-r.left)/r.width*4))),event.pointerId);
},{passive:false});
canvas.addEventListener('pointerup',event=>{event.preventDefault();release(event.pointerId)},{passive:false});
canvas.addEventListener('pointercancel',event=>{event.preventDefault();release(event.pointerId,true)},{passive:false});
document.addEventListener('keydown',event=>{
 const index=['d','f','j','k'].indexOf(event.key.toLowerCase());
 if(index>=0){event.preventDefault();if(!event.repeat)tap(index,'key-'+index)}
});
document.addEventListener('keyup',event=>{
 const index=['d','f','j','k'].indexOf(event.key.toLowerCase());
 if(index>=0){event.preventDefault();release('key-'+index)}
});
function stopAudio(){
 if(source){try{source.stop();source.disconnect()}catch(e){}source=null}
 if(sourceMode==='native'&&native)try{window.SaikoNativeAutoChart.pauseMusic()}catch(e){}
}
function startAudio(from=0){
 if(sourceMode==='native'){window.SaikoNativeAutoChart.playMusic();return}
 if(!ctx||!audioBuffer)throw Error('オリジナル音源がまだありません');
 source=ctx.createBufferSource();source.buffer=audioBuffer;source.connect(ctx.destination);
 startClock=ctx.currentTime;offset=from;source.start(0,from);
}
function cleanup(){
 cancelAnimationFrame(raf);playing=false;paused=false;stopAudio();game=null;
}
function begin(rawNotes,duration,title,mode,buffer){
 cleanup(); sourceMode=mode;audioBuffer=buffer||null;
 game=core.engine(rawNotes);chartDuration=Math.max(duration,rawNotes[rawNotes.length-1].t+.7);
 $('songLabel').textContent=title;
 $('menu').hidden=true;$('game').hidden=false;$('result').hidden=true;
 $('pause').textContent='⏸ 一時停止';
 $('stage').scrollIntoView({block:'nearest'});
 playing=true;paused=false;lastRender=0;
 try{startAudio(0)}catch(e){cleanup();$('game').hidden=true;$('menu').hidden=false;status('音声が再生できません: '+e.message);return}
 updateStats();raf=requestAnimationFrame(animate);
}
function finish(){
 if(!game||!playing)return;
 const completed=game.state();game.end();const s=game.state();
 cleanup();$('result').hidden=false;$('pause').disabled=true;
 $('finalScores').textContent='SCORE '+s.score.toLocaleString('ja-JP')+' ／ PERFECT '+s.perfect+' ／ GOOD '+s.good+' ／ MISS '+s.miss+' ／ 最大COMBO '+s.best;
 try{
  const key='saiko-piano-best-'+level, best=Number(localStorage.getItem(key)||0);
  if(s.score>best)localStorage.setItem(key,String(s.score));
 }catch(e){}
 $('result').scrollIntoView({block:'nearest'});
}
function chooseDifficulty(value){
 level=value;document.querySelectorAll('[data-level]').forEach(button=>{
  button.setAttribute('aria-pressed',String(button.dataset.level===value));
 });
}
document.querySelectorAll('[data-level]').forEach(button=>button.addEventListener('click',()=>chooseDifficulty(button.dataset.level)));
function demoWaveform(){
 // A 34-second original little electro-piano composition – entirely local,
 // no hidden YouTube player, no downloaded audio and no prewritten beatmap.
 const sr=22050,duration=34,buffer=ctx.createBuffer(1,sr*duration,sr),wave=buffer.getChannelData(0);
 const scale=[0,2,4,7,9,12,14,16,19,21,24],melody=[0,4,7,2,5,9,7,4,2,5,7,10,9,7,4,2];
 function note(start,freq,length,volume,decayRate=5.8){
  const begin=Math.floor(start*sr),end=Math.min(wave.length,begin+Math.floor(length*sr));
  for(let i=begin;i<end;i++){
   const dt=(i-begin)/sr;
   const attack=1-Math.exp(-dt*180),decay=Math.exp(-dt*decayRate);
   wave[i]+=volume*attack*decay*(Math.sin(2*Math.PI*freq*dt)+.28*Math.sin(2*Math.PI*freq*2*dt)+.12*Math.sin(2*Math.PI*freq*3*dt));
  }
 }
 const beat=.5357;
 for(let i=0;i<112;i++){
  const t=1.3+i*beat*.5;
  if([12,13,14].includes(i%16))continue; // Intentional rests before sustained notes.
  const noteNo=melody[i%melody.length]+(Math.floor(i/16)%2?2:0);
  const hz=220*Math.pow(2,noteNo/12);
  const sustained=i%16===11;
  note(t,hz,sustained?1.05:.41,.34,sustained?1.05:5.8);
  if(i%4===0)note(t,110*Math.pow(2,(Math.floor(i/16)%4)*2/12),.70,.19);
  if(i%8===4)note(t,155,.16,.18);
 }
 // Hard limiter avoids browser distortion and preserves transient emphasis.
 let peak=0;for(let i=0;i<wave.length;i++)peak=Math.max(peak,Math.abs(wave[i]));
 const mul=peak>.82?.82/peak:1;
 for(let i=0;i<wave.length;i++)wave[i]*=mul;
 return buffer;
}
async function startDemo(){
 if(nativePending)return;
 $('demo').disabled=true;status('🎼 オリジナル音楽の波形を解析中…');
 try{
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)throw Error('このブラウザは音声に対応していません');
  if(!ctx)ctx=new AC();if(ctx.state==='suspended')await ctx.resume();
  const buffer=demoWaveform();
  const times=analyzer.extractOnsets(buffer,{level});
  const notes=core.addHoldsFromWaveform(buffer,core.chartFromOnsets(times,level));
  if(notes.length<8)throw Error('この音源の解析結果が少なすぎます');
  status('✅ 音声から'+notes.length+'個のタイルを検出');
  begin(notes,buffer.duration,'♫ SAIKO ORIGINAL MUSIC','demo',buffer);
 }catch(e){status('音源を解析できませんでした：'+String(e.message||e))}
 finally{$('demo').disabled=false}
}
$('demo').addEventListener('click',startDemo);
const localInput=$('localAudioFile'),localButton=$('localAudio');
function localReady(){nativePending=false;localButton.disabled=false}
localButton.addEventListener('click',()=>{
 if(nativePending){status('別の曲を解析しています');return}
 if(native){
  nativePending=true;localButton.disabled=true;
  status('📁 スマホ内の音楽ファイルを選択してね');
  try{window.SaikoNativeAutoChart.chooseLocalAudio(level)}
  catch(e){window.SaikoNativeLocalError('ファイル選択を開始できませんでした')}
 }else{
  localInput.value='';
  localInput.click();
 }
});
localInput.addEventListener('change',async()=>{
 const file=localInput.files&&localInput.files[0];
 if(!file)return;
 localButton.disabled=true;
 status('🎼 '+file.name+' の音声を解析しています…');
 try{
  if(file.size>48*1024*1024)throw Error('48MB以下の音楽ファイルを選んでね');
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)throw Error('このブラウザは音声に対応していません');
  if(!ctx)ctx=new AC();
  if(ctx.state==='suspended')await ctx.resume();
  const encoded=await file.arrayBuffer();
  const decoded=await ctx.decodeAudioData(encoded);
  const times=analyzer.extractOnsets(decoded,{level});
  const notes=core.addHoldsFromWaveform(decoded,core.chartFromOnsets(times,level));
  status('✅ 実音声から'+notes.length+'個のタイルを検出');
  begin(notes,decoded.duration,'♫ '+file.name,'demo',decoded);
 }catch(e){status('⚠️ 音楽を解析できませんでした：'+String(e.message||e))}
 finally{localButton.disabled=false;localInput.value=''}
});
window.SaikoNativeLocalCancelled=()=>{localReady();status('音楽の選択をキャンセルしました')};
window.SaikoNativeLocalError=message=>{localReady();status('⚠️ 音楽を解析できませんでした：'+String(message).slice(0,160))};
window.SaikoNativeLocalReady=json=>{
 localReady();
 try{
  const result=JSON.parse(json);
  const notes=core.prepare(result.notes);
  status('✅ 実音声から'+notes.length+'個のタイルを検出');
  begin(result.notes,Number(result.duration)||0,'♫ '+String(result.title||'選択した音楽'),'native',null);
 }catch(e){status('⚠️ 譜面を読み込めませんでした：'+String(e.message||e))}
};
function videoId(value){
 const input=String(value||'').trim();
 if(/^[A-Za-z0-9_-]{11}$/.test(input))return input;
 try{
  const url=new URL(input);
  if(!['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtu.be'].includes(url.hostname))return null;
  const id=url.hostname.includes('youtu.be')?url.pathname.split('/')[1]:
   url.searchParams.get('v')||(/^\/(?:shorts|live|embed)\/([^/?]+)/.exec(url.pathname)||[])[1];
  return /^[A-Za-z0-9_-]{11}$/.test(id||'')?id:null;
 }catch(e){return null}
}
let requestedId=null;
$('load').addEventListener('click',()=>{
 if(!native){status('YouTube音声解析はAndroid実験版専用です');return}
 const id=videoId($('videoUrl').value);
 if(!id){status('YouTubeのURLを確認してね');return}
 if(nativePending){status('前の曲を解析しています');return}
 requestedId=id;nativePending=true;$('load').disabled=true;status('🔎 動画の音声を取得しています。少し時間がかかる場合があります…');
 try{window.SaikoNativeAutoChart.analyze(id,level)}catch(e){window.SaikoNativeChartError('解析処理を開始できませんでした')}
});
window.SaikoNativeChartProgress=msg=>status('🎼 '+String(msg).slice(0,150));
window.SaikoNativeChartError=msg=>{nativePending=false;$('load').disabled=false;status('⚠️ '+String(msg).slice(0,175)+'。オリジナル曲はそのまま遊べます')};
window.SaikoNativeChartReady=json=>{
 nativePending=false;$('load').disabled=false;
 try{
  const result=JSON.parse(json);
  if(result.video_id!==requestedId)throw Error('別の動画の解析結果を受け取りました');
  const notes=core.prepare(result.notes);
  status('✅ 実音声から'+notes.length+'個のタイルを作成');
  begin(result.notes,Number(result.duration)||0,'♫ YouTube音声解析（試作）','native',null);
 }catch(e){status('⚠️ 音ゲー用データを読み込めませんでした：'+String(e.message||e))}
};
$('quit').addEventListener('click',()=>{
 cleanup();$('menu').hidden=false;$('game').hidden=true;$('pause').disabled=false;
 status('曲を選んで遊ぼう！');
});
$('pause').addEventListener('click',async()=>{
 if(!playing)return;
 if(!paused){
  if(sourceMode==='demo'){offset=now();if(source){source.stop();source=null}}
  else if(native)window.SaikoNativeAutoChart.pauseMusic();
  paused=true;$('pause').textContent='▶ 再開';
 }else{
  if(sourceMode==='demo'){if(ctx.state==='suspended')await ctx.resume();startAudio(offset)}
  else if(native)window.SaikoNativeAutoChart.playMusic();
  paused=false;$('pause').textContent='⏸ 一時停止';
 }
});
$('again').addEventListener('click',()=>{
 $('result').hidden=true;$('game').hidden=true;$('menu').hidden=false;$('pause').disabled=false;
});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden&&playing&&!paused)$('pause').click();
});
window.addEventListener('pagehide',()=>{cleanup();if(ctx)ctx.close().catch(()=>{})});
window.SaikoPianoGame=Object.freeze({videoId,chooseDifficulty,getState:()=>game?.state()||null});
})();