(() => {
'use strict';
const $=id=>document.getElementById(id);
const SIZE={easy:9,normal:13,hard:17},GEMS={easy:1,normal:2,hard:3},LABEL={easy:'🌱 初級',normal:'🧭 中級',hard:'🐉 上級'};
const TOTAL=10,KEY='saiko-treasure-adventure-v1',STAGE_SEED={easy:17,normal:31,hard:53};
const DIRS=[{dx:0,dy:-1,label:'上 ↑'},{dx:1,dy:0,label:'右 →'},{dx:0,dy:1,label:'下 ↓'},{dx:-1,dy:0,label:'左 ←'}];

const WORLDS={
 easy:{name:'🌲 はじまりの森',intro:'ルミと一緒に森の宝石を探そう。'},
 normal:{name:'🌊 ひみつの海底',intro:'海の迷宮に眠る2つの宝石を見つけよう。'},
 hard:{name:'🌌 星の迷宮',intro:'宇宙に散らばった3つの宝石を集めよう。'}
};
const CHAPTERS=[
 ['🗝️ はじめての宝箱','青い光を見つけたよ！ 迷路の奥にある宝石を探そう。'],
 ['🌳 まよいの小道','曲がり角が増えてきたね。通った道を覚えて進もう。'],
 ['🦋 ひかる羽のしるし','羽が道を教えてくれる。遠回りも冒険の一部！'],
 ['🌉 かくされた橋','扉への道はひとつじゃないかも。宝石を先に探そう。'],
 ['🎁 5つ目の宝箱','前半の最後！ 宝石を見つけよう。'],
 ['🔎 ルミのひみつ地図','まだ知らない道があるよ。行き止まりも手がかり。'],
 ['🐾 ふしぎな足あと','足あとを追うと宝石の場所がわかるかも。'],
 ['🌠 流れ星の願い','キラキラ光る宝石を集めて出口を探そう。'],
 ['🔒 最後の試練','あせらず落ち着いて考えてみよう。'],
 ['👑 宝の王国・最終決戦','最後の部屋！ 全部の宝石を集めよう。']
];

function confettiBurst(){
 const box=$('confetti');
 if(!box)return;
 box.replaceChildren();
 const colors=['#ffca41','#47bce5','#fa7cae','#91df87','#d1a6fa'];
 for(let i=0;i<30;i++){
  const piece=document.createElement('i');
  piece.style.setProperty('--confetti',colors[i%colors.length]);
  piece.style.setProperty('--left',(i*37%100)+'%');
  piece.style.setProperty('--turn',((i*71)%360)+'deg');
  piece.style.setProperty('--delay',((i%9)*.09)+'s');
  piece.style.setProperty('--duration',(1.4+(i%7)*.16)+'s');
  box.append(piece);
 }
}
function rankFor(total){
 if(total>=80)return '👑 レジェンド探検王';
 if(total>=60)return '🏆 宝石マスター';
 if(total>=35)return '💎 ベテラン探検家';
 if(total>=12)return '🧭 いっちょまえ探検家';
 return '🎒 探検見習い';
}

const canvas=$('maze'),ctx=canvas.getContext('2d');
const courseData=()=>({unlocked:0,bests:Array(TOTAL).fill(0),run:null});
const fresh=()=>({easy:courseData(),normal:courseData(),hard:courseData()});
let progress=fresh(),level=null,stage=0,maze=null,player=[1,1],collected=new Set(),moves=0,hintTiles=[],won=false,swipeStart=null;
function safeLevel(v){return Object.prototype.hasOwnProperty.call(SIZE,v)?v:'easy'}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function key(x,y){return x+','+y}
function seededRng(seed){let x=(seed|0)||-1640531527;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}}
function shuffle(a,rng){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function gridAt(grid,x,y){return !!(grid[y]&&grid[y][x]===0)}
function neighbors(grid,p){
 return DIRS.map(d=>[p[0]+d.dx,p[1]+d.dy]).filter(v=>gridAt(grid,v[0],v[1]));
}
function shortestPath(grid,start,target){
 const sk=key(...start),tk=key(...target);
 if(sk===tk)return [start];
 const queue=[start],parents=new Map([[sk,null]]),lookup=new Map([[sk,start]]);
 for(let head=0;head<queue.length;head++){
  const cur=queue[head];
  for(const next of neighbors(grid,cur)){
   const id=key(...next);if(parents.has(id))continue;
   parents.set(id,key(...cur));lookup.set(id,next);
   if(id===tk){const result=[];let node=id;while(node!==null){result.push(lookup.get(node));node=parents.get(node)}return result.reverse();}
   queue.push(next);
  }
 }
 return [];
}
function makeMaze(lvl,stageIndex){
 lvl=safeLevel(lvl);const n=SIZE[lvl],grid=Array.from({length:n},()=>Array(n).fill(1));
 const rng=seededRng(92173+STAGE_SEED[lvl]*4231+stageIndex*117727);
 const stack=[[1,1]];grid[1][1]=0;
 while(stack.length){
  const [x,y]=stack[stack.length-1];
  const choices=[[0,-2],[2,0],[0,2],[-2,0]].filter(([dx,dy])=>{
   const xx=x+dx,yy=y+dy;return xx>=1&&xx<n-1&&yy>=1&&yy<n-1&&grid[yy][xx]===1;
  });
  if(!choices.length){stack.pop();continue;}
  const [dx,dy]=choices[Math.floor(rng()*choices.length)];
  grid[y+dy/2][x+dx/2]=0;grid[y+dy][x+dx]=0;stack.push([x+dx,y+dy]);
 }
 const start=[1,1],exit=[n-2,n-2];
 // Choose gem locations on open floor, away from the start/exit and from one another.
 const all=[];
 for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++)if(grid[y][x]===0&&key(x,y)!==key(...start)&&key(x,y)!==key(...exit)){
  const d=shortestPath(grid,start,[x,y]).length-1;all.push({x,y,d});
 }
 const candidates=all.filter(v=>v.d>=Math.max(3,Math.floor(n*.55)));
 const source=candidates.length>=GEMS[lvl]?candidates:all;
 const selected=[];
 for(let i=0;i<GEMS[lvl];i++){
  let best=null,score=-Infinity;
  for(const item of source){
   if(selected.some(a=>a.x===item.x&&a.y===item.y))continue;
   const separation=selected.length?Math.min(...selected.map(v=>shortestPath(grid,[v.x,v.y],[item.x,item.y]).length-1)):item.d;
   const value=item.d*.6+separation*1.2+rng()*.14;
   if(value>score){best=item;score=value;}
  }
  if(best)selected.push(best);
 }
 return {n,grid,start,exit,gems:selected.map(({x,y})=>[x,y]),seed:stageIndex};
}
function minRoute(m){
 const targets=m.gems;
 function permute(items){if(items.length===0)return [[]];return items.flatMap((v,i)=>permute(items.filter((_,j)=>j!==i)).map(p=>[v,...p]));}
 let best=Infinity;
 for(const order of permute(targets)){
  const stops=[m.start,...order,m.exit];let distance=0;
  for(let i=1;i<stops.length;i++)distance+=shortestPath(m.grid,stops[i-1],stops[i]).length-1;
  best=Math.min(best,distance);
 }
 return best;
}
function restore(){
 try{
  const data=JSON.parse(localStorage.getItem(KEY)||'null');if(!data||typeof data!=='object')return;
  for(const lvl of Object.keys(SIZE)){
   const source=data[lvl];if(!source||typeof source!=='object')continue;
   const p=courseData();
   if(Array.isArray(source.bests)&&source.bests.length===TOTAL)
    p.bests=source.bests.map(v=>Number.isInteger(v)?clamp(v,0,3):0);
   const opened=p.bests.reduce((acc,n,i)=>n>0?Math.max(acc,i+1):acc,0);
   p.unlocked=clamp(Number.isInteger(source.unlocked)?Math.max(source.unlocked,opened):opened,0,TOTAL-1);
   const run=source.run;
   if(run&&Number.isInteger(run.stage)&&run.stage>=0&&run.stage<TOTAL&&
      Array.isArray(run.player)&&run.player.length===2&&run.player.every(Number.isInteger)&&
      Array.isArray(run.collected)&&run.collected.length<=GEMS[lvl]&&
      Number.isInteger(run.moves)&&run.moves>=0&&run.moves<100000){
    const m=makeMaze(lvl,run.stage);
    if(gridAt(m.grid,run.player[0],run.player[1])&&
      run.collected.every(v=>typeof v==='string'&&m.gems.some(g=>key(...g)===v)))
      p.run={stage:run.stage,player:run.player,collected:[...new Set(run.collected)],moves:run.moves};
   }
   progress[lvl]=p;
  }
 }catch(e){/* private mode or unsupported storage */}
}
function persist(){
 if(!level)return;
 if(!won)progress[level].run={stage,player:[...player],collected:[...collected],moves};
 try{localStorage.setItem(KEY,JSON.stringify(progress));}catch(e){}
}
function setStatus(message,warning=false){$('status').textContent=message;$('status').className='notice'+(warning?' warn':'')}
function showProgress(){
 for(const lvl of Object.keys(SIZE)){
  const count=progress[lvl].bests.filter(v=>v>0).length;
  $('progress-'+lvl).textContent=count+' / 10 ステージ クリア'+(count===TOTAL?' 🎉':'');
  $('bar-'+lvl).style.width=count*10+'%';
  const b=document.querySelector('[data-course="'+lvl+'"]');
  if(b)b.textContent=count===TOTAL?'もう一度冒険する ▶':progress[lvl].run?'続きから冒険する ▶':'冒険スタート ▶';
 }
}
function goHome(){
 level=null;won=false;hintTiles=[];
 window.speechSynthesis?.cancel?.();
 $('home').hidden=false;$('play').hidden=true;$('win').hidden=true;
 showProgress();window.scrollTo?.({top:0,behavior:'smooth'});
}
function drawGem(cx,cy,r){
 ctx.save();ctx.translate(cx,cy);ctx.shadowColor='#53dfff';ctx.shadowBlur=r*.8;
 ctx.fillStyle='#5eecff';ctx.strokeStyle='#067baf';ctx.lineWidth=Math.max(2,r*.1);
 ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*.8,-r*.27);ctx.lineTo(r*.5,r*.65);ctx.lineTo(0,r);ctx.lineTo(-r*.5,r*.65);ctx.lineTo(-r*.8,-r*.27);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(0,r);ctx.moveTo(-r*.8,-r*.27);ctx.lineTo(r*.8,-r*.27);ctx.lineTo(0,r);ctx.strokeStyle='#ffffffba';ctx.lineWidth=2;ctx.stroke();ctx.restore();
}
function draw(){
 if(!maze)return;
 const n=maze.n,tile=720/n;ctx.clearRect(0,0,720,720);
 const gemKeys=new Set(maze.gems.map(g=>key(...g)));
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const px=x*tile,py=y*tile;
  if(maze.grid[y][x]){
   ctx.fillStyle=(x+y)%2?'#294a86':'#31528d';ctx.fillRect(px,py,tile+1,tile+1);
   ctx.fillStyle='#5481b855';ctx.fillRect(px+tile*.10,py+tile*.08,tile*.80,tile*.17);
  }else{
   ctx.fillStyle=(x+y)%2?'#effbff':'#e2f4ff';ctx.fillRect(px,py,tile+1,tile+1);
   ctx.fillStyle='#adcde955';ctx.fillRect(px+tile*.08,py+tile*.82,tile*.8,tile*.09);
  }
 }
 for(const p of hintTiles.slice(1,6)){
  ctx.fillStyle='#ffda59a1';ctx.beginPath();ctx.arc((p[0]+.5)*tile,(p[1]+.5)*tile,tile*.22,0,Math.PI*2);ctx.fill();
 }
 const ex=(maze.exit[0]+.5)*tile,ey=(maze.exit[1]+.5)*tile,unlocked=collected.size===maze.gems.length;
 ctx.save();ctx.translate(ex,ey);
 ctx.fillStyle=unlocked?'#27aa78':'#dd8d6c';ctx.strokeStyle=unlocked?'#087651':'#904831';ctx.lineWidth=3;
 ctx.beginPath();ctx.roundRect(-tile*.28,-tile*.34,tile*.56,tile*.68,tile*.1);ctx.fill();ctx.stroke();
 ctx.fillStyle='#ffeaa8';ctx.beginPath();ctx.arc(tile*.14,0,tile*.06,0,Math.PI*2);ctx.fill();
 ctx.font=tile*.38+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(unlocked?'🚪':'🔒',0,0);ctx.restore();
 for(const gem of maze.gems){if(!collected.has(key(...gem)))drawGem((gem[0]+.5)*tile,(gem[1]+.5)*tile,tile*.32)}
 const x=(player[0]+.5)*tile,y=(player[1]+.5)*tile;
 ctx.save();ctx.shadowColor='#102b6e99';ctx.shadowBlur=tile*.25;
 ctx.fillStyle='#ffe4a3';ctx.strokeStyle='#ffb536';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,tile*.42,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=Math.floor(tile*.68)+'px system-ui,"Apple Color Emoji","Segoe UI Emoji"';ctx.fillText('🐱',x,y+1);
 canvas.setAttribute('aria-label','迷路'+n+'×'+n+'。現在の位置は左から'+(player[0]+1)+'列、上から'+(player[1]+1)+'行。宝石'+collected.size+'個取得済み。');
}
function updateInfo(){
 $('stageTitle').textContent='🗺️ ステージ '+(stage+1)+' / '+TOTAL;
 const chapter=CHAPTERS[stage],world=WORLDS[level];
 $('storyTitle').textContent=world.name+'｜'+chapter[0];
 $('storyText').textContent=chapter[1];
 $('levelLabel').textContent=LABEL[level];
 $('gemCount').textContent='💎 '+collected.size+' / '+maze.gems.length+' 個';
 $('moveCount').textContent='👣 '+moves+' 歩';
 $('goalState').textContent=collected.size===maze.gems.length?'🟢 扉が開いた！ ゴールへ！':'🔒 宝石を全部集めよう';
 $('achievement').textContent='このコースの星：'+progress[level].bests.reduce((a,b)=>a+b,0)+' / 30 ⭐';
 const totalStars=Object.values(progress).reduce((sum,p)=>sum+p.bests.reduce((a,b)=>a+b,0),0);
 $('rank').textContent=rankFor(totalStars)+'｜合計 '+totalStars+' / 90 ⭐';
 const root=$('stageList');root.replaceChildren();
 for(let i=0;i<TOTAL;i++){
  const b=document.createElement('button');b.type='button';b.className='stageBtn'+(progress[level].bests[i]?' done':'')+(stage===i?' current':'');
  b.textContent=String(i+1)+(progress[level].bests[i]?' ★':'');
  b.disabled=i>progress[level].unlocked;
  b.setAttribute('aria-label','ステージ'+(i+1)+(b.disabled?'、未解放':progress[level].bests[i]?'、クリア済み':'、挑戦可能'));
  b.addEventListener('click',()=>{if(i===stage)return;startStage(level,i,false)});
  root.append(b);
 }
 draw();
}
function startStage(lvl,index,useSaved){
 lvl=safeLevel(lvl);index=clamp(index,0,TOTAL-1);
 if(index>progress[lvl].unlocked)return;
 level=lvl;stage=index;maze=makeMaze(level,stage);won=false;hintTiles=[];
 player=[...maze.start];collected=new Set();moves=0;
 const run=progress[level].run;
 if(useSaved&&run&&run.stage===stage){
  player=[...run.player];collected=new Set(run.collected);moves=run.moves;
 }
 $('home').hidden=true;$('play').hidden=false;$('win').hidden=true;$('hint').hidden=true;
 setStatus('💎 '+CHAPTERS[stage][0]+'！ '+WORLDS[level].intro);
 updateInfo();persist();
 window.scrollTo?.({top:0,behavior:'smooth'});
}
function openCourse(lvl){
 lvl=safeLevel(lvl);
 const p=progress[lvl];
 const st=p.run?.stage??Math.min(p.unlocked,TOTAL-1);
 startStage(lvl,st,true);
}
function move(dx,dy){
 if(!maze||won||$('play').hidden||!$('win').hidden)return;
 const nx=player[0]+dx,ny=player[1]+dy;
 if(!gridAt(maze.grid,nx,ny)){setStatus('🧱 ここは壁だよ。別の道を探そう！',true);return}
 player=[nx,ny];moves++;hintTiles=[];$('hint').hidden=true;
 const id=key(nx,ny);
 if(maze.gems.some(g=>key(...g)===id)&&!collected.has(id)){collected.add(id);setStatus('💎 宝石をゲット！ あと'+(maze.gems.length-collected.size)+'個！');}
 else if(id===key(...maze.exit)&&collected.size!==maze.gems.length){setStatus('🔒 扉はまだ閉まっているよ。宝石を全部集めよう！',true);}
 else if(collected.size===maze.gems.length)setStatus('🚪 扉が開いているよ。ゴールを目指そう！');
 else setStatus('👣 その調子！ 宝石を見つけよう。');
 if(id===key(...maze.exit)&&collected.size===maze.gems.length){finishStage();return}
 updateInfo();persist();
}
function finishStage(){
 won=true;hintTiles=[];
 const baseline=minRoute(maze),stars=moves<=Math.ceil(baseline*1.2)?3:moves<=Math.ceil(baseline*1.65)?2:1;
 const p=progress[level];p.bests[stage]=Math.max(p.bests[stage],stars);p.unlocked=Math.max(p.unlocked,Math.min(TOTAL-1,stage+1));p.run=null;
 try{localStorage.setItem(KEY,JSON.stringify(progress))}catch(e){}
 updateInfo();
 $('winStars').textContent='⭐'.repeat(stars)+'☆'.repeat(3-stars);
 $('winTitle').textContent=stage===TOTAL-1?'🎉 コース完走！':'🎉 ステージクリア！';
 $('winMessage').textContent='宝石'+maze.gems.length+'個を集めて、'+moves+'歩でゴール！ '+(stage===TOTAL-1?'👑 '+WORLDS[level].name+'を冒険しきったよ！':'✨ '+CHAPTERS[stage][0]+'を突破！ 次の冒険へ進もう。');
 confettiBurst();
 $('nextBtn').textContent=stage===TOTAL-1?'🏠 コース選択へ':'次のステージへ ▶';
 $('win').hidden=false;
 $('nextBtn').focus();
}
function hint(){
 if(!maze||won)return;
 const targets=maze.gems.filter(g=>!collected.has(key(...g)));
 const target=targets.length?targets.map(g=>({g,path:shortestPath(maze.grid,player,g)})).sort((a,b)=>a.path.length-b.path.length)[0].g:maze.exit;
 const path=shortestPath(maze.grid,player,target);
 if(path.length<2){$('hint').textContent='宝石の位置にいるよ。次の目的地を探してみよう！';$('hint').hidden=false;return}
 const dx=path[1][0]-player[0],dy=path[1][1]-player[1];
 const dir=DIRS.find(d=>d.dx===dx&&d.dy===dy);
 hintTiles=path.slice(0,6);
 $('hint').textContent='💡 まず「'+dir.label+'」へ進んでみよう。黄色い丸は、この先のおすすめルート。';
 $('hint').hidden=false;draw();
}
function speakGuide(){
 if(!('speechSynthesis' in window)){setStatus('読み上げに対応していない端末だよ。',true);return}
 window.speechSynthesis.cancel();
 const u=new SpeechSynthesisUtterance('サイ校、宝さがし大冒険！ 方向ボタンや、キーボードの矢印で移動しよう。宝石を全部集めると、ゴールの扉が開くよ。迷ったら、ヒントを押してね。');
 u.lang='ja-JP';u.rate=.86;window.speechSynthesis.speak(u);
}
function resetStage(){
 if(!level||!window.confirm('このステージを最初からやり直す？ クリア済みの星は消えないよ。'))return;
 progress[level].run=null;startStage(level,stage,false);
}
function resetCourse(){
 if(!level||!window.confirm(LABEL[level]+'の10ステージの記録を全部消す？ ほかの難易度の記録は消えないよ。'))return;
 progress[level]=courseData();startStage(level,0,false);
}
restore();showProgress();
document.querySelectorAll('[data-course]').forEach(b=>b.addEventListener('click',()=>openCourse(b.dataset.course)));
$('homeBtn').onclick=goHome;$('winHomeBtn').onclick=goHome;
$('up').onclick=()=>move(0,-1);$('right').onclick=()=>move(1,0);$('down').onclick=()=>move(0,1);$('left').onclick=()=>move(-1,0);
$('hintBtn').onclick=hint;$('readBtn').onclick=speakGuide;$('resetBtn').onclick=resetStage;$('resetAllBtn').onclick=resetCourse;
$('nextBtn').onclick=()=>{if(!won)return;if(stage===TOTAL-1){goHome();return}startStage(level,stage+1,false)};
document.addEventListener('keydown',e=>{
 if(!level||$('play').hidden||!$('win').hidden)return;
 if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
 const k=e.key.toLowerCase(),d={
  arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]
 }[k];
 if(d){e.preventDefault();move(...d)}
});
canvas.addEventListener('pointerdown',e=>{swipeStart={x:e.clientX,y:e.clientY};try{canvas.setPointerCapture(e.pointerId)}catch(err){}});
canvas.addEventListener('pointerup',e=>{
 if(!swipeStart)return;
 const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;swipeStart=null;
 if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;
 if(Math.abs(dx)>Math.abs(dy))move(Math.sign(dx),0);else move(0,Math.sign(dy));
 try{canvas.releasePointerCapture(e.pointerId)}catch(err){}
});
canvas.addEventListener('pointercancel',()=>{swipeStart=null});
})();