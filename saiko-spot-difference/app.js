(()=>{'use strict';
 const core=window.SaikoSpotCore;
 const $=id=>document.getElementById(id);
 if(!core){$('picker').textContent='ゲームデータを読み込めませんでした。ページを再読み込みしてください。';return}
 const KEY='saiko-spot-difference-v1';
 const record={completed:{easy:[],normal:[],hard:[]},visited:{easy:[],normal:[],hard:[]}};
 try{
  const old=JSON.parse(localStorage.getItem(KEY)||'null');
  if(old&&typeof old==='object')for(const kind of ['completed','visited'])for(const level of ['easy','normal','hard']){
   const values=old[kind]?.[level];
   if(Array.isArray(values))record[kind][level]=[...new Set(values.filter(v=>Number.isInteger(v)&&v>=0&&v<30))];
  }
 }catch(e){}
 let level=null,puzzle=null,found=new Set(),wrong=0,hints=0,startTime=0,finished=false,focusHint=-1;
 let clock=null,zoomed=false,sideBySide=false,fullShowing=false;
 function save(){try{localStorage.setItem(KEY,JSON.stringify(record))}catch(e){}}
 function countLabel(level){const n=record.completed[level].length;return n===30?'🏆 全30問クリア！':n+' / 30問クリア'}
 function refreshPicker(){
  $('doneEasy').textContent=countLabel('easy');
  $('doneNormal').textContent=countLabel('normal');
  $('doneHard').textContent=countLabel('hard');
 }
 function formatClock(ms){const s=Math.max(0,Math.floor(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
 function updateHud(){
  $('found').textContent=found.size+' / '+puzzle.count;
  $('remaining').textContent=String(puzzle.count-found.size);
  $('miss').textContent=String(wrong);
  $('progress').style.width=(found.size/puzzle.count*100)+'%';
  $('progress').setAttribute('aria-valuenow',String(Math.round(found.size/puzzle.count*100)));
  $('elapsed').textContent=formatClock(performance.now()-startTime);
 }
 function render(){
  $('leftPicture').innerHTML=core.render(puzzle,'left',[...found],focusHint);
  $('rightPicture').innerHTML=core.render(puzzle,'right',[...found],focusHint);
  updateHud();
 }
 function next(){
  if(!level)return;
  let unused=Array.from({length:30},(_,i)=>i).filter(i=>!record.visited[level].includes(i));
  if(unused.length===0){
   record.visited[level]=[];
   unused=Array.from({length:30},(_,i)=>i);
  }
  const index=unused[Math.floor(Math.random()*unused.length)];
  record.visited[level].push(index);
  save();
  puzzle=core.makePuzzle(level,index);
  found=new Set();wrong=0;hints=0;focusHint=-1;finished=false;startTime=performance.now();
  $('result').hidden=true;
  $('hint').disabled=false;
  $('questionTitle').textContent=core.LEVELS.find(x=>x.id===level).name+'｜第'+(index+1)+'問「'+puzzle.theme[0]+'」';
  $('message').textContent=puzzle.count+'か所のちがいを見つけよう！ 左右どちらをタップしてもOK';
  $('picker').hidden=true;$('play').hidden=false;
  render();
  // Keep scroll zoom position aligned when switching questions.
  $('boardLeft').scrollLeft=0;$('boardRight').scrollLeft=0;
  $('boardLeft').scrollTop=0;$('boardRight').scrollTop=0;
  if(clock)clearInterval(clock);
  clock=setInterval(()=>{if(!finished&&puzzle)updateHud()},1000);
  $('play').scrollIntoView({block:'start'});
 }
 function start(nextLevel){
  if(!core.LEVELS.some(x=>x.id===nextLevel))return;
  level=nextLevel;next();
 }
 function mark(slot){
  if(!puzzle||finished)return;
  if(!Number.isInteger(slot)||slot<0||slot>=core.OBJECTS)return;
  if(found.has(slot)){
   $('message').textContent='✅ そこはもう見つけているよ！';
   return;
  }
  if(!puzzle.spots.includes(slot)){
   wrong++;
   $('message').textContent='もう少し！ 👀 よーく見比べてみよう';
   updateHud();
   return;
  }
  found.add(slot);
  focusHint=-1;
  $('message').textContent='🌟 正解！ '+found.size+' / '+puzzle.count+'か所みつけた！';
  render();
  if(found.size===puzzle.count)complete();
 }
 function complete(){
  if(!puzzle||finished)return;
  finished=true;
  if(clock)clearInterval(clock);
  const took=performance.now()-startTime;
  const completed=record.completed[level];
  if(!completed.includes(puzzle.index))completed.push(puzzle.index);
  save();refreshPicker();
  $('hint').disabled=true;
  $('result').hidden=false;
  $('resultText').textContent=puzzle.count+'か所ぜんぶ発見！ '+formatClock(took)+'／ミスタップ'+wrong+'回／ヒント'+hints+'回。'+
    ' この難易度は'+completed.length+' / 30問クリア！';
  $('message').textContent='🎉 全部見つけた！ おめでとう！';
  $('result').scrollIntoView({behavior:'smooth',block:'nearest'});
 }
 function hint(){
  if(!puzzle||finished)return;
  const remaining=puzzle.spots.filter(n=>!found.has(n));
  if(!remaining.length)return;
  focusHint=remaining[Math.floor(Math.random()*remaining.length)];
  hints++;
  $('message').textContent='💡 しろい点線で、まだ見つけていない場所を示したよ！';
  render();
 }
 function showPicker(){
  level=null;puzzle=null;finished=true;
  if(clock){clearInterval(clock);clock=null}
  $('play').hidden=true;$('picker').hidden=false;
  refreshPicker();window.scrollTo({top:0,behavior:'auto'});
 }
 for(const button of document.querySelectorAll('[data-level]'))button.addEventListener('click',()=>start(button.dataset.level));
 $('home').addEventListener('click',showPicker);
 $('next').addEventListener('click',next);
 $('resultNext').addEventListener('click',next);
 $('hint').addEventListener('click',hint);
 $('zoom').addEventListener('click',()=>{
  zoomed=!zoomed;
  $('compare').classList.toggle('zoomed',zoomed);
  $('zoom').setAttribute('aria-pressed',String(zoomed));
  $('zoom').textContent=zoomed?'🔍 拡大を戻す':'🔍 拡大';
  $('boardLeft').scrollLeft=$('boardRight').scrollLeft=0;
 });
 $('layout').addEventListener('click',()=>{
  sideBySide=!sideBySide;
  $('compare').style.gridTemplateColumns=sideBySide?'repeat(2,minmax(0,1fr))':'';
  $('layout').setAttribute('aria-pressed',String(sideBySide));
  $('layout').textContent=sideBySide?'⇅ 自動配置':'⇄ 横並び';
 });
 $('full').addEventListener('click',()=>{
  if(document.fullscreenElement){document.exitFullscreen?.();return}
  document.getElementById('play').requestFullscreen?.().catch(()=>{
   $('message').textContent='この端末では全画面表示に対応していません';
  });
 });
 for(const side of ['leftPicture','rightPicture']){
  $(side).addEventListener('click',event=>{
   const el=event.target.closest?.('[data-slot]');
   if(el)mark(Number(el.getAttribute('data-slot')));
  });
  $(side).addEventListener('keydown',event=>{
   if(event.key!=='Enter'&&event.key!==' ')return;
   const el=event.target.closest?.('[data-slot]');
   if(el){event.preventDefault();mark(Number(el.getAttribute('data-slot')))}
  });
 }
 let syncing=false;
 for(const [from,to] of [['boardLeft','boardRight'],['boardRight','boardLeft']]){
  $(from).addEventListener('scroll',()=>{
   if(syncing||!zoomed)return;
   syncing=true;$(to).scrollLeft=$(from).scrollLeft;$(to).scrollTop=$(from).scrollTop;syncing=false;
  },{passive:true});
 }
 document.addEventListener('visibilitychange',()=>{
  if(!puzzle||finished)return;
  // Recalculate elapsed only while the game is visible.
  // A hidden tab should not punish a B-type facility participant.
  if(document.hidden){startTime=performance.now()-(Number($('elapsed').textContent.split(':')[0])*60+Number($('elapsed').textContent.split(':')[1]))*1000;}
 });
 refreshPicker();
 // Non-user-facing diagnostics for controlled CI (read-only state).
 window.SaikoSpotGame=Object.freeze({
  getState:()=>({level,puzzleId:puzzle?.id,spots:puzzle?.spots.slice()||[],found:[...found],wrong,hints,finished,
   seen:level?record.visited[level].slice():[],completed:level?record.completed[level].slice():[]}),
  open:start,selectSlot:mark,next,hint
 });
})();
