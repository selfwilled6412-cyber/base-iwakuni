/* SAIKO BEAT × YouTube experimental synchronization helpers.
   Only official embedded playback; no downloading, audio extraction or metadata caching. */
(function(root){
'use strict';
const VALID_HOSTS=new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtu.be','youtube-nocookie.com','www.youtube-nocookie.com']);
const VIDEO_ID=/^[a-zA-Z0-9_-]{11}$/;
function parseYouTube(input){
 const raw=String(input||'').trim();
 if(VIDEO_ID.test(raw))return raw;
 let u;try{u=new URL(raw)}catch(e){return null}
 if(u.protocol!=='https:'&&!((u.hostname==='youtube.com'||u.hostname==='www.youtube.com')&&u.protocol==='http:'))return null;
 const host=u.hostname.toLowerCase();
 if(!VALID_HOSTS.has(host)||u.username||u.password||u.port)return null;
 const parts=u.pathname.split('/').filter(Boolean);
 let id=null;
 if(host==='youtu.be'||host==='www.youtu.be')id=parts.length===1?parts[0]:null;
 else if(parts.length===1&&parts[0]==='watch')id=u.searchParams.get('v');
 else if(parts.length===2&&['shorts','embed','live','v'].includes(parts[0]))id=parts[1];
 return VIDEO_ID.test(id||'')?id:null;
}
function validateVideoDuration(duration){
 return typeof duration==='number'&&Number.isFinite(duration)&&duration>=5&&duration<=600;
}
function makeSyncChart(studio,opts){
 if(!studio||typeof studio.makeChart!=='function')throw Error('譜面エンジンを読み込めません');
 const duration=Number(opts?.duration);
 if(!validateVideoDuration(duration))throw Error('この試作は5秒〜10分の通常動画に対応しています');
 const bpm=Number(opts?.bpm),offset=Number(opts?.offset),level=opts?.level||'normal';
 if(!Number.isInteger(bpm)||bpm<60||bpm>220)throw Error('BPMは60〜220で指定してください');
 if(!Number.isFinite(offset)||offset<0||offset>3)throw Error('拍の開始位置は0〜3秒にしてください');
 if(!['easy','normal','hard'].includes(level))throw Error('難易度が正しくありません');
 return studio.makeChart({title:'YouTube SYNC',duration,bpm,offset,level});
}
function selectHit(notes,time,lane,done,adjustMs=0){
 if(!Array.isArray(notes)||typeof time!=='number'||!Number.isFinite(time)||!Number.isInteger(lane)||lane<0||lane>3||!done||typeof done.has!=='function')return null;
 const when=time-adjustMs/1000;
 let best=null;
 for(let i=0;i<notes.length;i++){
  const n=notes[i];if(n.lane!==lane||done.has(i))continue;
  const delta=Math.abs(n.t-when);
  if(delta<=.185&&(best===null||delta<best.delta)){
   best={index:i,delta,grade:delta<=.058?'PERFECT':delta<=.115?'GREAT':'GOOD'};
  }
 }
 return best;
}
function recordMisses(notes,time,done){
 if(!Array.isArray(notes)||!Number.isFinite(time)||!done)return 0;
 let missed=0;
 for(let i=0;i<notes.length;i++){
  if(notes[i].t<time-.195&&!done.has(i)){done.add(i);missed++}
 }
 return missed;
}
function estimateTapBpm(taps){
 if(!Array.isArray(taps)||taps.length<4)return null;
 const diffs=[];
 for(let i=1;i<taps.length;i++){
  const delta=taps[i]-taps[i-1];
  if(!Number.isFinite(delta)||delta<273||delta>1000)return null;
  diffs.push(delta);
 }
 diffs.sort((a,b)=>a-b);
 const middle=diffs[Math.floor(diffs.length/2)],bpm=Math.round(60000/middle);
 return bpm>=60&&bpm<=220?bpm:null;
}
const api=Object.freeze({parseYouTube,validateVideoDuration,makeSyncChart,selectHit,recordMisses,estimateTapBpm});
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.SaikoYouTubeCore=api;
})(typeof window!=='undefined'?window:null);
