(()=>{'use strict';
const $=id=>document.getElementById(id);
const SONGS=[
 {title:'STARLIGHT DRIVE',subtitle:'光の夜を駆けるシンセポップ',bpm:116,root:48,mode:'major',drum:0},
 {title:'COLOR JUMP',subtitle:'弾むファンキーポップ',bpm:132,root:50,mode:'major',drum:1},
 {title:'NEON BREAKER',subtitle:'未来型エレクトロ',bpm:152,root:45,mode:'minor',drum:2}
];
const LANES=['#ff6ca8','#ffdc79','#54f5e8','#b091ff'];
const KEY_SOLO=['d','f','j','k'],KEY_DUEL=['a','s','k','l'];
const STORAGE='saiko-beat-rush-v1',PERFECT=.058,GREAT=.115,GOOD=.185,BEATS=80;
let settings={mode:'solo',level:'easy',track:0,volume:65,offset:0,lowFx:false},best={};
try{
 const old=JSON.parse(localStorage.getItem(STORAGE)||'{}');
 if(old&&typeof old==='object'&&old.best&&typeof old.best==='object')best=old.best;
 if(old?.settings&&typeof old.settings==='object'){
  if(['easy','normal','hard'].includes(old.settings.level))settings.level=old.settings.level;
  if([0,1,2].includes(old.settings.track))settings.track=old.settings.track;
  if(Number.isInteger(old.settings.volume)&&old.settings.volume>=0&&old.settings.volume<=100)settings.volume=old.settings.volume;
  if([-100,-50,0,50,100].includes(old.settings.offset))settings.offset=old.settings.offset;
  settings.lowFx=old.settings.lowFx===true;
 }
}catch(e){}
let sound=null,game=null,raf=0,pumpTimer=0,session=0;
let currentSection='home';
function save(){
 try{localStorage.setItem(STORAGE,JSON.stringify({settings:{level:settings.level,track:settings.track,volume:settings.volume,offset:settings.offset,lowFx:settings.lowFx},best}))}catch(e){}
}
function rand(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}}
function createChart(songIndex,level='easy',mode='solo'){
 const song=SONGS[songIndex];if(!song)throw Error('Unknown song');
 if(!['easy','normal','hard'].includes(level)||!['solo','duel'].includes(mode))throw Error('Unsupported mode');
 const rng=rand(17023+songIndex*197+['easy','normal','hard'].indexOf(level)*101+(mode==='duel'?893:0));
 const beatSec=60/song.bpm,notes=[];
 if(mode==='duel'){
  for(let b=4;b<BEATS-2;b++){
   const add=b%2===0||rng()<.65;
   if(add){
    const a=rng()<.5?0:1,flip=b%4===0?1:0;
    notes.push({t:b*beatSec,lane:a,player:0,judge:'pending'});
    notes.push({t:b*beatSec,lane:2+(a^flip),player:1,judge:'pending'});
   }
   if(level==='hard'&&(b%4===2||rng()<.18)){
    const t=(b+.5)*beatSec;
    notes.push({t,lane:rng()<.5?0:1,player:0,judge:'pending'});
    notes.push({t,lane:2+(rng()<.5?0:1),player:1,judge:'pending'});
   }
  }
 }else{
  const density=level==='easy'?.64:level==='normal'?.9:1;
  const prior=Array(4).fill(-100);
  for(let b=4;b<BEATS-2;b++){
   const count=rng()<density?1:0;
   if(count){
    const lanes=level==='easy'?[1,2]:[0,1,2,3],lane=lanes[Math.floor(rng()*lanes.length)],t=b*beatSec;
    if(t-prior[lane]>.20){notes.push({t,lane,player:0,judge:'pending'});prior[lane]=t;}
   }
   if(level==='normal'&&b%4===2||level==='hard'&&(rng()<.73)){
    const lane=Math.floor(rng()*4),t=(b+.5)*beatSec;
    if(t-prior[lane]>.19){notes.push({t,lane,player:0,judge:'pending'});prior[lane]=t;}
   }
  }
 }
 return notes.sort((a,b)=>a.t-b.t||a.lane-b.lane);
}
function createMusicEvents(songIndex){
 const song=SONGS[songIndex],unit=60/song.bpm,events=[];
 // Original deterministic riff/progression (no commercial music samples).
 const progress= song.mode==='minor'?[0,5,3,7]:[0,7,5,9];
 const scale=song.mode==='minor'?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11];
 const riff=[0,2,4,2,5,4,3,1,0,4,5,2,6,4,2,1];
 for(let half=0;half<BEATS*2;half++){
  const beat=half/2,whole=half%2===0,bar=Math.floor(beat/4),pos=Math.floor(beat)%4,root=song.root+progress[bar%4];
  const t=beat*unit;
  if(whole&&pos===0||whole&&pos===2||whole&&pos===3&&song.drum===2)events.push({t,type:'kick'});
  if(whole&&(pos===1||pos===3))events.push({t,type:'snare'});
  events.push({t,type:'hat',strong:whole,accent:(bar%4===3&&half%8===7)});
  if(whole||song.drum>0&&pos===2&&half%2===1){
   const bassStep=(pos===2&&song.drum>0)?7:0;
   events.push({t,type:'bass',midi:root-12+bassStep});
  }
  if(half%2===0&&(pos===0||pos===2)&&bar%4===0){
   events.push({t,type:'chord',midi:root+12});
  }
  const density=song.drum===2?2:song.drum===1?2:3;
  if(half%density===0&&beat>3){
   const step=riff[(half+bar*3)%riff.length],interval=scale[step];
   events.push({t,type:'lead',midi:root+12+interval});
  }
 }
 return events.sort((a,b)=>a.t-b.t);
}
const midiFreq=n=>440*Math.pow(2,(n-69)/12);
function buildAudio(){
 const AC=window.AudioContext||window.webkitAudioContext;
 if(!AC)throw Error('このブラウザは音声合成に対応していません。最新版のChrome/Safariでお試しください。');
 const ctx=new AC(),master=ctx.createGain(),limiter=ctx.createDynamicsCompressor();
 master.gain.value=settings.volume/100*.6;
 limiter.threshold.value=-16;limiter.knee.value=19;limiter.ratio.value=5;
 master.connect(limiter);limiter.connect(ctx.destination);
 const noise=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.25),ctx.sampleRate),data=noise.getChannelData(0);
 const rn=rand(70041);for(let i=0;i<data.length;i++)data[i]=rn()*2-1;
 return {ctx,master,noise,origin:0,events:[],cursor:0};
}
function osc(freq,at,duration,amp,wave='sine',pitchEnd=null){
 if(!sound||!Number.isFinite(freq)||freq<=0)return;
 const {ctx,master}=sound;const t=Math.max(ctx.currentTime,at),o=ctx.createOscillator(),g=ctx.createGain();
 o.type=wave;o.frequency.setValueAtTime(freq,t);
 if(pitchEnd)o.frequency.exponentialRampToValueAtTime(Math.max(35,pitchEnd),t+duration);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0001,amp),t+.009);
 g.gain.exponentialRampToValueAtTime(.0001,t+duration);
 o.connect(g);g.connect(master);o.start(t);o.stop(t+duration+.012);
}
function noise(at,duration,amp,highpass=0){
 if(!sound)return;
 const {ctx,master}=sound,t=Math.max(ctx.currentTime,at),src=ctx.createBufferSource(),g=ctx.createGain();
 src.buffer=sound.noise;
 if(highpass){
  const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=highpass;src.connect(f);f.connect(g);
 }else src.connect(g);
 g.connect(master);g.gain.setValueAtTime(Math.max(.0001,amp),t);
 g.gain.exponentialRampToValueAtTime(.0001,t+duration);
 src.start(t);src.stop(t+duration+.01);
}
function schedule(ev,at){
 switch(ev.type){
 case 'kick':osc(140,at,.26,.50,'sine',42);break;
 case 'snare':noise(at,.15,.12,850);osc(155,at,.095,.09,'triangle',78);break;
 case 'hat':noise(at,ev.strong?.055:.035,ev.strong?.047:.025,5400);break;
 case 'bass':osc(midiFreq(ev.midi),at,.21,.16,'triangle');break;
 case 'lead':osc(midiFreq(ev.midi),at,.22,.105,settings.track===2?'sawtooth':'square');break;
 case 'chord':osc(midiFreq(ev.midi),at,.58,.045,'sine');osc(midiFreq(ev.midi+7),at,.58,.03,'triangle');break;
 }
}
function hitSound(lane,kind='good'){
 if(!sound)return;
 const t=sound.ctx.currentTime,tones=[523,659,784,988];
 osc(tones[lane],t,kind==='perfect'?.16:.09,kind==='perfect'?.12:.075,'sine');
}
function stopAudio(){
 if(pumpTimer)clearInterval(pumpTimer);pumpTimer=0;
 if(sound){
  const prev=sound;sound=null;
  try{prev.master.gain.setTargetAtTime(.0001,prev.ctx.currentTime,.06)}catch(e){}
  try{prev.ctx.close().catch(()=>{})}catch(e){}
 }
}
function pump(){
 if(!game||game.paused||!sound)return;
 const {ctx,origin,events}=sound;
 while(sound.cursor<events.length&&events[sound.cursor].t+origin<ctx.currentTime+.18){
  const ev=events[sound.cursor++],at=origin+ev.t;
  if(at>=ctx.currentTime-.04)schedule(ev,Math.max(ctx.currentTime+.006,at));
 }
}
function clock(){return sound?sound.ctx.currentTime-sound.origin:0}
function createStats(){return {score:0,combo:0,maxCombo:0,perfect:0,great:0,good:0,miss:0}}
function choose(group,key,value){
 for(const b of $(group).querySelectorAll('button')){
  const selected=b.dataset[key]===String(value);b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));
 }
}
function renderSettings(){
 choose('modeChoices','mode',settings.mode);choose('levelChoices','level',settings.level);choose('musicChoices','track',settings.track);
 $('volume').value=settings.volume;$('volumeValue').textContent=settings.volume+'%';$('offset').value=settings.offset;$('lowFx').checked=settings.lowFx;
}
function section(name){
 currentSection=name;for(const n of ['home','play','result'])$(n).hidden=n!==name;
 if(name==='home')renderSettings();
}
function showError(t){alert(t);}
function setAudioVolume(v){if(sound)sound.master.gain.setTargetAtTime(v/100*.6,sound.ctx.currentTime,.04)}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{settings.mode=b.dataset.mode;renderSettings();save()});
document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{settings.level=b.dataset.level;renderSettings();save()});
document.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>{settings.track=Number(b.dataset.track);renderSettings();save()});
$('volume').oninput=()=>{settings.volume=Number($('volume').value);$('volumeValue').textContent=settings.volume+'%';setAudioVolume(settings.volume);save()};
$('offset').onchange=()=>{settings.offset=Number($('offset').value);save()};
$('lowFx').onchange=()=>{settings.lowFx=$('lowFx').checked;save()};
renderSettings();
function canvas(){
 const cvs=$('gameCanvas'),rect=cvs.getBoundingClientRect(),w=Math.max(320,rect.width||850),h=Math.max(320,rect.height||510);
 const dpr=Math.min(2,window.devicePixelRatio||1),pw=Math.round(w*dpr),ph=Math.round(h*dpr);
 if(cvs.width!==pw||cvs.height!==ph){cvs.width=pw;cvs.height=ph;}
 const context=cvs.getContext('2d');if(!context)return null;
 context.setTransform(dpr,0,0,dpr,0,0);return {ctx:context,w,h};
}
const ease=(a,b,t)=>a+(b-a)*t,clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
function paint(){
 if(currentSection!=='play'||!game)return;
 const c=canvas();if(!c)return;
 const {ctx,w,h}=c,g=game,t=clamp(clock(),0,g.duration+1),laneW=w/4,hitY=h*.80;
 ctx.clearRect(0,0,w,h);
 const gradient=ctx.createLinearGradient(0,0,0,h);
 gradient.addColorStop(0,'#171041');gradient.addColorStop(.55,'#161c50');gradient.addColorStop(1,'#261044');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
 if(!settings.lowFx){
  const pulse=.10+.06*Math.sin(t*60/g.beatSec*Math.PI*2);
  ctx.fillStyle='rgba(97,240,230,'+clamp(pulse,0,.2)+')';ctx.fillRect(0,0,w,7);
 }
 for(let i=0;i<4;i++){
  const x=i*laneW,alpha=g.mode==='solo'&&g.level==='easy'&&(i===0||i===3)?.24:.12;
  ctx.fillStyle=i%2?'rgba(138,108,240,.13)':'rgba(66,221,239,.12)';ctx.fillRect(x,0,laneW,h);
  ctx.strokeStyle=LANES[i];ctx.globalAlpha=.38;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+1,0);ctx.lineTo(x+1,h);ctx.stroke();ctx.globalAlpha=1;
  const light=g.lastInput[i]&&performance.now()-g.lastInput[i]<130;
  if(light){ctx.fillStyle=LANES[i];ctx.globalAlpha=settings.lowFx?.13:.25;ctx.fillRect(x,0,laneW,h);ctx.globalAlpha=1;}
  if(alpha<.2){ctx.fillStyle='rgba(8,5,26,.42)';ctx.fillRect(x,0,laneW,h);}
 }
 if(g.mode==='duel'){
  ctx.strokeStyle='#fff8d9';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();
  ctx.font='bold '+Math.round(clamp(w/34,17,30))+'px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffacd6';ctx.fillText('💗 LEFT',w*.25,32);ctx.fillStyle='#8ffcff';ctx.fillText('💠 RIGHT',w*.75,32);
 }
 const gridStep=g.beatSec,first=Math.floor((t-3)/gridStep);
 for(let b=Math.max(0,first);b<BEATS;b++){
  const bt=b*gridStep,dy=(bt-t)*g.speed;
  if(dy>hitY||dy<-h*.17)continue;
  const y=hitY-dy;ctx.strokeStyle=b%4===0?'rgba(255,238,178,.25)':'rgba(255,255,255,.09)';ctx.lineWidth=b%4===0?2:1;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
 }
 ctx.shadowColor='#7affea';ctx.shadowBlur=settings.lowFx?0:20;
 ctx.fillStyle='#fff4cf';ctx.fillRect(0,hitY-4,w,8);ctx.shadowBlur=0;
 for(const note of g.notes){
  if(note.judge!=='pending')continue;
  const y=hitY-(note.t-t)*g.speed;
  if(y< -55||y>h+50)continue;
  const x=note.lane*laneW+7,ny=y-17,nw=laneW-14;
  ctx.save();ctx.shadowColor=LANES[note.lane];ctx.shadowBlur=settings.lowFx?0:18;
  ctx.fillStyle=LANES[note.lane];ctx.beginPath();ctx.roundRect(x,ny,nw,34,9);ctx.fill();
  ctx.fillStyle='#ffffffbc';ctx.fillRect(x+6,ny+5,Math.max(4,nw-12),5);
  ctx.restore();
 }
 if(g.feedback.until>performance.now()){
  ctx.save();ctx.textAlign='center';ctx.font='1000 '+clamp(w/15,30,58)+'px system-ui';ctx.fillStyle=g.feedback.color;
  ctx.shadowColor=g.feedback.color;ctx.shadowBlur=settings.lowFx?0:18;
  ctx.fillText(g.feedback.text,w/2,hitY-85);ctx.restore();
 }
 if(t<4*g.beatSec){
  const count=Math.ceil((4*g.beatSec-t)/g.beatSec);
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='1000 '+clamp(w/5,65,135)+'px system-ui';
  ctx.fillStyle='#fff0b6';ctx.shadowColor='#f08fff';ctx.shadowBlur=settings.lowFx?0:30;
  ctx.fillText(count>0?String(count):'GO!',w/2,h*.36);ctx.restore();
 }
 const progress=clamp(t/g.duration,0,1);ctx.fillStyle='#ffffff22';ctx.fillRect(0,h-6,w,6);ctx.fillStyle='#62f8e5';ctx.fillRect(0,h-6,w*progress,6);
}
function updateHud(){
 if(!game)return;
 const g=game,time=Math.max(0,g.duration-clock());$('time').textContent=Math.floor(time/60)+':'+String(Math.ceil(time%60)).padStart(2,'0');
 if(g.mode==='solo'){
  $('score').textContent=g.players[0].score.toLocaleString('ja-JP');$('combo').textContent=g.players[0].combo;
 }else{
  $('score').textContent=g.players[0].score.toLocaleString('ja-JP');$('combo').textContent=g.players[1].score.toLocaleString('ja-JP');
  $('scoreLeft').textContent=g.players[0].score.toLocaleString('ja-JP');
  $('scoreRight').textContent=g.players[1].score.toLocaleString('ja-JP');
  $('comboLeft').textContent='COMBO '+g.players[0].combo;
  $('comboRight').textContent='COMBO '+g.players[1].combo;
 }
}
function feedback(text,color='#91ffdc'){
 if(!game)return;game.feedback={text,color,until:performance.now()+520};
}
function judgement(note,label){
 const g=game,player=g.players[note.player];
 if(label==='miss'){
  player.miss++;player.combo=0;note.judge='miss';
  feedback('MISS','#ff8f9c');return;
 }
 note.judge=label;player[label]++;player.combo++;player.maxCombo=Math.max(player.maxCombo,player.combo);
 const points={perfect:1000,great:750,good:420}[label];
 player.score+=Math.round(points*(1+Math.min(5,Math.floor(player.combo/10))*.05));
 feedback(label==='perfect'?'PERFECT!':label==='great'?'GREAT!':'GOOD!',label==='perfect'?'#ffdf78':'#b5fdeb');
 hitSound(note.lane,label);
}
function input(lane){
 if(!game||game.paused||currentSection!=='play'||!sound||!Number.isInteger(lane)||lane<0||lane>3)return;
 const g=game,now=clock()-settings.offset/1000;
 if(now<0||now>g.duration+.4)return;
 g.lastInput[lane]=performance.now();
 const pending=g.notes.filter(n=>n.lane===lane&&n.judge==='pending'&&Math.abs(n.t-now)<=GOOD)
 .sort((a,b)=>Math.abs(a.t-now)-Math.abs(b.t-now));
 if(!pending.length){return}
 const note=pending[0],delta=Math.abs(note.t-now);
 judgement(note,delta<=PERFECT?'perfect':delta<=GREAT?'great':'good');
 updateHud();
}
function update(){
 if(!game||currentSection!=='play')return;
 if(!game.paused){
  const t=clock();
  for(const note of game.notes)if(note.judge==='pending'&&t>note.t+GOOD+Math.max(0,settings.offset/1000)){
   judgement(note,'miss');
  }
  updateHud();
  if(t>=game.duration+.35){finish();return}
 }
 paint();raf=requestAnimationFrame(update);
}
async function begin(){
 if(game)return;
 const id=++session;
 try{
  sound=buildAudio();
  await sound.ctx.resume();
  if(id!==session){stopAudio();return}
  const song=SONGS[settings.track],beatSec=60/song.bpm,notes=createChart(settings.track,settings.level,settings.mode),duration=BEATS*beatSec;
  sound.origin=sound.ctx.currentTime+.20;sound.events=createMusicEvents(settings.track);sound.cursor=0;
  game={mode:settings.mode,level:settings.level,track:settings.track,beatSec,duration,
   notes,speed:Math.min(290,Math.max(170,550/2.1)),players:settings.mode==='solo'?[createStats()]:[createStats(),createStats()],
   feedback:{text:'',until:0,color:'#fff'},lastInput:[0,0,0,0],paused:false};
  $('playingTitle').textContent='🎵 '+song.title+' • '+(game.mode==='duel'?'2 PLAYER BATTLE':'SOLO');
  $('scoreLabel').textContent=game.mode==='duel'?'💗 左スコア':'SCORE';
  $('comboLabel').textContent=game.mode==='duel'?'💠 右スコア':'COMBO';
  $('battleScores').hidden=game.mode!=='duel';
  const keys=game.mode==='solo'?['D','F','J','K']:['A','S','K','L'];
  for(let lane=0;lane<4;lane++){
   $('pad'+lane).textContent=keys[lane];const p=document.querySelector('.pad[data-lane="'+lane+'"]');
   p.classList.toggle('inactive',game.mode==='solo'&&game.level==='easy'&&(lane===0||lane===3));
  }
  $('overlay').hidden=true;$('pause').textContent='⏸ 一時停止';
  section('play');updateHud();pump();pumpTimer=setInterval(pump,35);
  if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(update);
 }catch(e){
  game=null;stopAudio();section('home');showError('音楽を開始できませんでした。音量設定とブラウザをご確認ください。\n'+(e?.message||String(e)));
 }
}
function stopGame(){
 session++;if(raf)cancelAnimationFrame(raf);raf=0;stopAudio();game=null;$('overlay').hidden=true;
}
async function pauseToggle(){
 if(!game||!sound)return;
 const g=game;
 if(g.paused){
  try{await sound.ctx.resume();g.paused=false;$('overlay').hidden=true;$('pause').textContent='⏸ 一時停止';}
  catch(e){showError('音楽を再開できません。画面をタップして再度お試しください。');}
 }else{
  g.paused=true;$('pause').textContent='▶ 再開';$('overlay').hidden=false;
  $('overlayTitle').textContent='PAUSED';$('overlayText').textContent='音楽を一時停止しています。';
  $('resume').textContent='▶ 続きから再開';
  await sound.ctx.suspend().catch(()=>{});
 }
}
function endRank(p){
 const total=p.perfect+p.great+p.good+p.miss,quality=total?(p.perfect+p.great*.78+p.good*.43)/total:0;
 return quality>=.94?'S':quality>=.82?'A':quality>=.65?'B':quality>=.4?'C':'D';
}
function makeBestKey(g){return 'v1:'+g.mode+':'+g.level+':'+g.track}
function finish(){
 if(!game)return;
 const g=game,key=makeBestKey(g),players=g.players;
 let desc='',grade='A',title='🎉 曲クリア！',result='';
 if(g.mode==='solo'){
  const p=players[0],prev=Number(best[key])||0;
  if(p.score>prev){best[key]=p.score;save()}
  grade=endRank(p);
  desc='最高コンボ '+p.maxCombo+'！ '+(p.score>prev?'✨ 自己ベスト更新！':'自己ベスト '+best[key].toLocaleString('ja-JP'));
  result=[['SCORE',p.score.toLocaleString('ja-JP')],['PERFECT',p.perfect],['GREAT',p.great],['GOOD',p.good],['MISS',p.miss],['MAX COMBO',p.maxCombo]].map(([name,n])=>'<div><span>'+name+'</span><strong>'+n+'</strong></div>').join('');
 }else{
  const [a,b]=players,who=a.score===b.score?'DRAW! 🤝':a.score>b.score?'💗 左の勝ち！':'💠 右の勝ち！';
  title='⚔️ '+who;grade=a.score===b.score?'🤝':'🏆';
  desc='2人同時プレイ、おつかれさま！ 左・右それぞれのスコアはこちら。';
  result=[['💗 左のスコア',a.score.toLocaleString('ja-JP')],['💠 右のスコア',b.score.toLocaleString('ja-JP')],['💗 PERFECT',a.perfect],['💠 PERFECT',b.perfect],['💗 MAX COMBO',a.maxCombo],['💠 MAX COMBO',b.maxCombo]].map(([name,n])=>'<div><span>'+name+'</span><strong>'+n+'</strong></div>').join('');
 }
 stopGame();section('result');
 $('resultTitle').textContent=title;$('grade').textContent=grade;$('resultDesc').textContent=desc;$('resultGrid').innerHTML=result;
}
$('start').onclick=begin;$('pause').onclick=pauseToggle;$('resume').onclick=pauseToggle;
$('quit').onclick=()=>{stopGame();section('home')};
$('retry').onclick=()=>{section('home');begin()};
$('selectMusic').onclick=()=>{section('home')};
const pressVisual=(lane,down)=>{const p=document.querySelector('.pad[data-lane="'+lane+'"]');if(p)p.classList.toggle('pressed',down)};
const keyDowns=new Set();
document.addEventListener('keydown',e=>{
 if(!game||currentSection!=='play')return;
 if(e.key==='Escape'||e.key==='p'){if(!e.repeat)pauseToggle();return}
 const keys=game.mode==='duel'?KEY_DUEL:KEY_SOLO,lane=keys.indexOf(e.key.toLowerCase());
 if(lane<0)return;
 e.preventDefault();if(e.repeat||keyDowns.has(e.code))return;
 keyDowns.add(e.code);pressVisual(lane,true);input(lane);
});
document.addEventListener('keyup',e=>{
 keyDowns.delete(e.code);
 const keys=game?.mode==='duel'?KEY_DUEL:KEY_SOLO,lane=keys.indexOf(e.key.toLowerCase());
 if(lane>=0)pressVisual(lane,false);
});
for(const b of document.querySelectorAll('.pad')){
 const lane=Number(b.dataset.lane);
 b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);pressVisual(lane,true);input(lane)});
 b.addEventListener('pointerup',()=>pressVisual(lane,false));
 b.addEventListener('pointercancel',()=>pressVisual(lane,false));
 b.addEventListener('lostpointercapture',()=>pressVisual(lane,false));
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game&&!game.paused)pauseToggle()});
window.addEventListener('pagehide',()=>stopGame());
window.addEventListener('resize',()=>{if(game)paint()});
window.SaikoBeatCore=Object.freeze({createChart,createMusicEvents,sumSongNotes:(song,level,mode)=>createChart(song,level,mode).length,qualityRank:endRank,songs:SONGS});
})();