(()=>{'use strict';
const $=id=>document.getElementById(id);
const ytCore=window.SaikoYouTubeCore,studio=window.SaikoStudioCore,analyzer=window.SaikoBeatAnalyzer;
if(!ytCore||!studio||!analyzer){$('status').textContent='譜面エンジンを読み込めません。再読み込みしてください。';return}
const COLORS=['#ff87c4','#ffe393','#7ef1e8','#c1a2ff'];
const canvas=$('gameCanvas'),ctx=canvas.getContext('2d');
let player=null,videoId=null,ready=false,playing=false,apiRequested=false,apiReady=!!window.YT?.Player;
let chart=null,done=new Set(),score=0,combo=0,maxCombo=0,perfect=0,great=0,good=0,miss=0;
let recordedTaps=[],recording=false,audioOnsets=[],analyzedAudioName='';
let awaitingPrepare=false,lastTime=null,runToken=0,frame=0,judgeMessage='',judgeUntil=0,ended=false;
function status(text){$('status').textContent=text}
let rightsRetry=null;
try{$('rights').checked=window.localStorage?.getItem('saiko-beat-ack-v1')==='yes'}catch(e){}
function requestGameRights(retry){
 if($('rights').checked)return true;
 rightsRetry=retry||null;
 const dialog=$('consentDialog');
 if(typeof dialog.showModal==='function'){if(!dialog.open)dialog.showModal()}
 else {dialog.hidden=false}
 return false;
}
$('rightsConfirm').onclick=()=>{
 if(!$('rights').checked){status('音ゲーの利用権限を確認してチェックしてね。');return}
 try{window.localStorage?.setItem('saiko-beat-ack-v1','yes')}catch(e){}
 const dialog=$('consentDialog');if(typeof dialog.close==='function')dialog.close();else dialog.hidden=true;
 const resume=rightsRetry;rightsRetry=null;if(typeof resume==='function')resume();
};
$('rightsCancel').onclick=()=>{const dialog=$('consentDialog');if(typeof dialog.close==='function')dialog.close();else dialog.hidden=true;rightsRetry=null};

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
 runToken++;ready=false;playing=false;awaitingPrepare=false;lastTime=null;chart=null;recording=false;recordedTaps=[];audioOnsets=[];analyzedAudioName='';refreshBeatUI();$('audioAnalysisStatus').textContent='動画を読み込んだら、同じ曲の音源ファイルから譜面を作れます。';
 resetScores();if(player){try{player.destroy()}catch(e){}player=null}
 $('videoContainer').innerHTML='<div id="ytPlayer"></div>';
 feedback('動画を読み込んでね！');
 if(frame){cancelAnimationFrame(frame);frame=0}
}
function createPlayer(){
 if(!videoId||!window.YT?.Player)return;
 const token=runToken;
 try{
  const playerVars={playsinline:1};if(window.location?.origin)playerVars.origin=window.location.origin;
  player=new window.YT.Player('ytPlayer',{
   width:'640',height:'360',videoId,
   playerVars,
   events:{
    onReady:()=>{
     if(token!==runToken)return;
     ready=true;
     status('▶ 動画の準備ができました');
     // One URL submission is enough when a private gateway is configured.
     if(gatewayBase())void chartFromGateway();
     draw();
    },
    onStateChange:e=>{
     if(token!==runToken)return;
     const state=Number(e.data);
     playing=state===1;
     if(playing){
      // Chart creation is user-initiated; no synthetic chart on playback.
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
 releasePlayer();videoId=id;restoreRecordedBeats();
 const original='https://www.youtube.com/watch?v='+encodeURIComponent(id);
 $('openOriginal').href=original;$('openOriginal').hidden=false;
 $('restart').disabled=true;
 if(window.YT?.Player){apiReady=true;createPlayer();return}
 if(apiRequested){status('📡 YouTube公式プレーヤーの読み込みを待っています…');return}
 apiRequested=true;status('📡 YouTube公式プレーヤーを読み込んでいます…');
 const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;
 script.onerror=()=>{apiRequested=false;script.remove?.();status('⚠️ YouTubeプレーヤーの読み込みに失敗しました。ネット接続を確認し、もう一度「動画を読み込む」を押してね。');};
 document.head.appendChild(script);
}
$('load').onclick=loadVideo;
$('openStudioSettings').onclick=()=>{
 const settings=$('studioSettings');settings.open=true;
 settings.scrollIntoView?.({behavior:'smooth',block:'start'});
};
/* Private autochart prototype. Browser obtains ONLY beatmap JSON.
 * Extracting or caching audio happens on a separately operated gateway. */
function gatewayBase(){
 const value=$('chartEndpoint').value.trim();
 const loc=window.location;
 // Same-origin local Python gateway: zero URL/API-key setup for players.
 if(!value&&loc&&['localhost','127.0.0.1'].includes(loc.hostname)&&
    String(loc.pathname||'').startsWith('/game/')&&loc.origin)return loc.origin;
 try{
  const u=new URL(value);
  if((u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))||u.username||u.password||u.search||u.hash)throw Error();
  return u.origin;
 }catch(e){return null}
}
$('chartEndpoint').addEventListener('change',()=>{
 const base=gatewayBase();
 if(base){try{window.localStorage?.setItem('saiko-chart-service-url',base)}catch(e){}}
});
try{
 const saved=window.localStorage?.getItem('saiko-chart-service-url');
 if(saved)$('chartEndpoint').value=saved;
}catch(e){}
async function chartFromGateway(){
 const vid=ytCore.parseYouTube($('videoUrl').value);
 if(!vid){status('動画のURLを入力してね');return}
 const base=gatewayBase();
 if(!base){
  status('🎼 音声解析サーバーが未接続です。詳細から解析サーバーのURLを設定してね');
  $('chartGatewayStatus').textContent='⚠️ 解析サーバーが未接続。接続しない限り、自動採譜は利用できません。';
  $('studioSettings').open=true;
  return;
 }
 if(!requestGameRights(chartFromGateway))return;
 const key=$('chartKey').value;
 // Only start analysis after the official player has a matching video.
 if(vid!==videoId){loadVideo();return}
 const token=runToken,button=$('autoChart');
 button.disabled=true;button.textContent='🎼 音の解析中…';
 status('🥁 動画の音からノーツを作成中…');$('chartGatewayStatus').textContent='音の解析を実行しています';
 try{
  const response=await fetch(base+'/api/chart',{
    method:'POST',mode:'cors',cache:'no-store',
    headers:{'Content-Type':'application/json',...(key?{'X-Chart-Key':key}:{})},
    body:JSON.stringify({video_id:vid,level:$('level').value})
  });
  let data={};try{data=await response.json()}catch(e){}
  if(token!==runToken)return;
  if(!response.ok)throw Error(data?.detail||('解析サーバーからエラー '+response.status));
  if(data.video_id!==vid||!Array.isArray(data.notes)||data.notes.length<4)throw Error('曲から有効なノーツを生成できませんでした');
  const next=studio.normalizeChart({
    version:1,title:'AUTO CHART '+vid,duration:Number(data.duration),
    bpm:Number($('bpm').value),offset:0,level:$('level').value,notes:data.notes
  });
  chart=next;recording=false;awaitingPrepare=false;recordedTaps=[];audioOnsets=[];
  refreshBeatUI();resetScores(0);lastTime=null;ended=false;
  $('restart').disabled=false;
  feedback('🎵 AUTO CHART READY');
  status('✅ 曲の音から'+chart.notes.length+'個のノーツを生成！ 動画を先頭から再生してね。遅れがあれば判定補正を調整できます。');
  $('chartGatewayStatus').textContent='✅ '+chart.notes.length+'ノーツ生成。音源ファイルの手動アップロードなし';
  draw();
 }catch(e){
  if(token===runToken){
   const message=String(e?.message||'解析失敗').slice(0,190);
   status('⚠️ 自動採譜できませんでした：'+message);
   $('chartGatewayStatus').textContent='⚠️ '+message+'。接続先と端末のネット接続を確認してね';
  }
 }finally{button.disabled=false;button.textContent='⚡ この曲を自動採譜（試作）'}
}
$('autoChart').onclick=chartFromGateway;


const bpmTaps=[];
$('tapBpm').onclick=()=>{
 const now=performance.now(),last=bpmTaps[bpmTaps.length-1];
 if(last===undefined||now-last>2200||now-last<260)bpmTaps.length=0;
 bpmTaps.push(now);
 if(bpmTaps.length>8)bpmTaps.shift();
 const estimated=ytCore.estimateTapBpm(bpmTaps);
 if(estimated){
  $('bpm').value=String(estimated);
  $('tapBpmStatus').textContent='✅ '+estimated+' BPMを推定！ 「音ゲーを準備」を押してね。';
  if(chart){chart=null;resetScores();lastTime=null;$('restart').disabled=true;status('🎼 BPMが変わったので、もう一度「音ゲーを準備」を押そう！')}
 }else $('tapBpmStatus').textContent='👏 '+bpmTaps.length+'回目！ 音楽の拍に合わせてあと'+Math.max(0,4-bpmTaps.length)+'回以上押してね。';
};


/* Local user-owned audio file analysis. YouTube IFrame audio is NEVER accessed. */
function generateFromAudioOnsets(){
 if(!requestGameRights(generateFromAudioOnsets))return false
 const duration=getDuration(),shift=Number($('syncShift').value);
 try{
  const next=analyzer.chartFromOnsets(studio,{duration,bpm:Number($('bpm').value),offset:Number($('offset').value),level:$('level').value,title:analyzedAudioName||'AUDIO SYNC',times:audioOnsets,shift});
  chart=next;resetScores(getVideoTime());lastTime=getVideoTime();$('restart').disabled=false;
  feedback('🎵 本当の音から譜面作成！');
  status('✅ '+chart.notes.length+'ノーツ！ 実際の音源から検出したリズムを使っています。⏮「最初から挑戦」を押してね。');
  $('audioAnalysisStatus').textContent='✅ '+audioOnsets.length+'箇所の音のアタックを検出し、'+chart.notes.length+'個のノーツに変換しました。';
  return true;
 }catch(e){status('⚠️ '+e.message);$('audioAnalysisStatus').textContent='⚠️ '+e.message;return false}
}
$('syncShift').addEventListener('change',()=>{if(audioOnsets.length>=4)generateFromAudioOnsets()});
$('analyzeAudio').onclick=async()=>{
 if(!requestGameRights(()=>$('analyzeAudio').onclick()))return
 if(!player||!ready||!getDuration()){status('⚠️ YouTube動画を読み込んで、▶で一度再生してね。');return}
 const file=$('syncAudioFile').files?.[0];
 if(!file){status('⚠️ 先にMP3・WAV等の音源ファイルを選んでね。');return}
 if(file.size>32*1024*1024){status('⚠️ 解析する音源は32MB以内にしてね。');return}
 if(!String(file.type||'').startsWith('audio/')&&!/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(file.name)){status('⚠️ 音楽ファイルを選んでね。');return}
 let ac;const token=runToken,button=$('analyzeAudio');
 button.disabled=true;status('🔎 音源ファイルをこの端末だけで解析中…');$('audioAnalysisStatus').textContent='🥁 音の立ち上がりを検出しています…';
 try{
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('このブラウザは音声解析に対応していません');
  ac=new AC();
  const decoded=await ac.decodeAudioData(await file.arrayBuffer());
  if(token!==runToken)return;
  if(Math.abs(decoded.duration-getDuration())>35)throw Error('動画と音源の長さが大きく違います。正しい音源か確認してね。');
  const onsets=analyzer.extractOnsets(decoded,{level:$('level').value});
  if(onsets.length<4)throw Error('音のリズムを十分検出できませんでした。ドラム等が聞こえる曲で試してね。');
  audioOnsets=onsets;analyzedAudioName=file.name.replace(/\.[^.]+$/,'').slice(0,80);
  recording=false;recordedTaps=[];refreshBeatUI();
  generateFromAudioOnsets();
 }catch(e){if(token===runToken){status('⚠️ 音声解析できませんでした。'+(e.message||'MP3やWAVで試してね'));$('audioAnalysisStatus').textContent='⚠️ '+(e.message||'解析失敗')}}
 finally{if(ac)try{await ac.close()}catch(e){}button.disabled=false}
};

/* Live authoring uses YouTube's time position, NEVER its audio/video bytes. */
function beatStorageKey(){return videoId?'saiko-youtube-beats-v1:'+videoId:null}
function refreshBeatUI(){
 $('captureCount').textContent='記録 '+recordedTaps.length+' 個'+(recordedTaps.length>=4?' ✅':'（4個以上必要）');
 $('recordBeat').textContent=recording?'⏹ 記録終了・譜面を作る':'🔴 記録開始';
 $('recordBeat').classList.toggle('active',recording);
 $('captureBeat').disabled=!recording;
 $('tapDock').disabled=!recording;$('recordDock').textContent=recording?'⏹ 記録を終える':'🔴 曲に合わせて記録';
}
function restoreRecordedBeats(){
 const key=beatStorageKey();if(!key)return;
 try{
  const raw=JSON.parse(window.localStorage?.getItem(key)||'null');
  if(Array.isArray(raw)&&raw.length<=2000){
   recordedTaps=raw.filter(n=>n&&Number.isFinite(n.t)&&n.t>=0&&n.t<=600&&(n.lane===null||Number.isInteger(n.lane)&&n.lane>=0&&n.lane<=3)).map(n=>({t:n.t,lane:n.lane??null}));
  }
 }catch(e){recordedTaps=[]}
 refreshBeatUI();
}
function persistRecordedBeats(){
 try{if(beatStorageKey()&&window.localStorage){window.localStorage.setItem(beatStorageKey(),JSON.stringify(recordedTaps))}}catch(e){status('⚠️ この端末の保存容量が不足しています。譜面はこの画面で引き続き利用できます。')}
}
function applyRecordedBeats(){
 if(!ready||!player)return;
 const dur=getDuration();
 try{
  const result=ytCore.makeRecordedChart(studio,{duration:dur,bpm:Number($('bpm').value),offset:Number($('offset').value),level:$('level').value,taps:recordedTaps});
  chart=result;resetScores(getVideoTime());lastTime=getVideoTime();$('restart').disabled=false;
  feedback('🥁 曲に合わせた譜面OK！');
  status('✅ 実際にタップした'+recordedTaps.length+'拍を使った '+chart.notes.length+'ノーツ！ YouTube動画を最初から再生して挑戦してね。');
 }catch(e){status('⚠️ '+e.message)}
}
function startRecording(){
 if(!requestGameRights(startRecording))return
 if(!ready||!player){status('⚠️ YouTubeの動画を先に読み込んでね。');return}
 if(!playing){status('▶️ YouTube動画の▶を押して、音が流れ始めてから記録を開始してね。');return}
 if(!getDuration()){status('⌛ 動画の再生時間が取得できません。');return}
 recording=true;recordedTaps=[];chart=null;resetScores();$('restart').disabled=true;
 feedback('🔴 RECORDING');
 refreshBeatUI();
 status('🔴 記録中！ 音に合わせて「♪ ビートを刻む」を押してね。PCはスペースキー、4レーンも使えるよ。');
}
function captureRecordedTap(lane=null){
 if(!recording)return;
 if(!playing){status('⏸ 動画が止まっているので記録は一時停止中。動画を再生してね。');return}
 const t=Math.round(getVideoTime()*1000)/1000;
 if(!Number.isFinite(t)||t<0||t>getDuration()||recordedTaps.length>=1600)return;
 const prev=recordedTaps[recordedTaps.length-1];
 if(prev&&t-prev.t<.09&&(lane===null||prev.lane===lane))return;
 recordedTaps.push({t,lane});refreshBeatUI();
 feedback('🥁 '+recordedTaps.length+' BEATS');
}
function stopRecording(){
 if(!recording)return;
 recording=false;refreshBeatUI();
 if(recordedTaps.length<4){status('⚠️ 最低4回リズムを記録してね。もう一度「記録開始」を押してやり直せるよ。');return}
 persistRecordedBeats();applyRecordedBeats();
}
$('recordBeat').onclick=()=>recording?stopRecording():startRecording();
$('recordDock').onclick=()=>recording?stopRecording():startRecording();
$('tapDock').addEventListener('pointerdown',e=>{e.preventDefault();captureRecordedTap()});
$('captureBeat').addEventListener('pointerdown',e=>{e.preventDefault();captureRecordedTap()});
$('clearBeats').onclick=()=>{
 recording=false;recordedTaps=[];chart=null;resetScores();$('restart').disabled=true;
 try{if(beatStorageKey())window.localStorage?.removeItem(beatStorageKey())}catch(e){}
 refreshBeatUI();status('🗑 リズム記録を消しました。もう一度記録するかBPM仮譜面を使ってね。');
};
refreshBeatUI();

function prepareChart(){
 if(recording){stopRecording();return}
 if(audioOnsets.length>=4){generateFromAudioOnsets();return}
 if(recordedTaps.length>=4){if(!requestGameRights(prepareChart))return;applyRecordedBeats();return}
 // No arbitrary BPM-grid notes: they do not follow the song.
 // Require a measured local-audio waveform or actual recorded beat timestamps.
 status('🎼 この動画の譜面はまだありません。譜面・設定から曲の音を解析するか、リズムを記録してね。');
 $('studioSettings').open=true;
}
$('prepare').onclick=()=>prepareChart();
$('restart').onclick=()=>{
 if(!chart)return;
 // This is a direct user action; official player remains visible and interactive.
 try{if(player&&ready&&typeof player.seekTo==='function')player.seekTo(0,true)}catch(e){}
 resetScores(0);
 lastTime=null;
 feedback('🔄 先頭から挑戦！');
 status('▶️ 動画を先頭に戻したよ。YouTubeの▶で再生してスタート！');
};
for(const field of ['bpm','offset','level'])$(field).addEventListener('change',()=>{
 if(audioOnsets.length>=4){generateFromAudioOnsets();return}
 if(chart){chart=null;resetScores();lastTime=null;$('restart').disabled=true;status('🎼 設定を変更したよ。再度「音ゲーを準備」を押してね。')}
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
for(const pad of document.querySelectorAll('[data-lane]'))pad.addEventListener('pointerdown',e=>{e.preventDefault();const lane=Number(pad.dataset.lane);if(recording)captureRecordedTap(lane);else tap(lane)});
document.addEventListener('keydown',e=>{
 if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName))return;
 if(recording&&e.code==='Space'){e.preventDefault();captureRecordedTap();return}
 const lane=['d','f','j','k'].indexOf(String(e.key).toLowerCase());if(lane!==-1){e.preventDefault();if(recording)captureRecordedTap(lane);else tap(lane)}
});
function finish(){
 if(!chart||ended)return;
 // At video completion, count all remaining, previously unjudged notes as misses.
 const remaining=ytCore.recordMisses(chart.notes,chart.duration+.3,done);
 if(remaining){miss+=remaining;combo=0;updateHud()}
 ended=true;playing=false;
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
 const laneW=w/4,hitY=h*.79,t=getVideoTime(),pulse=1+Math.sin(performance.now()/145)*.12;
 for(let lane=0;lane<4;lane++){
  ctx.fillStyle=lane%2?'#090e29':'#111132';ctx.fillRect(lane*laneW,0,laneW,h);
  ctx.fillStyle=COLORS[lane];ctx.globalAlpha=.38;ctx.fillRect(lane*laneW,0,6,h);ctx.globalAlpha=1;
  ctx.fillStyle='#ffffff';ctx.font='bold 22px system-ui';ctx.shadowBlur=8;ctx.shadowColor=COLORS[lane];ctx.fillText(['D','F','J','K'][lane],lane*laneW+14,33);ctx.shadowBlur=0;
  ctx.fillStyle=COLORS[lane];ctx.globalAlpha=.16;ctx.fillRect(lane*laneW+8,hitY-44,laneW-16,84);ctx.globalAlpha=1;
 }
 if(chart&&!ended){
  if(lastTime!==null&&Math.abs(t-lastTime)>1.65){
   resetScores(t);feedback('↩ 再生位置が変わったのでスコアをリセット');
  }
  lastTime=t;
  if(playing){const n=ytCore.recordMisses(chart.notes,t-Number($('latency').value)/1000,done);if(n){miss+=n;combo=0;updateHud()}}
  const speed=Math.max(165,h*.68)*(Number($('noteSpeed').value)||1);
  for(let i=0;i<chart.notes.length;i++){
   const note=chart.notes[i];if(done.has(i))continue;
   const y=hitY-(note.t-t)*speed;if(y<-26||y>h+26)continue;
   const x=note.lane*laneW+7,width=laneW-14;
   ctx.fillStyle='#ffffff';ctx.shadowColor=COLORS[note.lane];ctx.shadowBlur=23;
   ctx.fillRect(x-2,y-18,width+4,36);
   ctx.fillStyle=COLORS[note.lane];ctx.fillRect(x,y-15,width,30);
   ctx.shadowBlur=0;ctx.fillStyle='#ffffff';ctx.fillRect(x+5,y-12,Math.max(3,width-10),6);
  }
 }
 ctx.shadowColor='#ffe99e';ctx.shadowBlur=18*pulse;ctx.fillStyle='#fff6c3';ctx.fillRect(0,hitY-6,w,12);ctx.shadowBlur=0;
 for(let lane=0;lane<4;lane++){ctx.fillStyle=COLORS[lane];ctx.fillRect(lane*laneW+laneW*.2,hitY-10,laneW*.6,20)}
 if(chart){ctx.fillStyle='#82f7e7';ctx.fillRect(0,h-6,w*rnd(t/chart.duration,0,1),6)}
 if(!chart){ctx.textAlign='center';ctx.fillStyle='#e2d2ff';ctx.font='bold '+Math.round(rnd(w/17,17,30))+'px system-ui';ctx.fillText('譜面がまだありません',w/2,h*.38);ctx.fillText('詳細設定で曲の音を解析してね',w/2,h*.46);ctx.textAlign='left'}
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
if(typeof IntersectionObserver!=='undefined'){
 const visibleVideo=new IntersectionObserver(entries=>{
  const item=entries[0];
  if(item&&item.intersectionRatio<.5&&player&&ready&&playing){
   try{player.pauseVideo()}catch(e){}
  }
 },{threshold:[0,.5,1]});
 visibleVideo.observe($('videoContainer'));
}
window.addEventListener('pagehide',()=>{try{player?.pauseVideo()}catch(e){}if(frame)cancelAnimationFrame(frame)});
if(!frame)frame=requestAnimationFrame(draw);
window.SaikoYouTubeGame=Object.freeze({
 getState:()=>({videoId,ready,playing,chart,score,combo,perfect,great,good,miss,ended,recording,recordedCount:recordedTaps.length}),
 tap,prepareChart,loadVideo,resetScores,captureRecordedTap,startRecording,stopRecording
});
})();
