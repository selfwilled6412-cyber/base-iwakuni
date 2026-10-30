#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const core=require('../saiko-spot-difference/puzzle-core.js');
const levels={easy:5,normal:7,hard:10};
let total=0,differences=0;
const ids=new Set(),signatures=new Set();
for(const [level,needed] of Object.entries(levels)){
 const keys=new Set();
 for(let index=0;index<30;index++){
  const a=core.makePuzzle(level,index);
  const b=core.makePuzzle(level,index);
  assert.deepEqual(a,b,'Generation must be deterministic for '+level+'/'+index);
  assert.equal(a.count,needed);
  assert.equal(a.objects.length,core.OBJECTS);
  assert.equal(core.OBJECTS,18);
  assert.equal(a.spots.length,needed);
  assert.equal(new Set(a.spots).size,needed);
  assert(a.spots.every(n=>n>=0&&n<core.OBJECTS));
  assert.equal(new Set(a.objects.map(x=>x.i)).size,core.OBJECTS);
  assert(a.objects.every(x=>x.alt!==x.kind));
  assert(a.objects.every(x=>['missing','color','type','size','detail'].includes(x.variation)));
  assert.equal(a.objects.filter(x=>x.different).length,needed);
  assert(a.objects.every(x=>x.different===a.spots.includes(x.i)));
  const s=JSON.stringify(a.objects.map(x=>[x.kind,x.alt,x.x,x.y,x.scale,x.variation]));
  assert(!signatures.has(s),'Repeating illustration '+level+'/'+index);
  signatures.add(s);
  const left=core.render(a,'left'),right=core.render(a,'right');
  assert.equal((left.match(/data-slot=/g)||[]).length,core.OBJECTS);
  assert.equal((right.match(/data-slot=/g)||[]).length,core.OBJECTS);
  assert(left.includes('<svg ')&&right.includes('<svg '));
  assert(!left.includes('undefined')&&!right.includes('undefined'));
  assert(!left.includes('foundRing'),'Unplayed board should not pre-reveal answers');
  assert(!/<text[^>]*>[^<]*[\u{1F300}-\u{1FAFF}]/u.test(left),'Scenes must not be emoji grids');
  assert(left.includes('class="hitBox"'),'Natural objects must be tappable');
  assert(!right.includes('hintRing'),'Unplayed board should not pre-reveal hints');
  assert(!keys.has(a.id));
  keys.add(a.id);ids.add(a.id);
  const found=core.render(a,'right',a.spots);
  assert.equal((found.match(/class="foundRing"/g)||[]).length,needed);
  total++;differences+=needed;
 }
 assert.equal(keys.size,30);
}
assert.equal(total,90);
assert.equal(differences,660);
assert.equal(ids.size,90);
for(const [badLevel,badIndex] of [['easy',30],['none',0],['hard',-1]]){
 assert.throws(()=>core.makePuzzle(badLevel,badIndex));
}
const html=fs.readFileSync('saiko-spot-difference/index.html','utf8');
const app=fs.readFileSync('saiko-spot-difference/app.js','utf8');
new vm.Script(app,{filename:'spot/app.js'});
for(const id of ['picker','play','levelCard','leftPicture','rightPicture','found','remaining','hint','next','zoom','layout','resultNext']){
 if(id==='levelCard')assert(html.includes('class="levelCard"'));else assert(html.includes('id="'+id+'"'),'Required UI '+id);
}
assert(html.includes('puzzle-core.js')&&html.includes('app.js'));
assert(html.includes('data-level="easy"')&&html.includes('data-level="normal"')&&html.includes('data-level="hard"'));
const hub=fs.readFileSync('saiko-apps/index.html','utf8');
assert(hub.includes('href="../saiko-spot-difference/"'),'Game must appear in central hub');
assert(hub.includes('href="../saiko-premium-spot/"'),'Approved illustrated version stays in main catalog');
assert(hub.includes('data-view="all group solo"'),'Premium spot game remains visible to both group and solo audiences');
assert(hub.includes('試作・旧バージョン・準備中'),'Old spot game is retained separately under experimental/legacy section');
// Exercise the actual game controller in a mocked DOM, not only the puzzle generator.
const elements=new Map(),handlers={};
const node=id=>{
 if(!elements.has(id)){
  const o={id,textContent:'',innerHTML:'',hidden:false,style:{},disabled:false,
   addEventListener(type,fn){(handlers[id]??={})[type]=fn},
   setAttribute(name,value){this[name]=value},
   scrollIntoView(){},classList:{toggle(){}},scrollLeft:0,scrollTop:0};
  elements.set(id,o);
 }
 return elements.get(id);
};
const levelButtons=['easy','normal','hard'].map(level=>({dataset:{level},addEventListener(){}}));
const saved={};
const localStorage={getItem:key=>saved[key]??null,setItem:(key,value)=>{saved[key]=value}};
const document={
 getElementById:node,querySelectorAll:selector=>selector==='[data-level]'?levelButtons:[],
 addEventListener(){},hidden:false,fullscreenElement:null
};
const window={SaikoSpotCore:core,scrollTo(){}};
const gameScript=new vm.Script(app,{filename:'saiko-spot-difference/app.js'});
gameScript.runInNewContext(vm.createContext({document,window,localStorage,Math,performance:{now:()=>200000},
 setInterval:()=>1,clearInterval(){},console}),{timeout:10000});
const game=window.SaikoSpotGame;
assert(game,'Game controller must expose test state');
game.open('easy');
let state=game.getState();
assert.equal(state.spots.length,5);
assert.equal(node('picker').hidden,true);
const invalid=Array.from({length:core.OBJECTS},(_,i)=>i).find(i=>!state.spots.includes(i));
game.selectSlot(invalid);
assert.equal(game.getState().wrong,1);
game.selectSlot(state.spots[0]);
game.selectSlot(state.spots[0]);
assert.equal(game.getState().found.length,1,'No double counting');
game.hint();
assert.equal(game.getState().hints,1);
for(const slot of state.spots)game.selectSlot(slot);
assert.equal(game.getState().finished,true,'Complete on last difference');
assert.equal(game.getState().completed.length,1);
assert.equal(node('result').hidden,false);
const first=game.getState().puzzleId;
const played=new Set([first]);
for(let i=1;i<30;i++){
 game.next();state=game.getState();
 assert(!played.has(state.puzzleId),'A level cannot repeat before all 30 are seen');
 played.add(state.puzzleId);
}
assert.equal(played.size,30);
game.open('normal');assert.equal(game.getState().spots.length,7);
game.open('hard');assert.equal(game.getState().spots.length,10);
console.log('PASS: live game controller spots, hints, no duplicate score, win + save and 30-unique rotation');
console.log('PASS: 90 distinct deterministic vector puzzles, 30 per difficulty, exactly 660 tappable differences');
console.log('PASS: corresponding left/right hotspot counts, hints, accessible controls and app hub link');
