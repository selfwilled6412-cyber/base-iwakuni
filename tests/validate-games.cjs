#!/usr/bin/env node
'use strict';
// Self-contained public CI checks; no external packages, secrets or network.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const jsFiles=['saiko-adventure/app.js','saiko-kids/app.js','saiko-draw/app.js','lumi-nazotoki/index.html'];
for(const f of jsFiles){
 const source=read(f);
 if(f.endsWith('.js'))new vm.Script(source,{filename:f});
 assert(source.length>1000,'Empty or truncated '+f);
}
function fakeNode(id){
 const e={id,hidden:false,textContent:'',innerHTML:'',className:'',dataset:{},children:[],style:{setProperty(){}},parentElement:{prepend(){}},disabled:false,
  classList:{add(){},remove(){},toggle(){}},setAttribute(){},append(...v){this.children.push(...v)},replaceChildren(){this.children=[]},
  addEventListener(name,fn){this['on'+name]=fn},focus(){},click(){this.onclick?.()}};
 return e;
}
function makeHarness(script,kind){
 const nodes=new Map();
 const get=id=>nodes.get(id)||(nodes.set(id,fakeNode(id)),nodes.get(id));
 const progressStore={data:{},getItem(k){return this.data[k]||null},setItem(k,v){this.data[k]=String(v)},removeItem(k){delete this.data[k]}};
 const w={scrollTo(){},setTimeout(cb){cb()},confirm(){return true},speechSynthesis:{cancel(){},speak(){}}};
 let doc;
 if(kind==='adventure'){
  get('play').hidden=true;get('win').hidden=true;
  get('maze').getContext=()=>new Proxy({},{get(){return ()=>{}}});
  const course=['easy','normal','hard'].map(name=>{const b=fakeNode('course');b.dataset.course=name;return b});
  doc={getElementById:get,querySelector:s=>course.find(b=>s.includes(b.dataset.course)),
   querySelectorAll:s=>s==='[data-course]'?course:[],createElement:fakeNode,body:{append(){}},addEventListener(){},activeElement:null};
  script=script.replace(/\}\)\(\);\s*$/,"window.__qa={makeMaze,shortestPath,startStage,move,getMaze:()=>maze,getPlayer:()=>player,getCollected:()=>collected,getWon:()=>won,getProgress:()=>progress};})();");
 }else{
  const levels=['easy','normal','hard'].map(name=>{const b=fakeNode('level');b.dataset.level=name;return b});
  const modes=['memory','spot','puzzle'].map(name=>{const b=fakeNode('mode');b.dataset.open=name;return b});
  doc={getElementById:get,querySelectorAll:s=>s==='.diff'?levels:s==='[data-open]'?modes:[],createElement:fakeNode};
  script=script.replace(/\}\)\(\);\s*$/,"window.__qa={start,setLevel:l=>difficulty=l,getGame:()=>game,getCycles:()=>puzzleCycles};})();");
 }
 const sandbox={window:w,document:doc,localStorage:progressStore,sessionStorage:progressStore,
  SpeechSynthesisUtterance:function(){},URL:{createObjectURL(){return 'blob:fake'},revokeObjectURL(){}},Blob:function(){},console};
 vm.runInNewContext(script,sandbox,{timeout:10000});
 return {qa:w.__qa,store:progressStore,get};
}
const adventure=makeHarness(read('saiko-adventure/app.js'),'adventure');
let stages=0,steps=0;
for(const lvl of ['easy','normal','hard']){
 const fingerprints=new Set();
 for(let i=0;i<10;i++){
  adventure.qa.startStage(lvl,i,false);
  const m=adventure.qa.getMaze();
  fingerprints.add(m.grid.map(row=>row.join('')).join('')+m.gems.flat().join('-'));
  assert.equal(m.gems.length,{easy:1,normal:2,hard:3}[lvl]);
  for(const target of [...m.gems,m.exit]){
   if(adventure.qa.getCollected().has(target.join(',')))continue;
   const route=adventure.qa.shortestPath(m.grid,adventure.qa.getPlayer(),target);
   assert(route.length>0,'No route '+lvl+'/'+i);
   for(let j=1;j<route.length;j++){
    const pos=adventure.qa.getPlayer(),next=route[j];
    adventure.qa.move(next[0]-pos[0],next[1]-pos[1]);steps++;
   }
  }
  assert.equal(adventure.qa.getWon(),true,'Unsolvable adventure '+lvl+'/'+i);
  assert(adventure.qa.getProgress()[lvl].bests[i]>0);
  stages++;
 }
 assert.equal(fingerprints.size,10,'Repeated maze in '+lvl);
}
const kids=makeHarness(read('saiko-kids/app.js'),'kids');
for(const lvl of ['easy','normal','hard']){
 kids.qa.setLevel(lvl);
 kids.qa.start('memory');
 const cards=kids.qa.getGame().deck;
 assert.equal(cards.length,{easy:8,normal:12,hard:16}[lvl]);
 const counts=new Map();cards.forEach(c=>counts.set(c.value,(counts.get(c.value)||0)+1));
 assert([...counts.values()].every(n=>n===2));
 kids.qa.start('spot');
 assert.equal(kids.qa.getGame().active.length,{easy:3,normal:4,hard:6}[lvl]);
 const titles=[];
 for(let i=0;i<4;i++){
  kids.qa.start('puzzle');
  titles.push(...kids.qa.getGame().questions.map(q=>{
   assert(q.choices.includes(q.answer));
   assert.equal(new Set(q.choices).size,q.choices.length);
   return q.title;
  }));
 }
 assert.equal(titles.length,10,'Puzzle draw count incorrect');
 assert.equal(new Set(titles).size,10,'Repeated question in '+lvl);
}
const main=read('lumi-nazotoki/index.html');
const start=main.indexOf('const QUESTIONS=')+'const QUESTIONS='.length,end=main.indexOf('];',start)+1;
assert(start>='const QUESTIONS='.length);
const bank=JSON.parse(main.slice(start,end));
assert.equal(bank.length,150);
assert.equal(new Set(bank.map(q=>q.key)).size,150);
for(const lvl of [2,3,5])assert.equal(bank.filter(q=>q.level===lvl).length,50);
assert(bank.every(q=>!q.stage.includes('{n//2+1}')&&!q.stage.includes('join(names)')));
const staffHTML=read('lumi-nazotoki/staff.html');
const staffStart=staffHTML.indexOf('const Q=')+'const Q='.length;
const staffEnd=staffHTML.indexOf('];',staffStart)+1;
const staffBank=JSON.parse(staffHTML.slice(staffStart,staffEnd));
assert.equal(staffBank.length,150);
assert.deepEqual(new Set(staffBank.map(q=>q.key)),new Set(bank.map(q=>q.key)));
for(const q of staffBank)assert.equal(q.hints.length,3);
for(const path of ['lumi-escape/index.html','lumi-escape-2/index.html']){
 const raw=read(path),match=raw.match(/<script>([\s\S]*?)<\/script>/);
 assert(match,'Missing escape script '+path);new vm.Script(match[1],{filename:path});
 const a=raw.indexOf('const CASES=')+'const CASES='.length,b=raw.indexOf(';const K=',a);
 const cases=JSON.parse(raw.slice(a,b));assert.equal(cases.length,50,path);
 for(const p of cases){assert(p.answer,'Missing answer '+p.name);assert.equal(p.hints.length,3);}
 const staff=read(path.replace('index.html','staff.html'));
 assert.equal((staff.match(/<article class="case"/g)||[]).length,50,'Staff guide mismatch '+path);
}

