/* SAIKO Beat / licensed local audio analysis. No YouTube media access.
 * Pure onset extraction from a user-selected decoded AudioBuffer.
 * Analysis returns event times, not a claim to transcribe individual instruments. */
(function(root){
'use strict';
function finite(n){return typeof n==='number'&&Number.isFinite(n)}
function extractOnsets(buffer,{level='normal',maxSeconds=600}={}){
 if(!buffer||!finite(buffer.sampleRate)||buffer.sampleRate<8000||
    !finite(buffer.duration)||buffer.duration<5||buffer.duration>maxSeconds||
    typeof buffer.getChannelData!=='function')throw Error('音源は5秒〜10分の再生可能なファイルを選んでね');
 if(!['easy','normal','hard'].includes(level))throw Error('難易度が正しくありません');
 const sr=buffer.sampleRate, channels=Math.max(1,Math.min(2,buffer.numberOfChannels||1));
 const data=[];for(let c=0;c<channels;c++)data.push(buffer.getChannelData(c));
 const frameSize=Math.max(160,Math.floor(sr*.02)),len=Math.min(data[0].length,Math.floor(sr*maxSeconds));
 const frames=Math.floor(len/frameSize);
 if(frames<100)return [];
 const amp=new Float32Array(frames),attack=new Float32Array(frames);
 let maxAmp=0,maxAttack=0;
 const stride=Math.max(1,Math.floor(sr/11025));
 for(let i=0;i<frames;i++){
  let energy=0,transient=0,count=0,prev=0;
  const start=i*frameSize,end=Math.min(len,start+frameSize);
  for(let k=start;k<end;k+=stride){
   let sample=0;for(let c=0;c<channels;c++)sample+=(data[c][k]||0)/channels;
   if(!finite(sample))sample=0;
   energy+=Math.abs(sample);transient+=Math.abs(sample-prev);prev=sample;count++;
  }
  amp[i]=count?energy/count:0;attack[i]=count?transient/count:0;
  maxAmp=Math.max(maxAmp,amp[i]);maxAttack=Math.max(maxAttack,attack[i]);
 }
 // Silence or an undecodable source must not generate fake grid notes.
 if(maxAmp<.0001)return [];
 const candidates=[],history=15;
 let rollingAmp=0,rollingAttack=0;
 const contrast=new Float32Array(frames);
 for(let i=0;i<frames;i++){
  if(i>=history){rollingAmp-=amp[i-history];rollingAttack-=attack[i-history]}
  const denom=Math.min(i+1,history);
  rollingAmp+=amp[i];rollingAttack+=attack[i];
  if(i<history)continue;
  const priorAmp=Math.max(.0000001,(rollingAmp-amp[i])/(denom-1));
  const priorAttack=Math.max(.0000001,(rollingAttack-attack[i])/(denom-1));
  const dynamics=Math.max(0,amp[i]-priorAmp*1.11)/Math.max(maxAmp,.00001);
  const highAttack=Math.max(0,attack[i]-priorAttack*1.13)/Math.max(maxAttack,.00001);
  contrast[i]=dynamics*.60+highAttack*.40;
 }
 const strengths=Array.from(contrast).filter(v=>v>.012).sort((a,b)=>a-b);
 if(!strengths.length)return [];
 const cutoff=strengths[Math.floor(strengths.length*.58)]||.018;
 const threshold=Math.max(.024,Math.min(.16,cutoff*.90));
 for(let i=history+1;i<frames-1;i++){
  if(amp[i]<maxAmp*.035)continue;
  const v=contrast[i];
  if(v<threshold||v<contrast[i-1]||v<=contrast[i+1])continue;
  const t=(i*frameSize)/sr;
  // Never place a note in the first fraction of a second.
  if(t<.15||t>buffer.duration-.15)continue;
  candidates.push({t:Math.round(t*1000)/1000,score:v});
 }
 if(!candidates.length)return [];
 // Prefer stronger transients when two nearby peaks compete.
 const spacing=level==='easy'?.42:level==='hard'?.13:.24;
 const selected=[];
 for(const p of candidates){
  const last=selected[selected.length-1];
  if(last&&p.t-last.t<spacing){
   if(p.score>last.score)selected[selected.length-1]=p;
  }else selected.push(p);
 }
 const limit=level==='easy'?350:level==='normal'?700:1100;
 if(selected.length>limit){
  const ordered=selected.slice().sort((a,b)=>b.score-a.score).slice(0,limit);
  return ordered.sort((a,b)=>a.t-b.t).map(x=>x.t);
 }
 return selected.map(x=>x.t);
}
function chartFromOnsets(studio,{duration,bpm=120,offset=0,level='normal',title='AUDIO SYNC',times=[],shift=0}={}){
 if(!studio||typeof studio.normalizeChart!=='function')throw Error('譜面エンジンを読み込めません');
 if(!Array.isArray(times)||times.length<4)throw Error('音のアタックを十分検出できません。別の音源・ミックスで試してね');
 if(!finite(shift)||Math.abs(shift)>10)throw Error('動画との位置調整は±10秒以内で指定してね');
 const notes=[],minimum=level==='easy'?.38:level==='hard'?.12:.21;
 for(const raw of times){
  const t=Math.round((raw+shift)*1000)/1000;
  if(!finite(t)||t<0||t>duration)continue;
  const prev=notes[notes.length-1];
  if(prev&&t-prev.t<minimum)continue;
  const lane=level==='easy'?1+(notes.length%2):(notes.length*5+Math.floor(notes.length/4))%4;
  notes.push({t,lane});
  if(notes.length>=1200)break;
 }
 if(notes.length<4)throw Error('有効なノーツが少なすぎます。音源と開始時刻を見直してね');
 return studio.normalizeChart({version:1,title,duration,bpm,offset,level,notes});
}
const api=Object.freeze({extractOnsets,chartFromOnsets});
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.SaikoBeatAnalyzer=api;
})(typeof window!=='undefined'?window:null);
