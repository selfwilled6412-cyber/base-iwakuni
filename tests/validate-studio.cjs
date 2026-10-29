#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const core=require('../saiko-rhythm/studio-core.js');
const html=get('saiko-rhythm/studio.html');
const ui=get('saiko-rhythm/studio.js');
new vm.Script(ui,{filename:'saiko-rhythm/studio.js'});
assert(html.includes('id="rights"')&&html.includes('audio/*'));
assert(html.includes('studio-core.js')&&html.includes('studio.js'));
assert(get('saiko-rhythm/index.html').includes('href="studio.html"'));
assert(html.includes('サーバーにアップロードされません'));
assert(!ui.includes('fetch('),'No network upload request should be necessary for studio');
for(const bpm of [60,100,150,220]){
 for(const level of ['easy','normal','hard']){
  const chart=core.makeChart({title:'Test',bpm,offset:.3,duration:74,level});
  assert(chart.notes.length>8);
  assert(chart.notes.every((n,i)=>n.t>=0&&n.t<=74&&n.lane>=0&&n.lane<=3&&Number.isInteger(n.lane)&&(i===0||n.t>=chart.notes[i-1].t)));
  assert.deepEqual(chart,core.makeChart({title:'Test',bpm,offset:.3,duration:74,level}),'Chart generation must be reproducible');
  assert(chart.notes.length<=900);
 }
}
const easy=core.makeChart({bpm:120,duration:40,level:'easy'});
const normal=core.makeChart({bpm:120,duration:40,level:'normal'});
const hard=core.makeChart({bpm:120,duration:40,level:'hard'});
assert(easy.notes.length<normal.notes.length&&normal.notes.length<hard.notes.length);
assert(easy.notes.every(n=>[1,2].includes(n.lane)));
const blank={version:1,title:'Test',bpm:120,offset:0,duration:80,level:'normal',notes:[]};
const added=core.insertNote(blank,4.5,2);
assert.equal(added.notes.length,1);
assert.equal(added.notes[0].lane,2);
assert.equal(core.insertNote(added,4.5,2).notes.length,1,'No duplicate on same lane and time');
assert.equal(core.removeNote(added,4.5,2).notes.length,0);
assert.equal(core.nearestGrid(1.27,120,0,2),1.25);
assert.equal(core.judge(added.notes,4.55,2).grade,'PERFECT');
assert.equal(core.judge(added.notes,4.60,2).grade,'GREAT');
assert.equal(core.judge(added.notes,4.66,2).grade,'GOOD');
assert.equal(core.judge(added.notes,4.5,1),null);
assert.equal(core.judge(added.notes,4.5,2,new Set([0])),null);
assert.equal(JSON.stringify(core.normalizeChart(JSON.parse(JSON.stringify(added)))),JSON.stringify(added));
for(const malformed of [
 {},null,[],{...blank,version:99},{...blank,bpm:0},{...blank,bpm:221},{...blank,offset:4},
 {...blank,duration:11*60},{...blank,notes:[{t:-1,lane:0}]},
 {...blank,notes:[{t:4,lane:5}]},{...blank,notes:[{t:Infinity,lane:2}]},
 {...blank,notes:Array.from({length:1601},(_,i)=>({t:i/10,lane:1}))}
])assert.throws(()=>core.normalizeChart(malformed));
const sampleRate=8000,samples=new Float32Array(sampleRate*3);
for(const time of [.45,.9,1.35,1.8,2.25])for(let i=0;i<260;i++)samples[Math.floor(time*sampleRate)+i]=.9;
const peaks=core.detectPeaks(samples,sampleRate);
assert(peaks.length>0&&peaks.length<=50,'Onset detector should find synthetic transients');
const assisted=core.makeChart({bpm:120,duration:30,peaks,level:'normal'});
assert(assisted.notes.length>5);
console.log('PASS: studio JS parses and HTML offers explicit rights acknowledgement, local-only file picker and complete editor');
console.log('PASS: 12 BPM/difficulty scenarios, ordered deterministic rhythm generation and easy accessibility');
console.log('PASS: chart normalization, deduplication, editing, secure malformed-JSON rejection and scoring timing');
console.log('PASS: local energy transients and optional beat snapping; no audio upload path');