for(const file of ['lumi-escape/index.html','lumi-escape-2/index.html']){
 const raw=read(file),script=raw.match(/<script>([\s\S]*?)<\/script>/)[1];
 const elements=new Map();
 function elem(id){return{id,hidden:false,innerHTML:'',textContent:'',className:'',disabled:false,children:[],onclick:null,
  append(c){this.children.push(c)},addEventListener(){}};}
 const by=id=>elements.get(id)||(elements.set(id,elem(id)),elements.get(id));
 const d={getElementById:by,createElement:elem,addEventListener(){}};
 const save={data:{},getItem(k){return this.data[k]||null},setItem(k,v){this.data[k]=v},removeItem(k){delete this.data[k]}};
 const w={};const source=script.replace(/document\.addEventListener\('keydown'/,
  "window.__qa={start,getStep:()=>step,getHint:()=>hint,getShown:()=>shown};document.addEventListener('keydown'");
 const sandbox={window:w,document:d,localStorage:save,confirm(){return true}};
 new vm.Script(source,{filename:file}).runInNewContext(vm.createContext(sandbox),{timeout:10000});
 assert.equal(by('chapterPicker').children.length,10);
 by('chapterPicker').children[9].onclick();assert.equal(w.__qa.getStep(),45);
 w.__qa.start(0);
 for(let index=0;index<50;index++){
  assert.equal(w.__qa.getStep(),index);
  by('hintBtn').onclick();assert.equal(w.__qa.getHint(),1);
  by('revealBtn').onclick();assert.equal(w.__qa.getShown(),true);
  by('next').onclick();
 }
 assert(by('game').innerHTML.includes('脱出成功'));
}
const appHub=read('saiko-apps/index.html');
for(const href of ['../lumi-nazotoki/','../lumi-escape/','../lumi-escape-2/','../saiko-adventure/','../saiko-kids/','../saiko-draw/','guide.html']){
 assert(appHub.includes('href="'+href+'"'),'Missing hub link '+href);
}
const playCards=(appHub.match(/<article class="card"[^>]*data-play="(group|solo)"/g)||[]);
const allCards=(appHub.match(/<article class="card"/g)||[]);
assert.equal(playCards.length,allCards.length,'Every app card needs group or solo mode');
assert(playCards.some(x=>x.includes('group'))&&playCards.some(x=>x.includes('solo')));
assert(appHub.includes('data-play-filter="group"')&&appHub.includes('data-play-filter="solo"')&&appHub.includes('data-play-filter="all"'));
assert(appHub.includes("const matchPlay="),'Group/solo selection not wired to card filter');
const hubJS=appHub.match(/<script>([\s\S]*?)<\/script>/)?.[1];assert(hubJS,'App hub script missing');
new vm.Script(hubJS,{filename:'saiko-apps/index.html'});
for(const target of ['saiko-adventure/index.html','saiko-adventure/app.js','saiko-kids/index.html','saiko-kids/app.js','saiko-draw/index.html','saiko-draw/app.js','saiko-apps/guide.html']){
 assert(fs.existsSync(path.join(root,target)),'Missing public file '+target);
}
function suiteHarness(file,expose){
 const elements=new Map();
 function node(id){return {id,hidden:false,innerHTML:'',textContent:'',style:{},children:[],value:'',dataset:{},disabled:false,
  append(){},replaceChildren(){this.children=[]},addEventListener(){},setAttribute(){},querySelector(){return node('child')},querySelectorAll(){return []}};}
 const $=id=>elements.get(id)||(elements.set(id,node(id)),elements.get(id));
 const d={getElementById:$,querySelectorAll(){return []},querySelector(){return node('child')},addEventListener(){}};
 const w={scrollTo(){},print(){},fullscreenElement:null};
 const storage={getItem(){return null},setItem(){},removeItem(){}};
 const code=read(file).replace(/\}\)\(\);\s*$/,expose);
 new vm.Script(code,{filename:file}).runInNewContext(vm.createContext({
   document:d,window:w,localStorage:storage,performance:{now(){return 1000}},
   setTimeout(){return 1},clearTimeout(){},setInterval(){return 1},clearInterval(){},confirm(){return true},
   console
 }),{timeout:10000});
 return {qa:w.__qa,get:$};
}
const solo=suiteHarness('saiko-solo-arcade/app.js','window.__qa={start,getState:()=>state,throwRps,slideMove,slideNeighbours,initSlide};})();');
for(const game of ['reaction','mole','simon','order','math','odd','word','merge'])solo.qa.start(game);
solo.qa.start('merge');assert.equal(solo.qa.getState().cells.length,16);
solo.qa.start('word');assert.equal(solo.qa.getState().questions.length,10);
solo.qa.start('math');assert.equal(solo.qa.getState().question.options.length,4);

