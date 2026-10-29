(()=>{'use strict';
const $=id=>document.getElementById(id),core=window.SaikoStudioCore;
if(!core){$('setupStatus').textContent='譜面エンジンを読み込めませんでした。再読み込みしてください。';return}
const audio=$('audio'),canvas=$('timeline'),ctx=canvas.getContext('2d');
const COLORS=['#ff9acb','#ffe194','#8bf1eb','#c5a9ff'];
const SAVE_KEY='saiko-beat-studio-chart-v1';
let chart=null,audioUrl=null,audioFile=null,mode='edit',editPage=0,lastChart=null,peaks=[],progressTimer=0;
let run=null;
function status(message){$('setupStatus').textContent=message}
function fmt(t){const s=Math.max(0,Math.floor(t||0));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function formatNumber(n){return Math.round(n).toLocaleString('ja-JP')}
function rightConfirmed(){if(!$('rights').checked){status('⚠️ 音源の利用権限を確認して、チェックを入れてください。');$('rights').focus();return false}return true}
function ensureAudio(){if(!audioFile||!audioUrl||!Number.isFinite(audio.duration)){status('⚠️ 先に音源ファイルを選んでください。');return false}return true}
function validateMeta(){
 const bpm=Number($('bpm').value),offset=Number($('offset').value),duration=Number(audio.duration);
 return core.normalizeChart({version:1,title:$('chartTitle').value||'MY RHYTHM',bpm,offset,duration,level:$('level').value,notes:[]});
}
function syncMeta(){if(!chart)return;const meta={...chart,title:$('chartTitle').value||chart.title,bpm:Number($('bpm').value),offset:Number($('offset').value),level:$('level').value};try{chart=core.normalizeChart(meta)}catch(e){status('⚠️ '+e.message)}}
function audioDispose(){if(run)endTest(false);audio.pause();audio.removeAttribute('src');audio.load();if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=null;audioFile=null;peaks=[]}
$('audioFile').addEventListener('change',()=>{
 const file=$('audioFile').files?.[0];if(!file)return;
 audioDispose();$('editor').hidden=true;chart=null;lastChart=null;
 if(file.size>50*1024*1024){status('⚠️ 50MBを超える音源は使えません。短いファイルで試してね。');return}
 const type=(file.type||'').toLowerCase();
 if(!type.startsWith('audio/')&&!/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name)){status('⚠️ 音声ファイルを選んでください。');return}
 audioFile=file;audioUrl=URL.createObjectURL(file);audio.src=audioUrl;
 $('chartTitle').value=file.name.replace(/\.[^.]+$/,'').slice(0,80);
 status('🎵 ファイルを読み込み中…');
 audio.onloadedmetadata=()=>{
  if(!Number.isFinite(audio.duration)||audio.duration<5||audio.duration>600){
   status('⚠️ 5秒〜10分以内の音源を選んでね。');audioDispose();return
  }
  status('✅ '+file.name+'　長さ '+fmt(audio.duration)+'。BPMを合わせて「自動で譜面の下書き」を押そう！');
 };
 audio.onerror=()=>{status('⚠️ このファイルを再生できません。MP3やWAVで試してください。');audioDispose()};
});
async function analyzeFile(){
 const file=audioFile;if(!file||file.size>14*1024*1024)return [];
 let ac;
 try{
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return [];
  ac=new AC();const buf=await file.arrayBuffer();
  const decoded=await ac.decodeAudioData(buf);
  if(file!==audioFile)return [];
  return core.detectPeaks(decoded.getChannelData(0),decoded.sampleRate,600);
 }catch(e){return []}
 finally{if(ac)try{await ac.close()}catch(e){}}
}
$('generate').onclick=async()=>{
 if(!rightConfirmed()||!ensureAudio())return;
 let meta;try{meta=validateMeta()}catch(e){status('⚠️ '+e.message);return}
 $('generate').disabled=true;status('✨ 音の強弱を見ながら譜面の下書きを生成しています…');
 try{
  peaks=await analyzeFile();
  if(!audioFile){status('音源を選び直してください');return}
  chart=core.makeChart({...meta,peaks});lastChart=null;editPage=0;
  switchMode('edit');$('editor').hidden=false;audio.pause();audio.currentTime=0;
  status('✅ '+chart.notes.length+'個の音符を配置！ '+(peaks.length?'音の強弱に合わせて配置しました。':'BPMに合わせたリズムを配置しました。')+' タップで直してね。');
  render();
  $('editor').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){status('⚠️ 生成できませんでした。'+(e.message||'音源を確認してください。'))}
 finally{$('generate').disabled=false}
};
function setChart(next){if(!next)return;lastChart=chart;chart=core.normalizeChart(next);$('noteCount').textContent='音符 '+chart.notes.length+' 個';$('result').hidden=true;render()}
function switchMode(next){
 if(run)endTest(false);
 mode=next;const play=next==='play';
 $('editMode').classList.toggle('active',!play);$('playMode').classList.toggle('active',play);
 $('timelineHelp').textContent=play?'🎮 音符が縦の判定ラインに重なったら、D/F/J/Kまたは下の4ボタンを押そう！':'✏️ レーンをタップして音符を追加・削除。左から右へ時間が進むよ（8秒ずつ表示）。';
 $('judge').textContent=play?'ゲーム開始前':'編集中';
 $('result').hidden=true;render();
}
$('editMode').onclick=()=>switchMode('edit');
$('playMode').onclick=()=>switchMode('play');
$('prevPage').onclick=()=>{if(!chart)return;editPage=Math.max(0,editPage-8);if(audioUrl)audio.currentTime=editPage;render()};
$('nextPage').onclick=()=>{if(!chart)return;editPage=Math.min(Math.max(0,chart.duration-8),editPage+8);if(audioUrl)audio.currentTime=editPage;render()};
function render(){
 if(!chart||!ctx||$('editor').hidden)return;
 const rect=canvas.getBoundingClientRect(),w=Math.max(320,rect.width||860),h=Math.max(220,rect.height||320);
 const dpr=Math.min(2,window.devicePixelRatio||1),cw=Math.round(w*dpr),ch=Math.round(h*dpr);
 if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const playTime=audioUrl&&Number.isFinite(audio.currentTime)?audio.currentTime:editPage;
 const page=mode==='play'?Math.max(0,Math.min(chart.duration-8,Math.floor(playTime/8)*8)):editPage;
 const laneHeight=h/4;
 for(let lane=0;lane<4;lane++){
  ctx.fillStyle=lane%2?'#222251':'#1b1945';ctx.fillRect(0,lane*laneHeight,w,laneHeight);
  ctx.fillStyle=COLORS[lane];ctx.fillRect(0,lane*laneHeight,6,laneHeight);
  ctx.font='bold 18px system-ui';ctx.fillText(['D','F','J','K'][lane],11,lane*laneHeight+25);
  ctx.strokeStyle='#a0a6e14c';ctx.lineWidth=2;ctx.strokeRect(0,lane*laneHeight,w,laneHeight);
 }
 const beat=60/chart.bpm;
 for(let b=Math.ceil((page-chart.offset)/beat);chart.offset+b*beat<page+8;b++){
  const t=chart.offset+b*beat;if(t<page)continue;
  const x=(t-page)/8*w;
  ctx.strokeStyle=b%4===0?'#f1d48e99':'#b7c0df3b';ctx.lineWidth=b%4===0?2:1;
  ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();
 }
 const done=run?.done||new Set();
 for(let i=0;i<chart.notes.length;i++){
  const n=chart.notes[i];if(n.t<page-.2||n.t>page+8.2)continue;
  const x=(n.t-page)/8*w,y=n.lane*laneHeight+laneHeight/2,hit=done.has(i);
  ctx.fillStyle=hit?'#555d68':COLORS[n.lane];
  ctx.shadowColor=COLORS[n.lane];ctx.shadowBlur=hit?0:12;
  ctx.beginPath();ctx.roundRect(x-7,y-22,14,44,6);ctx.fill();ctx.shadowBlur=0;
 }
 const marker=(playTime-page)/8*w;
 ctx.strokeStyle='#fffbba';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(marker,0);ctx.lineTo(marker,h);ctx.stroke();
 ctx.fillStyle='#fffbba';ctx.font='bold 15px system-ui';ctx.fillText(fmt(page),30,20);ctx.fillText(fmt(Math.min(chart.duration,page+8)),Math.max(30,w-72),20);
 $('time').textContent=fmt(playTime)+' / '+fmt(chart.duration);
 $('noteCount').textContent='音符 '+chart.notes.length+' 個　｜　8秒表示（'+fmt(page)+'〜'+fmt(Math.min(chart.duration,page+8))+'）';
}
canvas.addEventListener('pointerdown',e=>{
 if(!chart||mode!=='edit'||run)return;
 const rect=canvas.getBoundingClientRect();
 const px=(e.clientX-rect.left)/rect.width,py=(e.clientY-rect.top)/rect.height;
 if(px<0||px>1||py<0||py>1)return;
 const lane=Math.min(3,Math.floor(py*4));
 const t=core.nearestGrid(editPage+px*8,chart.bpm,chart.offset,2);
 const nearby=chart.notes.some(x=>x.lane===lane&&Math.abs(x.t-t)<.11);
 setChart(nearby?core.removeNote(chart,t,lane,.11):core.insertNote(chart,t,lane));
});
$('undo').onclick=()=>{if(!lastChart)return;const temp=chart;chart=lastChart;lastChart=temp;render()};
function tapLane(lane){
 if(!chart)return;
 if(mode==='play'&&run){judgeLane(lane);return}
 if(mode==='edit'){
  const time=audioUrl?audio.currentTime:editPage+1;
  const t=core.nearestGrid(time,chart.bpm,chart.offset,2);
  setChart(core.insertNote(chart,t,lane));
 }
}
for(const button of document.querySelectorAll('[data-lane]')){
 button.addEventListener('pointerdown',e=>{e.preventDefault();tapLane(Number(button.dataset.lane))});
}
document.addEventListener('keydown',e=>{
 if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName))return;
 if(e.key==='Escape'&&run){endTest(false);return}
 if(!chart)return;
 const lane=['d','f','j','k'].indexOf(e.key.toLowerCase());
 if(lane!==-1){e.preventDefault();tapLane(lane)}
});
function download(name,text){
 const blob=new Blob([text],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('export').onclick=()=>{
 if(!chart)return;
 syncMeta();try{download('saiko-beat-chart-'+Date.now()+'.json',JSON.stringify(core.normalizeChart(chart),null,2));status('💾 JSON譜面を書き出しました。音声ファイルは含まれません。')}
 catch(e){status('⚠️ 保存できませんでした。'+e.message)}
};
$('saveLocal').onclick=()=>{
 if(!chart)return;
 try{
  syncMeta();
  localStorage.setItem(SAVE_KEY,JSON.stringify(core.normalizeChart(chart)));
  status('📌 譜面をこのブラウザに一時保存しました。音源ファイルは保存されません。');
 }catch(e){status('⚠️ ブラウザに保存できませんでした。JSON書き出しをお試しください。')}
};
function loadChart(raw){
 const validated=core.normalizeChart(raw);
 if(audioUrl&&Math.abs(audio.duration-validated.duration)>2)throw Error('選択中の音源と譜面の長さが違います。正しい音源を選び直してください。');
 chart=validated;lastChart=null;editPage=0;
 $('chartTitle').value=chart.title;$('bpm').value=chart.bpm;$('offset').value=chart.offset;$('level').value=chart.level;
 switchMode('edit');$('editor').hidden=false;render();status('✅ '+chart.title+' を読み込みました。音源は別途選択してください。');
}
$('restore').onclick=()=>{
 try{
  const saved=localStorage.getItem(SAVE_KEY);
  if(!saved){status('保存された譜面はまだありません。');return}
  loadChart(JSON.parse(saved));
 }catch(e){status('⚠️ '+e.message)}
};
$('importFile').addEventListener('change',async()=>{
 const file=$('importFile').files?.[0];if(!file)return;
 if(file.size>300000){status('⚠️ 大きすぎるJSONファイルは読み込めません。');return}
 try{loadChart(JSON.parse(await file.text()))}catch(e){status('⚠️ '+e.message)}
 finally{$('importFile').value=''}
});
for(const id of ['chartTitle','bpm','offset','level'])$(id).addEventListener('change',()=>{
 if(!chart||run)return;
 syncMeta();render();
});
function resetScores(){
 run={done:new Set(),score:0,combo:0,maxCombo:0,perfect:0,great:0,good:0,miss:0};
 $('score').textContent='0';$('combo').textContent='0';$('perfect').textContent='0';$('miss').textContent='0';$('judge').textContent='READY';
 $('result').hidden=true;
}
function applyMisses(){
 if(!run||!chart)return;
 const t=audio.currentTime;
 for(let i=0;i<chart.notes.length;i++){
  const n=chart.notes[i];if(n.t>t-.19)break;
  if(run.done.has(i))continue;
  run.done.add(i);run.miss++;run.combo=0;
 }
 $('miss').textContent=run.miss;
}
function judgeLane(lane){
 if(!run||!chart||audio.paused)return;
 const time=audio.currentTime-Number($('latency').value)/1000;
 const found=core.judge(chart.notes,time,lane,run.done);
 if(!found){$('judge').textContent='もう少しタイミングを合わせよう！';return}
 run.done.add(found.index);
 run[found.grade.toLowerCase()]++;run.combo++;run.maxCombo=Math.max(run.maxCombo,run.combo);
 run.score+=found.grade==='PERFECT'?1000:found.grade==='GREAT'?750:420;
 $('score').textContent=formatNumber(run.score);$('combo').textContent=run.combo;$('perfect').textContent=run.perfect;
 $('judge').textContent=found.grade==='PERFECT'?'🌟 PERFECT!':found.grade==='GREAT'?'✨ GREAT!':'👍 GOOD!';
}
function endTest(complete){
 if(!run)return;
 const final=run;run=null;
 if(progressTimer)clearInterval(progressTimer);progressTimer=0;
 audio.pause();audio.controls=true;
 if(complete){
  const judged=final.perfect+final.great+final.good+final.miss;
  const accuracy=judged?Math.round((final.perfect+final.great*.75+final.good*.4)/judged*100):0;
  const rank=accuracy>=95?'S':accuracy>=85?'A':accuracy>=70?'B':accuracy>=50?'C':'D';
  $('result').hidden=false;
  $('result').replaceChildren();
  const title=document.createElement('strong');title.textContent='🏆 RANK '+rank;
  const detail=document.createElement('div');detail.textContent='スコア '+formatNumber(final.score)+'｜最大コンボ '+final.maxCombo+'｜精度 '+accuracy+'%';
  $('result').append(title,detail);
  $('progress').textContent='🎉 テストプレイ完了！';
 }else $('progress').textContent='編集画面に戻りました';
 mode='edit';$('editMode').classList.add('active');$('playMode').classList.remove('active');
 render();
}
async function startTest(){
 if(!rightConfirmed()||!ensureAudio()||!chart)return;
 if(!chart.notes.length){status('⚠️ 音符がありません。譜面を作ってください。');return}
 if(run)endTest(false);
 syncMeta();audio.pause();audio.currentTime=0;editPage=0;resetScores();
 mode='play';$('editMode').classList.remove('active');$('playMode').classList.add('active');audio.controls=false;
 $('progress').textContent='🎮 D / F / J / K で音符を叩こう！';
 $('timelineHelp').textContent='🎮 音符が縦の判定ラインに重なったら対応するキー／ボタンでタップ！ ESCで終了。';
 try{
  await audio.play();
  if(!run)return;
  progressTimer=setInterval(()=>{
   if(!run)return;
   if(audio.ended){applyMisses();endTest(true);return}
   if(!audio.paused)applyMisses();
   render();
  },42);
 }catch(e){endTest(false);status('⚠️ 音楽を再生できません。ブラウザの再生許可を確認してください。')}
}
$('startTest').onclick=startTest;
audio.addEventListener('ended',()=>{if(run){applyMisses();endTest(true)}});
audio.addEventListener('pause',()=>{if(run&&!audio.ended){$('judge').textContent='⏸ 一時停止';$('progress').textContent='ESCまたは編集ボタンで終了'}});
$('playMode').onclick=()=>{if(!chart)return;switchMode('play');startTest()};
$('editMode').onclick=()=>{if(run)endTest(false);switchMode('edit')};
window.addEventListener('pagehide',()=>{audio.pause();if(progressTimer)clearInterval(progressTimer);if(audioUrl)URL.revokeObjectURL(audioUrl)});
window.SaikoBeatStudio=Object.freeze({getChart:()=>chart,getMode:()=>mode});
})();
