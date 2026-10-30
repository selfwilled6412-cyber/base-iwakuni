#!/usr/bin/env node
'use strict';
/* Runs the real original-audio synthesizer through the real beat analyzer.
 * Tests a full one-click music -> waveform -> tile -> audio playback flow. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const core=require('../saiko-rhythm/piano-core.js'),analyzer=require('../saiko-rhythm/beat-analyzer.js');
const html=fs.readFileSync('saiko-rhythm/piano-tiles.html','utf8');
const js=fs.readFileSync('saiko-rhythm/piano-tiles.js','utf8');
new vm.Script(js,{filename:'piano-tiles.js'});
assert(!/<iframe/i.test(html),'No video should appear in piano rush');
const nodes={};
const make=id=>nodes[id]||(nodes[id]={
 id,hidden:false,value:'',textContent:'',disabled:false,style:{},dataset:{},width:400,height:500,
 attrs:{},listeners:{},classList:{remove(){},add(){}},
 setAttribute(k,v){this.attrs[k]=v},
 addEventListener(name,fn){this.listeners[name]=fn},
 getContext(){return {fillRect(){},roundRect(){},beginPath(){},arc(){},fill(){},stroke(){},createLinearGradient(){return {addColorStop(){}}}}},
 getBoundingClientRect(){return {width:400,height:500,left:0,top:0}},
 scrollIntoView(){}
});
const levels=['easy','normal','hard'].map(level=>Object.assign(make('level-'+level),{dataset:{level}}));
const doc={
 getElementById:make,
 querySelectorAll(q){return q==='[data-level]'?levels:[]},
 addEventListener(){}
};
const player={started:0,stopped:0};
class AudioContext {
 constructor(){this.state='running';this.currentTime=8;this.destination={};}
 createBuffer(n,length,rate){
  const arr=new Float32Array(length);
  return {sampleRate:rate,duration:length/rate,numberOfChannels:n,getChannelData(){return arr}};
 }
 createBufferSource(){return {connect(){},start(){player.started++},stop(){player.stopped++},disconnect(){}}}
 resume(){return Promise.resolve()}
 close(){return Promise.resolve()}
}
let animation=0;
const window={SaikoPianoCore:core,SaikoBeatAnalyzer:analyzer,AudioContext,devicePixelRatio:1,
 addEventListener(){}};
const localStorage={getItem(){return null},setItem(){}};
const sandbox={window,document:doc,localStorage,performance:{now(){return 0}},cancelAnimationFrame(){},
 requestAnimationFrame(){return ++animation},Math,Number,Set,URL,console};
(async()=>{
 vm.runInNewContext(js,sandbox,{filename:'piano-tiles.js'});
 assert.equal(make('youtubeMode').hidden,true,'Browser demo must not promise unsupported YouTube audio access');
 const click=make('demo').listeners.click;
 assert(click,'One-click start button not wired');
 await click();
 const state=window.SaikoPianoGame.getState();
 assert(state,'Actual synthesized waveform should yield playable notes: '+make('status').textContent);
 assert(state.notes.length>=8,'Detected too few waveform onsets: '+state.notes.length);
 assert(state.notes.every(n=>n.t>0&&n.lane>=0&&n.lane<4));
 assert.equal(player.started,1,'Must play exactly the AudioBuffer that was analyzed');
 assert.equal(make('menu').hidden,true);
 assert.equal(make('game').hidden,false);
 assert(html.includes('id="tilesCanvas"'));
 console.log('PASS: real generated original music -> PCM waveform -> beat analyzer -> '+state.notes.length+' synchronized falling tiles');
 console.log('PASS: exact original sound buffer playback, one-tap entry, no YouTube video iframe');
})().catch(e=>{console.error(e);process.exitCode=1});
