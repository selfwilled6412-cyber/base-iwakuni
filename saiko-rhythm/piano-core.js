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
   const t=Number(n.t),lane=Number(n.lane);
   if(!finite(t)||t<0||t<last||!Number.isInteger(lane)||lane<0||lane>3)throw Error('譜面データが正しくありません');
   last=t;
   return {t,lane,id:i,judged:false,result:null};
  });
 }
 function engine(raw){
  let notes=prepare(raw),combo=0,best=0,score=0,perfect=0,good=0,miss=0,active=true;
  function judge(note,result){
   if(note.judged)return false;
   note.judged=true;note.result=result;
   if(result==='miss'){combo=0;miss++}
   else{combo++;best=Math.max(best,combo);
    if(result==='perfect'){perfect++;score+=1000+Math.min(combo,200)*5}
    else{good++;score+=500+Math.min(combo,200)*2}
   }
   return true;
  }
  function tick(time){
   if(!finite(time))return;
   for(const n of notes)if(!n.judged&&time>n.t+.23)judge(n,'miss');
  }
  function tap(lane,time){
   if(!active||!Number.isInteger(lane)||lane<0||lane>3||!finite(time))return null;
   tick(time);
   const candidates=notes.filter(n=>!n.judged&&n.lane===lane&&Math.abs(n.t-time)<=.23);
   if(!candidates.length)return null;
   candidates.sort((a,b)=>Math.abs(a.t-time)-Math.abs(b.t-time));
   const target=candidates[0],delta=Math.abs(target.t-time);
   const result=delta<=.095?'perfect':'good';
   judge(target,result);
   return {result,delta,t:target.t,lane};
  }
  function end(){active=false;for(const n of notes)if(!n.judged)judge(n,'miss')}
  function reset(){notes.forEach(n=>{n.judged=false;n.result=null});combo=0;best=0;score=0;perfect=0;good=0;miss=0;active=true}
  function state(){return {notes,combo,best,score,perfect,good,miss,total:notes.length,done:notes.filter(n=>n.judged).length,active}}
  return Object.freeze({tick,tap,end,reset,state});
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
 return Object.freeze({prepare,engine,chartFromOnsets});
});
