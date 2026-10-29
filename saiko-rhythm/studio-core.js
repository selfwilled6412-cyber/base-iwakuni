/* SAIKO BEAT STUDIO — offline-only beatmap helpers (no audio upload). */
(function(root){
'use strict';
const LEVELS=['easy','normal','hard'];
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function finite(v){return typeof v==='number'&&Number.isFinite(v)}
function asNumber(v){return Number(v)}
function normalizeChart(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('譜面形式が正しくありません');
 if(raw.version!==1)throw Error('対応していない譜面バージョンです');
 const bpm=asNumber(raw.bpm),offset=asNumber(raw.offset),duration=asNumber(raw.duration);
 if(!finite(bpm)||bpm<60||bpm>220)throw Error('BPMは60〜220にしてください');
 if(!finite(offset)||offset<0||offset>3)throw Error('開始位置は0〜3秒にしてください');
 if(!finite(duration)||duration<5||duration>600)throw Error('音楽の長さは5秒〜10分にしてください');
 if(!Array.isArray(raw.notes)||raw.notes.length>1600)throw Error('音符は1600個までです');
 const title=String(raw.title||'MY RHYTHM').trim().slice(0,80);
 const level=LEVELS.includes(raw.level)?raw.level:'normal';
 const notes=[],seen=new Set();
 for(const rawNote of raw.notes){
  const t=asNumber(rawNote?.t),lane=asNumber(rawNote?.lane);
  if(!finite(t)||t<0||t>duration||!Number.isInteger(lane)||lane<0||lane>3)throw Error('譜面の音符が不正です');
  const key=Math.round(t*1000)+':'+lane;
  if(seen.has(key))continue;seen.add(key);
  notes.push({t:Math.round(t*1000)/1000,lane});
 }
 notes.sort((a,b)=>a.t-b.t||a.lane-b.lane);
 return {format:'saiko-beat-studio',version:1,title,bpm,offset,duration,level,notes};
}
function makeChart({title='MY RHYTHM',bpm=120,offset=0,duration=60,level='normal',peaks=[]}={}){
 const meta=normalizeChart({version:1,title,bpm,offset,duration,level,notes:[]});
 const beat=60/meta.bpm,notes=[],density=meta.level==='easy'?2:meta.level==='hard'?.5:1;
 let step=0,prior=-1;
 for(let time=meta.offset+beat*4;time<meta.duration-.25&&notes.length<900;time+=beat*density){
  if(step>0&&step%4===3&&meta.level==='easy'){step++;continue}
  const lane=meta.level==='easy'?1+(step%2):(step*7+Math.floor(step/3))%4;
  let t=time;
  if(Array.isArray(peaks)&&peaks.length){
   const near=peaks.reduce((best,p)=>{
    const delta=Math.abs(p-time),bestDelta=best===null?Infinity:Math.abs(best-time);
    return delta<bestDelta&&delta<beat*.20?p:best;
   },null);
   if(near!==null)t=near;
  }
  const sec=Math.round(t*1000)/1000;
  if(sec>prior+.14&&sec<meta.duration){notes.push({t:sec,lane});prior=sec}
  step++;
 }
 return normalizeChart({...meta,notes});
}
function nearestGrid(time,bpm,offset=0,division=2){
 const spacing=60/bpm/division;
 return Math.max(0,Math.round((time-offset)/spacing)*spacing+offset);
}
function insertNote(chart,t,lane){
 const meta=normalizeChart(chart);
 const rounded=Math.round(t*1000)/1000;
 if(!Number.isInteger(lane)||lane<0||lane>3||!finite(rounded)||rounded<0||rounded>meta.duration)return meta;
 meta.notes=meta.notes.filter(x=>!(x.lane===lane&&Math.abs(x.t-rounded)<.11));
 meta.notes.push({t:rounded,lane});
 return normalizeChart(meta);
}
function removeNote(chart,t,lane,range=.13){
 const meta=normalizeChart(chart);
 meta.notes=meta.notes.filter(x=>x.lane!==lane||Math.abs(x.t-t)>range);
 return meta;
}
function judge(notes,t,lane,doneSet=new Set(),windowSec=.19){
 if(!finite(t)||!Number.isInteger(lane)||lane<0||lane>3||!Array.isArray(notes))return null;
 let candidate=null;
 for(let i=0;i<notes.length;i++){
  const n=notes[i];if(doneSet.has(i)||n.lane!==lane)continue;
  const delta=Math.abs(n.t-t);
  if(delta<=windowSec&&(candidate===null||delta<candidate.delta))candidate={index:i,delta,grade:delta<=.060?'PERFECT':delta<=.115?'GREAT':'GOOD'};
 }
 return candidate;
}
/* Lightweight envelope transients — assists timing, not a substitute for human editing.
   Use a bounded number of samples to avoid freezing low-memory devices. */
function detectPeaks(samples,sampleRate,maxDuration=600){
 if(!samples||typeof samples.length!=='number'||!finite(sampleRate)||sampleRate<8000)return [];
 const block=Math.max(256,Math.round(sampleRate*.025)),count=Math.min(Math.floor(samples.length/block),Math.ceil(maxDuration*sampleRate/block));
 if(count<8)return [];
 const energy=[];
 for(let i=0;i<count;i++){
  let acc=0,n=0;const start=i*block;
  for(let j=start;j<start+block&&j<samples.length;j+=8){acc+=Math.abs(samples[j]);n++}
  energy.push(n?acc/n:0);
 }
 const peaks=[],lookback=12;
 for(let i=lookback;i<energy.length-2;i++){
  let avg=0;for(let j=i-lookback;j<i;j++)avg+=energy[j];avg/=lookback;
  const e=energy[i];
  if(e>.016&&e>avg*1.38&&e>=energy[i-1]&&e>energy[i+1]){
   const t=i*block/sampleRate;
   if(!peaks.length||t-peaks[peaks.length-1]>.13)peaks.push(Math.round(t*1000)/1000);
  }
 }
 return peaks.slice(0,5000);
}
const api=Object.freeze({normalizeChart,makeChart,nearestGrid,insertNote,removeNote,judge,detectPeaks,levels:LEVELS});
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.SaikoStudioCore=api;
})(typeof window!=='undefined'?window:null);
