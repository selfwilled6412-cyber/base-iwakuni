(()=>{'use strict';
const $=id=>document.getElementById(id);
const ytCore=window.SaikoYouTubeCore,studio=window.SaikoStudioCore;
if(!ytCore||!studio){$('status').textContent='譜面エンジンを読み込めません。再読み込みしてください。';return}
const COLORS=['#ff87c4','#ffe393','#7ef1e8','#c1a2ff'];
const canvas=$('gameCanvas'),ctx=canvas.getContext('2d');
let player=null,videoId=null,ready=false,playing=false,apiRequested=false,apiReady=!!window.YT?.Player;
let chart=null,done=new Set(),score=0,combo=0,maxCombo=0,perfect=0,great=0,good=0,miss=0;
let awaitingPrepare=false,lastTime=null,runToken=0,frame=0,judgeMessage='',judgeUntil=0,ended=false;
function status(text){$('status').textContent=text}
function feedback(message){judgeMessage=message;judgeUntil=performance.now()+650;$('judge').textContent=message}
function getVideoTime(){
 if(!player||!ready||typeof player.getCurrentTime!=='function')return 0;
 try{const t=Number(player.getCurrentTime());return Number.isFinite(t)?Math.max(0,t):0}catch(e){return 0}
}
function getDuration(){
 if(!player||!ready||typeof player.getDuration!=='function')return 0;
 try{const n=Number(player.getDuration());return Number.isFinite(n)?n:0}catch(e){return 0}
}
function updateHud(){
 $('score').textContent=score.toLocaleString('ja-JP');$('combo').textContent=combo;
 $('perfect').textContent=perfect;$('miss').textContent=miss;
}
function resetScores(skipPast=0){
 done=new Set();score=0;combo=0;maxCombo=0;perfect=0;great=0;good=0;miss=0;ended=false;
 if(chart&&skipPast>0)for(let i=0;i<chart.notes.length;i++)if(chart.notes[i].t<skipPast-.195)done.add(i);
 $('result').hidden=true;$('result').replaceChildren();
 updateHud();
}
function releasePlayer(){
 runToken++;ready=false;playing=false;awaitingPrepare=false;lastTime=null;chart=null;
 resetScores();if(player){try{player.destroy()}catch(e){}player=null}
 $('videoContainer').innerHTML='<div id="ytPlayer"></div>';
 feedback('動画を読み込んでね！');
 if(frame){cancelAnimationFrame(frame);frame=0}
}
function createPlayer(){
 if(!videoId||!window.YT?.Player)return;
 const token=runToken;
 try{
  player=new window.YT.Player('ytPlayer',{
   width:'640',height:'360',videoId,
   playerVars:{playsinline:1},
   events:{
    onReady:()=>{
     if(token!==runToken)return;
     ready=true;
     status('✅ 動画の準備ができたよ！ 使用許諾を確認し「音ゲーを準備」。その後、動画の▶を押してね。');
     draw();
    },
    onStateChange:e=>{
     if(token!==runToken)return;
     const state=Number(e.data);
     playing=state===1;
     if(playing){
      if(awaitingPrepare)prepareChart();
      if(chart&&!ended){status('🎶 再生中！ 光るノーツが判定ラインに重なったらタップ！')}
      if(chart&&getVideoTime()>2&&lastTime===null)resetScores(getVideoTime());
      lastTime=getVideoTime();
     }else if(state===0){
      if(chart&&!ended)finish();
     }else if(state===2){status('⏸ 動画は一時停止中。再開するとノーツも動くよ。')}
     else if(state===3){status('⌛ YouTube動画の読み込み中。待機中は判定を停止するよ。')}
     if(!frame)frame=requestAnimationFrame(draw);
    },
    onError:e=>{
     if(token!==runToken)return;
     ready=false;playing=false;
     const code=Number(e.data),hint=code===100?'この動画が見つからないか、非公開です。':code===101||code===150?'動画の埋め込み再生が許可されていません。':code===5?'再生環境でエラーが発生しました。':'動画を再生できませんでした。';
     status('⚠️ '+hint+' 公式YouTubeページで確認してください。');
     feedback('動画を読み込めませんでした');
    }
   }
  });
 }catch(e){status('⚠️ プレーヤーを起動できません。通信状態を確認してね。')}
}
window.onYouTubeIframeAPIReady=()=>{apiReady=true;createPlayer()};
function loadVideo(){
 const id=ytCore.parseYouTube($('videoUrl').value);
 if(!id){status('⚠️ 正しいYouTube動画URL、または11文字の動画IDを入力してね。');return}
 releasePlayer();videoId=id;
 const original='https://www.youtube.com/watch?v='+encodeURIComponent(id);
 $('openOriginal').href=original;$('openOriginal').hidden=false;
 $('restart').disabled=true;
 if(window.YT?.Player){apiReady=true;createPlayer();return}
 if(apiRequested){status('📡 YouTube公式プレーヤーの読み込みを待っています…');return}
 apiRequested=true;status('📡 YouTube公式プレーヤーを読み込んでいます…');
 const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
 script.onerror=()=>status('⚠️ YouTubeプレーヤーの読み込みに失敗しました。ネット接続またはブラウザ設定を確認してね。');
 document.head.appendChild(script);
}
$('load').onclick=loadVideo;
function prepareChart(){
 if(!$('rights').checked){awaitingPrepare=false;status('⚠️ 動画の音ゲー利用に必要な権利・許諾を確認してチェックしてください。視聴だけなら動画の▶をそのまま押せます。');return}
 if(!player||!ready){status('⚠️ YouTube動画を先に読み込んでね。');return}
 const dur=getDuration();
 if(!dur){awaitingPrepare=true;status('▶️ 動画プレーヤーで一度再生してね。長さが取得できたら譜面を準備するよ。');return}
 let generated;
 try{generated=ytCore.makeSyncChart(studio,{duration:dur,bpm:Number($('bpm').value),offset:Number($('offset').value),level:$('level').value})}
 catch(e){awaitingPrepare=false;status('⚠️ '+e.message);return}
 chart=generated;awaitingPrepare=false;
 resetScores(getVideoTime());lastTime=getVideoTime();$('restart').disabled=false;
 feedback('🎹 譜面準備OK！');
 status('✅ '+chart.notes.length+'個の音符を用意したよ！ YouTube側の▶を押すとゲームが動くよ。');
 draw();
}
$('prepare').onclick=()=>prepareChart();
$('restart').onclick=()=>{
 if(!chart)return;
 resetScores(getVideoTime());
 lastTime=getVideoTime();
 feedback('🔄 スコアをリセットしました！');
};
for(const field of ['bpm','offset','level'])$(field).addEventListener('change',()=>{
 if(chart){chart=null;resetScores();lastTime=null;$('restart').disabled=true;status('🎼 設定を変更したよ。「音ゲーを準備」をもう一度押してね。')}
});
function tap(lane){
 if(!chart||!playing||ended||!Number.isInteger(lane)||lane<0||lane>3)return;
 const t=getVideoTime();
 const hit=ytCore.selectHit(chart.notes,t,lane,done,Number($('latency').value));
 if(!hit)return;
 done.add(hit.index);
 const grade=hit.grade;combo++;maxCombo=Math.max(maxCombo,combo);
 if(grade==='PERFECT'){perfect++;score+=1000;feedback('🌟 PERFECT!')}
 else if(grade==='GREAT'){great++;score+=750;feedback('✨ GREAT!')}
 else{good++;score+=420;feedback('👍 GOOD!')}
 updateHud();
}
for(const pad of document.querySelectorAll('[data-lane]'))pad.addEventListener('pointerdown',e=>{e.preventDefault();tap(Number(pad.dataset.lane))});
document.addEventListener('keydown',e=>{
 if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName))return;
 const lane=['d','f','j','k'].indexOf(String(e.key).toLowerCase());if(lane!==-1){e.preventDefault();tap(lane)}
});
function finish(){
 if(!chart||ended)return;ended=true;playing=false;
 const count=perfect+great+good+miss;
 const accuracy=count?Math.round((perfect+great*.75+good*.4)/count*100):0;
 const rank=accuracy>=94?'S':accuracy>=82?'A':accuracy>=65?'B':accuracy>=40?'C':'D';
 const result=$('result');result.hidden=false;result.replaceChildren();
 const strong=document.createElement('strong');strong.textContent='🏆 RANK '+rank;
 const text=document.createElement('p');text.textContent='SCORE '+score.toLocaleString('ja-JP')+' / MAX COMBO '+maxCombo+' / 精度 '+accuracy+'%';
 result.append(strong,text);
 status('🎉 動画が終了！ もう一度遊ぶには動画を最初から再生し、スコアをリセットしてね。');
 feedback('🎉 FINISH!');
}
const rnd=(x,min,max)=>Math.max(min,Math.min(max,x));
function draw(){
 frame=0;
 if(!ctx)return;
 const rect=canvas.getBoundingClientRect(),w=Math.max(270,rect.width||490),h=Math.max(220,rect.height||410),dpr=Math.min(2,window.devicePixelRatio||1);
 if(canvas.width!==Math.floor(w*dpr)||canvas.height!==Math.floor(h*dpr)){canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr)}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const laneW=w/4,hitY=h*.80,t=getVideoTime();
 for(let lane=0;lane<4;lane++){
  ctx.fillStyle=lane%2?'#242458':'#1a1a46';ctx.fillRect(lane*laneW,0,laneW,h);
  ctx.fillStyle=COLORS[lane];ctx.globalAlpha=.32;ctx.fillRect(lane*laneW,0,5,h);ctx.globalAlpha=1;
  ctx.fillStyle='#ffffffd9';ctx.font='bold 15px system-ui';ctx.fillText(['D','F','J','K'][lane],lane*laneW+10,24);
 }
 if(chart&&!ended){
  if(lastTime!==null&&Math.abs(t-lastTime)>1.65){
   resetScores(t);feedback('↩ 再生位置が変わったのでスコアをリセット');
  }
  lastTime=t;
  if(playing){const n=ytCore.recordMisses(chart.notes,t-Number($('latency').value)/1000,done);if(n){miss+=n;combo=0;updateHud()}}
  const speed=Math.max(110,h*.49);
  for(let i=0;i<chart.notes.length;i++){
   const note=chart.notes[i];if(done.has(i))continue;
   const y=hitY-(note.t-t)*speed;if(y<-26||y>h+26)continue;
   const x=note.lane*laneW+6,width=laneW-12;
   ctx.fillStyle=COLORS[note.lane];ctx.shadowColor=COLORS[note.lane];ctx.shadowBlur=9;
   ctx.fillRect(x,y-11,width,22);ctx.shadowBlur=0;
   ctx.fillStyle='#ffffffb4';ctx.fillRect(x+5,y-9,Math.max(4,width-10),4);
  }
 }
 ctx.fillStyle='#ffe4a4';ctx.fillRect(0,hitY-4,w,8);
 if(chart){ctx.fillStyle='#82f7e7';ctx.fillRect(0,h-6,w*rnd(t/chart.duration,0,1),6)}
 if(!chart){ctx.textAlign='center';ctx.fillStyle='#e2d2ff';ctx.font='bold '+Math.round(rnd(w/17,17,30))+'px system-ui';ctx.fillText('YouTubeの再生位置に',w/2,h*.38);ctx.fillText('合わせてノーツが流れるよ！',w/2,h*.46);ctx.textAlign='left'}
 if(chart&&!playing&&!ended){ctx.fillStyle='#ffffffde';ctx.font='bold 20px system-ui';ctx.textAlign='center';ctx.fillText('⏸ YouTubeの再生待ち',w/2,h*.40);ctx.textAlign='left'}
 if(chart&&playing&&t>=chart.duration-.08&&!ended)finish();
 if(!document.hidden)frame=requestAnimationFrame(draw);
}
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){
  // Never let embedded content play as a background player.
  try{if(player&&ready&&playing)player.pauseVideo()}catch(e){}
  if(frame){cancelAnimationFrame(frame);frame=0}
 }else if(!frame)frame=requestAnimationFrame(draw);
});
window.addEventListener('pagehide',()=>{try{player?.pauseVideo()}catch(e){}if(frame)cancelAnimationFrame(frame)});
if(!frame)frame=requestAnimationFrame(draw);
window.SaikoYouTubeGame=Object.freeze({
 getState:()=>({videoId,ready,playing,chart,score,combo,perfect,great,good,miss,ended}),
 tap,prepareChart,loadVideo,resetScores
});
})();
