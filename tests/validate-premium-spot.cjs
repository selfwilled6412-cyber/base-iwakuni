#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const base=path.join(__dirname,'../saiko-premium-spot');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const dataMatch=html.match(/<script id="puzzledata" type="application\/json">([\s\S]*?)<\/script>/);
assert(dataMatch,'Embedded puzzle configuration is missing');
const data=JSON.parse(dataMatch[1]);
assert.equal(data.length,3,'Only verified premium images may be playable; never claim 90');
assert.deepEqual(data.map(p=>p.answers.length),[5,7,5]);
assert(html.includes('残りの高品質画像は未制作'),'Be transparent about unfinished question bank');
for(const puzzle of data){
 assert(puzzle.id&&puzzle.name);
 for(const asset of [puzzle.a,puzzle.b]){
  assert(/^assets\/[a-z_]+\.webp$/.test(asset),'Prevent remote / user-specified media paths');
  const bytes=fs.readFileSync(path.join(base,asset));
  assert(bytes.length>100000,'Artwork is missing or unusually low fidelity');
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
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
assert(storage.has('saiko-premium-spot-preview-v1'),'Local progress must persist');
console.log('PASS: 3 premium paired original image scenes, 17 exact tappable differences, and WebP files');
console.log('PASS: correct/incorrect taps, both sides, no double-score, hints, completion and saved record');
