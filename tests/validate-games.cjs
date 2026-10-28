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
console.log('PASS: 30/30 adventure maps solved ('+steps+' movements), gems and stars valid');
console.log('PASS: 3 difficulty modes: memory decks, differences, 10 unique kids puzzles');
console.log('PASS: 150 hosted puzzles and 100 escape stages, matching hints, corrected placeholders, portal links');
console.log('PASS: group/solo play modes classify all '+playCards.length+' app cards');
