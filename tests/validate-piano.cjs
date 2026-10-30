#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const piano=require('../saiko-rhythm/piano-core.js');
assert.throws(()=>piano.prepare([]),/ノーツ/);
assert.throws(()=>piano.prepare([{t:1,lane:7},{t:2,lane:0},{t:3,lane:0},{t:4,lane:0}]));
assert.throws(()=>piano.prepare([{t:2,lane:0},{t:1,lane:1},{t:3,lane:2},{t:4,lane:3}]));
const notes=[{t:.4,lane:0},{t:.8,lane:2},{t:1.2,lane:1},{t:1.6,lane:3},{t:2,lane:0}];
const game=piano.engine(notes);
assert.equal(game.state().score,0);
assert.equal(game.tap(0,.4).result,'perfect');
assert.equal(game.tap(0,.4),null,'Never double-score the same tile');
assert.equal(game.tap(2,.95).result,'good');
assert.equal(game.state().combo,2);
game.tick(1.5);
assert.equal(game.state().miss,1);
assert.equal(game.state().combo,0,'Misses reset combo');
assert.equal(game.tap(3,1.6).result,'perfect');
game.end();
assert.equal(game.state().done,5);
assert.equal(game.state().perfect,2);
assert.equal(game.state().good,1);
assert.equal(game.state().miss,2);
assert.equal(game.state().active,false);
game.reset();assert.equal(game.state().done,0);
const realOnsets=[.3,.55,.8,1.05,1.3,1.55,1.8,2.05,2.3];
for(const level of ['easy','normal','hard']){
 const n=piano.chartFromOnsets(realOnsets,level);
 assert(n.length>=4);
 assert(n.every((x,i)=>x.t>=.15&&[0,1,2,3].includes(x.lane)&&(!i||x.t>n[i-1].t)));
}
const html=fs.readFileSync('saiko-rhythm/piano-tiles.html','utf8');
const js=fs.readFileSync('saiko-rhythm/piano-tiles.js','utf8');
new vm.Script(js,{filename:'piano-tiles.js'});
for(const value of ['id="demo"','id="game"','id="tilesCanvas"','id="videoUrl"','id="load"','id="status"','id="quit"','id="pause"','id="again"','id="score"','id="combo"']){
 assert(html.includes(value),'Missing mobile component '+value);
}
assert(!/<iframe\b/i.test(html),'The user expressly does not want a video panel');
assert(html.includes('piano-core.js')&&html.includes('beat-analyzer.js'));
assert(js.includes('analyzer.extractOnsets(buffer,{level})'),'Actual waveform analysis must drive generated notes');
assert(js.includes('source.buffer=audioBuffer'),'Analyze and play precisely the same source buffer');
assert(js.includes('currentSeconds()'),'Use native decoded track playback clock for native charts');
assert(js.includes('window.SaikoNativeChartReady'),'Native Android bridge should be handled');
const java=fs.readFileSync('saiko-android/app/src/main/java/jp/base/saikobeat/MainActivity.java','utf8');
assert(java.includes('assets/piano-tiles.html'),'Android app must launch new audio-first mode');
assert(java.includes('MediaPlayer'),'Android must playback actual downloaded audio not a hidden iframe');
assert(java.includes('prepareTrack(cache)'),'Audio must be playable before chart is accepted');
assert(java.includes('getCurrentPosition()'),'Rendering must use true native playback position');
assert(java.includes('releaseTrack()'),'Downloaded temporary tracks must be cleaned up');
const workflow=fs.readFileSync('.github/workflows/saiko-native-android.yml','utf8');
assert(workflow.includes('cp saiko-rhythm/piano-tiles.html saiko-rhythm/piano-tiles.js saiko-rhythm/piano-core.js'));
console.log('PASS: piano-tile perfect/good/miss, combo, no duplicate score, reset and audio-derived note transforms');
console.log('PASS: original audio buffer analysis/playback and Android MediaPlayer master clock; no video iframe');
