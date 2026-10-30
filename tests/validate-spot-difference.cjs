#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const core=require('../saiko-spot-difference/puzzle-core.js');
const levels={easy:10,normal:20,hard:30};
let total=0,differences=0;
const ids=new Set(),signatures=new Set();
for(const [level,needed] of Object.entries(levels)){
 const keys=new Set();
 for(let index=0;index<30;index++){
  const a=core.makePuzzle(level,index);
  const b=core.makePuzzle(level,index);
  assert.deepEqual(a,b,'Generation must be deterministic for '+level+'/'+index);
  assert.equal(a.count,needed);
  assert.equal(a.objects.length,30);
  assert.equal(a.spots.length,needed);
  assert.equal(new Set(a.spots).size,needed);
  assert(a.spots.every(n=>n>=0&&n<30));
  assert.equal(new Set(a.objects.map(x=>x.i)).size,30);
  assert(a.objects.every(x=>x.alt!==x.icon));
  assert.equal(a.objects.filter(x=>x.different).length,needed);
  assert(a.objects.every(x=>x.different===a.spots.includes(x.i)));
  const s=JSON.stringify(a.objects.map(x=>[x.icon,x.alt,x.x,x.y]));
  assert(!signatures.has(s),'Repeating illustration '+level+'/'+index);
  signatures.add(s);
  const left=core.render(a,'left'),right=core.render(a,'right');
  assert.equal((left.match(/data-slot=/g)||[]).length,30);
  assert.equal((right.match(/data-slot=/g)||[]).length,30);
  assert(left.includes('<svg ')&&right.includes('<svg '));
  assert(!left.includes('undefined')&&!right.includes('undefined'));
  assert(!left.includes('foundRing'),'Unplayed board should not pre-reveal answers');
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
assert.equal(differences,1800);
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
assert(hub.includes('data-play="group solo"'),'Spot difference must appear in both play-mode filters');
console.log('PASS: 90 distinct deterministic vector puzzles, 30 per difficulty, exactly 1,800 tappable differences');
console.log('PASS: corresponding left/right hotspot counts, hints, accessible controls and app hub link');
