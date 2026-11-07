#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const base=path.join(__dirname,'../saiko-premium-spot');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const dataMatch=html.match(/<script id="puzzledata" type="application\/json">([\s\S]*?)<\/script>/);
assert(dataMatch,'Embedded puzzle configuration is missing');
const data=JSON.parse(dataMatch[1]);
assert.equal(data.length,10,'Only verified premium images may be playable; never claim 90');
assert.deepEqual(data.map(p=>p.answers.length),[5,7,5,5,5,10,7,10,7,5]);
assert(!/未制作|体験版|試作|承認済み|本番は/.test(html),'Public screen must contain player-facing language only');
for(const puzzle of data){
 assert(puzzle.id&&puzzle.name);
 for(const asset of [puzzle.a,puzzle.b]){
  assert(/^assets\/[a-z_]+\.webp$/.test(asset),'Prevent remote / user-specified media paths');
  const bytes=fs.readFileSync(path.join(base,asset));
  assert(bytes.length>100000,'Artwork is missing or unusually low fidelity');
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
 if(puzzle.patches){
  assert.equal(puzzle.patches.length,puzzle.answers.length);
  for(const polygon of puzzle.patches){
   assert(polygon.length>=3);
   for(const [x,y] of polygon)assert(x>=0&&x<=1024&&y>=0&&y<=1536);
  }
 }
 const used=[];
 for(const answer of puzzle.answers){
  assert(typeof answer.label==='string'&&answer.label.length>1);
  for(const k of ['x','y','rx','ry'])assert(Number.isFinite(answer[k]),'Missing coordinate '+k);
  assert(answer.x>0&&answer.x<1&&answer.y>0&&answer.y<1);
  assert(answer.rx>0&&answer.rx<.2&&answer.ry>0&&answer.ry<.2);
  used.push(answer.label);
 }
 assert.equal(new Set(used).size,used.length,'Answer names must be distinct');
}
const script=html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
assert(script,'Missing playable game controller');
new vm.Script(script[1],{filename:'premium-game.js'});
const storage=new Map(),nodes=new Map();
const boardPanels=['a','b'].map(side=>({
 side,events:{},getBoundingClientRect(){return {left:0,top:0,width:724,height:1086}},
 addEventListener(type,fn){this.events[type]=fn}
}));
function node(id){
 if(!nodes.has(id)){
  nodes.set(id,{id,hidden:false,innerHTML:'',textContent:'',style:{},src:'',
   disabled:false,classList:{toggle(){}},setAttribute(){},scrollIntoView(){},
   querySelectorAll(query){
    if(query==='[data-index]')return data.map((p,i)=>({
      dataset:{index:String(i)},addEventListener(type,callback){this.callback=callback}
    }));
    return [];
   }
  });
 }
 return nodes.get(id);
}
node('puzzledata').textContent=JSON.stringify(data);
const document={
 getElementById:node,querySelectorAll(q){return q==='.painting'?boardPanels:[]},
 querySelector(q){const m=q.match(/^\.painting\[data-side="([ab])"\]$/);return m?boardPanels.find(p=>p.side===m[1]):null},
 addEventListener(){},hidden:false
};
const sandbox={document,window:{scrollTo(){}},
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
 setInterval:()=>1,clearInterval(){},Math,Set,Number,JSON,console};
vm.runInNewContext(script[1],sandbox,{timeout:10000});
const game=sandbox.window.SaikoPremiumGame;
assert(game,'Gameplay diagnostics missing');
for(let i=0;i<data.length;i++){
 game.open(i);
 assert.equal(game.getState().index,i);
 const p=data[i];
 assert.equal(node('img-b').src,p.patches?p.a:p.b,'New puzzles must share identical base pixels');
 if(p.patches){
  assert(node('marks-b').innerHTML.includes('clipPath'),'Edited art is restricted to authored objects');
  assert(!node('marks-a').innerHTML.includes('clipPath'),'Reference image is unmodified');
 }
 node('hint').onclick();
 game.tapAt('a',.005,.995);
 assert.equal(game.getState().wrong,1,'Wrong coordinate should be counted');
 game.tapAt('a',p.answers[0].x,p.answers[0].y);
 assert.equal(game.getState().found.length,1);
 game.tapAt('b',p.answers[0].x,p.answers[0].y);
 assert.equal(game.getState().found.length,1,'No double-credit');
 if(i===0)node('hint').onclick();
 for(const a of p.answers.slice(1))game.tapAt('b',a.x,a.y);
 assert.equal(game.getState().found.length,p.answers.length,'All expected hit targets should score');
 assert.equal(game.getState().complete,true,'Last hit completes the game');
 assert.equal(node('finish').hidden,false,'Winning screen visible');
 assert.equal(node('found').textContent,p.answers.length+' / '+p.answers.length);
}
node('back').onclick();
node('level-hard').onclick();
assert.equal(node('level-status').textContent,'上級・2問');
assert(node('cards').innerHTML.includes('春の温室ティータイム'));
assert(!node('cards').innerHTML.includes('湖畔のピクニック'));
node('level-normal').onclick();
assert.equal(node('level-status').textContent,'中級・3問');
assert(node('cards').innerHTML.includes('夕暮れの海辺の本屋さん'));
node('level-easy').onclick();
assert.equal(node('gallery').hidden,false,'Return to gallery');
assert.equal(node('game').hidden,true);
node('switch').onclick();
assert.equal(game.getState().index,0,'Next wraps to first puzzle');
assert(storage.has('saiko-premium-spot-preview-v1'),'Local progress must persist');
console.log('PASS: 10 premium paired original image scenes, 66 exact tappable differences, and WebP files');
console.log('PASS: correct/incorrect taps, both sides, no double-score, hints, completion and saved record');

for(const level of ["初級","中級","上級"]){const ids=data.map((p,i)=>p.difficulty===level?i:-1).filter(i=>i>=0);game.open(ids[ids.length-1]);node("switch").onclick();assert.equal(game.getState().index,ids[0],"Next stays within "+level)}
