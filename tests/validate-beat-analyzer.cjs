#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),analyzer=require('../saiko-rhythm/beat-analyzer.js'),studio=require('../saiko-rhythm/studio-core.js');
const sr=8000,seconds=12,data=new Float32Array(sr*seconds);
const starts=Array.from({length:20},(_,i)=>.5+i*.5);
for(const t of starts){
 const start=Math.floor(t*sr),span=Math.floor(.08*sr);
 for(let k=0;k<span;k++)data[start+k]+=.75*Math.exp(-k/(sr*.017))*Math.sin(2*Math.PI*250*k/sr);
}
const audio={sampleRate:sr,numberOfChannels:1,duration:seconds,getChannelData(){return data}};
const times=analyzer.extractOnsets(audio,{level:'normal'});
assert(times.length>=12,'Real transients should produce a substantial playable beatmap, got '+times.length);
const hits=starts.filter(t=>times.some(beat=>Math.abs(beat-t)<.13));
assert(hits.length>=14,'Onset detector must follow audio attacks; matching '+hits.length+'/'+starts.length);
const chart=analyzer.chartFromOnsets(studio,{duration:seconds,bpm:120,offset:0,level:'normal',times,title:'Original Recording'});
assert(chart.notes.length>=12&&chart.notes.length<=times.length);
assert(chart.notes.every(n=>times.some(t=>Math.abs(n.t-t)<.001)),'Never invent a BPM-grid note');
const shifted=analyzer.chartFromOnsets(studio,{duration:seconds,bpm:120,offset:0,level:'normal',times,shift:.3});
assert(Math.abs(shifted.notes[0].t-chart.notes[0].t-.3)<.002,'Apply intro/video alignment');
const empty={...audio,getChannelData(){return new Float32Array(sr*seconds)}};
assert.deepEqual(analyzer.extractOnsets(empty),[],'Silent source must never generate arbitrary notes');
assert.throws(()=>analyzer.chartFromOnsets(studio,{duration:seconds,bpm:120,times:[]}));
assert.throws(()=>analyzer.chartFromOnsets(studio,{duration:seconds,bpm:120,times,shift:20}));
console.log('PASS: actual beat onset detection and chart timing on licensed local audio, silence rejection, sync offset');