solo.qa.start('rps');for(let i=0;i<10;i++){
 solo.qa.throwRps(i%3);assert.equal(solo.qa.getState().round,i+1);
 const next=solo.get('rpsNext').onclick;assert.equal(typeof next,'function');next();
}
assert.equal(solo.get('gameInfo').textContent,'🎉 チャレンジ終了！');
function isSlideSolvable(cells,n){
 let inv=0;for(let i=0;i<cells.length;i++)for(let j=i+1;j<cells.length;j++)
  if(cells[i]&&cells[j]&&cells[i]>cells[j])inv++;
 if(n%2===1)return inv%2===0;
 const rowFromBottom=n-Math.floor(cells.indexOf(0)/n);
 return (inv+rowFromBottom)%2===1;
}
solo.qa.start('slide');
for(const n of [3,4])for(let i=0;i<30;i++){
 solo.qa.initSlide(n);
 const state=solo.qa.getState();
 assert.equal(state.cells.length,n*n);
 assert.equal(new Set(state.cells).size,n*n);
 assert(isSlideSolvable(state.cells,n),'Impossible slide shuffle for '+n+'x'+n);
 const zero=state.cells.indexOf(0),neighbours=solo.qa.slideNeighbours(zero,n);
 const index=neighbours[0];solo.qa.slideMove(index);
 assert.equal(state.moves,1);
 assert.equal(state.cells[index],0);
}


