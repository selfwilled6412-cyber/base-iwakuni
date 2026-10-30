/* SAIKO BEAT piano-tile timing engine. Pure functions for Android/Web and CI.
 * Notes must originate from measured audio onsets; no BPM-grid fallback here. */
(function(root,factory){
 const value=factory();
 if(typeof module==='object'&&module.exports)module.exports=value;
 if(root)root.SaikoPianoCore=value;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 function prepare(notes){
  if(!Array.isArray(notes)||notes.length<4||notes.length>3000)throw Error('音声からノーツを作れませんでした');
  let last=-1;
  return notes.map((n,i)=>{
   const t=Number(n.t),lane=Number(n.lane),hold=Number(n.hold||0);
   if(!finite(t)||t<0||t<last||!Number.isInteger(lane)||lane<0||lane>3||!finite(hold)||hold<0||hold>5||(hold>0&&hold<.35))throw Error('譜面データが正しくありません');
   last=t;
   return {t,lane,hold,id:i,judged:false,result:null,holding:false,pointerId:null,startResult:null};
  });
 }
 function engine(raw){
  let notes=prepare(raw),combo=0,best=0,score=0,perfect=0,good=0,miss=0,active=true;
  function judge(note,result){
   if(note.judged)return false;
   note.judged=true;note.result=result;note.holding=false;note.pointerId=null;
   if(result==='miss'){combo=0;miss++}
   else{combo++;best=Math.max(best,combo);
    if(result==='perfect'){perfect++;score+=1000+Math.min(combo,200)*5}
    else{good++;score+=500+Math.min(combo,200)*2}
   }
   return true;
  }
  function tick(time){
   if(!active||!finite(time))return;
   for(const n of notes){
    if(n.judged)continue;
    if(n.holding){
     if(time>=n.t+n.hold-.05)judge(n,n.startResult);
    }else if(time>n.t+.23)judge(n,'miss');
   }
  }
  function press(lane,time,pointerId=null){
   if(!active||!Number.isInteger(lane)||lane<0||lane>3||!finite(time))return null;
   tick(time);
   const candidates=notes.filter(n=>!n.judged&&!n.holding&&n.lane===lane&&Math.abs(n.t-time)<=.23);
   if(!candidates.length)return null;
   candidates.sort((a,b)=>Math.abs(a.t-time)-Math.abs(b.t-time));
   const target=candidates[0],delta=Math.abs(target.t-time);
   const result=delta<=.095?'perfect':'good';
   if(target.hold>0){
    target.holding=true;target.pointerId=pointerId;target.startResult=result;
    return {result:'hold',delta,t:target.t,lane,hold:target.hold};
   }
   judge(target,result);
   return {result,delta,t:target.t,lane};
  }
  function release(pointerId,time,cancel=false){
   if(!active||!finite(time))return null;
   const note=notes.find(n=>!n.judged&&n.holding&&n.pointerId===pointerId);
   if(!note)return null;
   if(cancel||time<note.t+note.hold-.11)judge(note,'miss');
   else judge(note,note.startResult);
   return {result:note.result,lane:note.lane};
  }
  function cancelHolds(){for(const n of notes)if(!n.judged&&n.holding)judge(n,'miss')}
  function tap(lane,time){return press(lane,time,'legacy-tap')}
  function end(){if(!active)return;active=false;for(const n of notes)if(!n.judged)judge(n,'miss')}
  function reset(){
   notes.forEach(n=>{n.judged=false;n.result=null;n.holding=false;n.pointerId=null;n.startResult=null});
   combo=0;best=0;score=0;perfect=0;good=0;miss=0;active=true;
  }
  function state(){return {notes,combo,best,score,perfect,good,miss,total:notes.length,done:notes.filter(n=>n.judged).length,active}}
  return Object.freeze({tick,press,release,cancelHolds,tap,end,reset,state});
 }
 function chartFromOnsets(times,level='normal'){
  if(!Array.isArray(times)||times.length<4)throw Error('音声の変化を十分に検出できません');
  const gap=level==='easy'?.42:level==='hard'?.13:.23;
  const notes=[];let last=-1;
  for(const raw of times){
   const t=Math.round(Number(raw)*1000)/1000;
   if(!finite(t)||t<.15||t-last<gap)continue;
   const n=notes.length;
   const lane=level==='easy'?(1+n%2):((n*7+Math.floor(n/4))%4);
   notes.push({t,lane});last=t;
  }
  if(notes.length<4)throw Error('有効なノーツが少なすぎます');
  return notes;
 }
 // Only create long notes where actual decoded audio remains sustained and
 // the next measured onset leaves enough room. Never invent timed grid holds.
 function addHoldsFromWaveform(buffer,notes,rawOnsets=null){
  if(!buffer||!finite(buffer.sampleRate)||!Array.isArray(notes)||typeof buffer.getChannelData!=='function')return notes;
  const sr=buffer.sampleRate,channels=Math.max(1,Math.min(2,buffer.numberOfChannels||1));
  const waves=[];for(let c=0;c<channels;c++)waves.push(buffer.getChannelData(c));
  function rms(a,b){
   const step=Math.max(1,Math.floor(sr/3000));
   const start=Math.max(0,Math.floor(a*sr)),end=Math.min(waves[0].length,Math.floor(b*sr));
   let sum=0,count=0;
   for(let i=start;i<end;i+=step){
    let sample=0;for(let c=0;c<channels;c++)sample+=waves[c][i]/channels;
    sum+=sample*sample;count++;
   }
   return count?Math.sqrt(sum/count):0;
  }
  return notes.map((n,i)=>{
   const gap=(i+1<notes.length?notes[i+1].t:buffer.duration)-n.t;
   if(gap<.78)return n;
   // Keep the hold's end before the next REAL detected attack, even if
   // that attack was removed from the beginner chart.
   const reference=Array.isArray(rawOnsets)?rawOnsets:notes.map(x=>x.t);
   let nextAttack=Infinity;
   for(const t of reference)if(t>n.t+.20)nextAttack=Math.min(nextAttack,t);
   const candidate=Math.min(1.2,gap-.22,nextAttack-n.t-.16);
   if(candidate<.58)return n;
   const attack=rms(n.t+.04,n.t+.16),sustain=rms(n.t+.37,n.t+.56);
   if(attack<.01||sustain<Math.max(.012,attack*.26))return n;
   return {...n,hold:Math.round(candidate*100)/100};
  });
 }
 return Object.freeze({prepare,engine,chartFromOnsets,addHoldsFromWaveform});
});