const cardPark=suiteHarness('saiko-card-games/app.js',
 'window.__qa={start,get:()=>st,tapMemory,guessHighLow,playSevens,turnSevensAI,legalSevens,deck52,discardPairs};})();');
assert.equal(cardPark.qa.deck52().length,52);
assert.equal(new Set(cardPark.qa.deck52().map(c=>c.id)).size,52);
for(let level=0;level<3;level++){
 cardPark.qa.start('memory',level);
 const state=cardPark.qa.get(),pairs=new Map();
 state.cards.forEach((c,i)=>{const found=pairs.get(c.id)||[];found.push(i);pairs.set(c.id,found)});
 assert.equal(pairs.size,[6,10,15][level]);
 for(const ids of pairs.values()){assert.equal(ids.length,2);cardPark.qa.tapMemory(ids[0]);cardPark.qa.tapMemory(ids[1]);}
 assert.equal(cardPark.get('info').textContent,'✨ ミッション達成！');
}
cardPark.qa.start('highlow');
for(let i=0;i<25;i++){
 const state=cardPark.qa.get(),diff=Math.sign(state.cards[0].rank-state.current.rank);
 cardPark.qa.guessHighLow(diff===0?1:diff);
 assert.equal(state.round,i+1);
 cardPark.get('nextHighLow').onclick();
}
assert.equal(cardPark.get('info').textContent,'✨ ミッション達成！');
cardPark.qa.start('oldmaid');
assert(cardPark.qa.get().player.length>0&&cardPark.qa.get().ai.length>0);
cardPark.qa.start('sevens');
assert.equal(cardPark.qa.get().user.length,24);
assert.equal(cardPark.qa.get().ai.length,24);
assert.equal(cardPark.qa.get().laid.size,4);
assert([...cardPark.qa.get().user,...cardPark.qa.get().ai].some(c=>cardPark.qa.legalSevens(c,cardPark.qa.get().laid)));
for(const file of ['saiko-card-games/index.html','saiko-card-games/app.js'])assert(fs.existsSync(path.join(root,file)));
assert(read('saiko-apps/index.html').includes('href="../saiko-card-games/"'));
const party=suiteHarness('saiko-party-games/app.js','window.__qa={start,getState:()=>state,getTeams:()=>teams,beginTeam21,stay21,hit21,beginSymbolSpeed,awardSymbol,commonSymbol,speedDeck:SPEED_DECK,gestures:GESTURES,clues:CLUES,funny:FUNNY_CLUES,chaos:CHAOS_CLUES,facts:FACTS,two:TWO_CHOICES,tsuk:TSUKKOMI};})();');
party.qa.start('teamMemory');
assert.equal(party.qa.getState().phase,'setup');
party.get('memoryLaunch').onclick();
assert.equal(party.qa.getState().faces.length,20);
assert.equal(new Set(party.qa.getState().faces).size,10);
assert.equal(party.qa.getState().members,4);
assert.equal(party.qa.getState().phase,'play');
party.qa.start('teamHighLow');
assert.equal(party.qa.getState().phase,'setup');
party.get('highLowLaunch').onclick();
assert.equal(party.qa.getState().members,4);
assert.equal(party.qa.getState().roundLimit,15);
for(let round=0;round<15;round++){
 const current=party.qa.getState();
 assert.equal(current.phase,'vote');
 party.get('hi_0').onclick();
 party.get('lo_1').onclick();
 party.get('a_reveal').onclick();
 assert.equal(current.phase,'reveal');
 party.get('a_next').onclick();
}
assert.equal(party.qa.getState().phase,'finished');

assert.equal(party.qa.speedDeck.length,13);
for(let i=0;i<13;i++){
 assert.equal(party.qa.speedDeck[i].length,4);
 for(let j=i+1;j<13;j++){
  assert.notEqual(party.qa.commonSymbol(i,j),null,'Every symbol card pair must share one image');
  assert.equal(party.qa.speedDeck[i].filter(x=>party.qa.speedDeck[j].includes(x)).length,1);
 }
}
for(let members=2;members<=6;members++){
 party.qa.start('team21');assert.equal(party.qa.getState().phase,'setup');
 party.qa.beginTeam21(members);
 const s=party.qa.getState();assert.equal(s.hands.length,members);
 for(let r=0;r<3;r++){
  let guard=0;
  while(s.phase==='playing'&&guard++<55)party.qa.stay21();
  assert(guard<=55,'21 should end each round');
  assert.equal(s.phase,'roundResult');
  party.get('a_next').onclick();
 }
 assert.equal(s.phase,'finished');
 assert.equal(party.qa.getTeams().length,members);
 party.qa.start('symbolSpeed');party.qa.beginSymbolSpeed(members);
 const symbols=party.qa.getState();
 assert.equal(new Set(symbols.pairs.map(p=>p.join('-'))).size,15);
 for(let r=0;r<15;r++){
  assert.equal(symbols.phase,'question');
  party.get('a_reveal').onclick();
  assert.equal(symbols.phase,'reveal');
  if(r%3!==0){
   party.qa.awardSymbol(r%members);
   party.qa.awardSymbol((r+1)%members); // double awards must be ignored
  }
  party.get('a_next').onclick();
 }
 assert.equal(symbols.phase,'finished');
 assert.equal(party.qa.getTeams().reduce((a,b)=>a+b,0),10);
}
party.qa.start('bingo');assert.equal(party.qa.getState().numbers.length,75);
assert.equal(new Set(party.qa.getState().numbers).size,75);
party.qa.start('gesture');assert.equal(party.qa.gestures.length,80);
party.qa.start('association');assert.equal(party.qa.clues.length,50);
assert.equal(party.qa.funny.length,40);
assert.equal(party.qa.chaos.length,20);
assert.equal(party.qa.getState().items.length,110);
assert(party.qa.funny.includes(party.qa.getState().items[0]),'Default mixed mode must start with funny puzzle');
assert.equal(new Set(party.qa.getState().items.map(x=>x[0])).size,110,'Association answers must be unique');
party.qa.start('two');assert.equal(party.qa.getState().items.length,40);
assert.equal(party.qa.two.length,40);
party.qa.start('tsukkomi');assert.equal(party.qa.getState().items.length,40);
assert.equal(party.qa.tsuk.length,40);
party.qa.start('association');

party.qa.start('ox');assert.equal(party.qa.facts.length,50);
assert.equal(party.qa.getState().items.length,50);
for(const folder of ['saiko-solo-arcade','saiko-party-games']){
 assert(fs.existsSync(path.join(root,folder,'index.html')));
 assert(fs.existsSync(path.join(root,folder,'app.js')));
}
console.log('PASS: 30/30 adventure maps solved ('+steps+' movements), gems and stars valid');
console.log('PASS: 3 difficulty modes: memory decks, differences, 10 unique kids puzzles');
console.log('PASS: 150 hosted puzzles and 100 escape stages, matching hints, corrected placeholders, portal links');
console.log('PASS: group/solo play modes classify all '+playCards.length+' app cards');
console.log('PASS: 10 solo games, 10 group games, 110 mixed associations + 80 comic voting/tsukkomi prompts');
console.log('PASS: configurable group memory, 15-round High-Low, 2–6 player 21-card challenge and 15-round symbol-speed scoring');
console.log('PASS: Both escape series play through all 50 stages and allow all chapter jumps');
console.log('PASS: polished card park, 3 memory difficulties, 25 high-low rounds and two Lumi card opponents');
