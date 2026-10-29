#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'saiko-rhythm/app.js'),'utf8');
new vm.Script(source,{filename:'saiko-rhythm/app.js'});
const elements=new Map();
function element(id){
 return {id,value:id==='volume'?'65':'0',checked:false,hidden:false,innerHTML:'',textContent:'',dataset:{},style:{},onclick:null,onchange:null,oninput:null,disabled:false,
 classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},querySelectorAll(){return []},
 getBoundingClientRect(){return {width:810,height:510}},getContext(){return null;}};
}
const get=id=>elements.get(id)||(elements.set(id,element(id)),elements.get(id));
const document={getElementById:get,querySelectorAll(){return []},querySelector(){return element('pad')},addEventListener(){}};
const stored={};const localStorage={getItem(k){return stored[k]||null},setItem(k,v){stored[k]=v}};
class Param{setValueAtTime(){} exponentialRampToValueAtTime(){} setTargetAtTime(){}}
class Node{constructor(){this.gain=new Param();this.frequency=new Param();this.threshold={value:0};this.knee={value:0};this.ratio={value:0};}
 connect(){return this}start(){}stop(){}}
class FakeAudioContext{
 constructor(){this.currentTime=0;this.sampleRate=44100;this.destination=new Node();this.state='running';FakeAudioContext.last=this}
 createGain(){return new Node()}createDynamicsCompressor(){return new Node()}
 createOscillator(){return new Node()}createBufferSource(){return new Node()}
 createBiquadFilter(){return new Node()}createBuffer(ch,len){return {getChannelData(){return new Float32Array(len)}}}
 async resume(){this.state='running'}async suspend(){this.state='suspended'}
 async close(){this.state='closed'}
}
let rafCount=0;
const window={AudioContext:FakeAudioContext,addEventListener(){},devicePixelRatio:1,scrollTo(){}};
const modified=source.replace(/\}\)\(\);\s*$/, "window.__test={begin,input,pauseToggle,finish,stopGame,getGame:()=>game,getSound:()=>sound,settings,section};})();");
assert(modified.includes('window.__test='));
const sandbox={window,document,localStorage,performance:{now(){return 1000}},Math,Float32Array,
 requestAnimationFrame(){return ++rafCount},cancelAnimationFrame(){},
 setInterval(){return 1},clearInterval(){},setTimeout(){return 1},clearTimeout(){},alert(){}};
new vm.Script(modified).runInNewContext(vm.createContext(sandbox),{timeout:20000});
const core=window.SaikoBeatCore,qa=window.__test;
assert(core&&qa);assert.equal(core.songs.length,3);
for(let song=0;song<3;song++){
 const beat=60/core.songs[song].bpm;
 const events=core.createMusicEvents(song);
 assert(events.length>100&&events.length<700);
 assert(events.every(e=>Number.isFinite(e.t)&&e.t>=0&&e.t<=80*beat));
 assert(events.some(e=>e.type==='kick')&&events.some(e=>e.type==='bass')&&events.some(e=>e.type==='lead'));
 for(const difficulty of ['easy','normal','hard']){
  for(const mode of ['solo','duel','party']){
   const notes=core.createChart(song,difficulty,mode);
   assert(notes.length>20&&notes.length<270,'Unexpected chart size');
   assert(notes.every(n=>n.t>=4*beat&&n.t<80*beat&&n.lane>=0&&n.lane<4));
   assert(notes.every((n,i)=>i===0||n.t>=notes[i-1].t),'Notes must be time-sorted');
   if(mode==='duel'){
    assert.equal(notes.filter(n=>n.player===0).length,notes.filter(n=>n.player===1).length);
    assert(notes.some(n=>n.lane===0||n.lane===1));
    assert(notes.some(n=>n.lane===2||n.lane===3));
   }else if(mode==='party'){
    const counts=[0,1,2,3].map(p=>notes.filter(n=>n.player===p).length);
    assert(new Set(counts).size===1,'Every relay player receives equal chart notes');
    assert(notes.every(n=>n.lane===n.player),'Relay player owns exactly one lane');
   }else{
    assert(notes.every(n=>n.player===0));
    if(difficulty==='easy')assert(notes.every(n=>[1,2].includes(n.lane)),'Easy must have two reachable lanes');
   }
   assert.deepEqual(JSON.parse(JSON.stringify(notes)),JSON.parse(JSON.stringify(core.createChart(song,difficulty,mode))),'Charts must be reproducible');
  }
 }
}
assert.equal(core.qualityRank({perfect:20,great:0,good:0,miss:0}),'S');
assert.equal(core.qualityRank({perfect:0,great:0,good:0,miss:20}),'D');
(async()=>{
 await qa.begin();
 assert.equal(qa.getGame().mode,'solo');assert.equal(qa.getGame().players.length,1);
 const game=qa.getGame(),sound=qa.getSound(),note=game.notes[0];
 assert(sound.ctx.currentTime===0);
 sound.ctx.currentTime=sound.origin+note.t+.014;
 qa.input(note.lane);
 assert.equal(note.judge,'perfect');assert(game.players[0].score>0);
 assert.equal(game.players[0].perfect,1);
 await qa.pauseToggle();assert.equal(game.paused,true);
 await qa.pauseToggle();assert.equal(game.paused,false);
 qa.finish();assert.equal(get('result').hidden,false);assert.equal(get('play').hidden,true);
 assert(stored['saiko-beat-rush-v1']?.includes('best'),'Result should save a local best score');
 qa.settings.mode='duel';qa.settings.level='normal';qa.settings.track=1;
 await qa.begin();
 const duel=qa.getGame(),audio=qa.getSound(),p0=duel.notes.find(n=>n.player===0),p1=duel.notes.find(n=>n.player===1);
 assert.equal(duel.players.length,2);assert.equal(duel.notes.filter(n=>n.player===0).length,duel.notes.filter(n=>n.player===1).length);
 audio.ctx.currentTime=audio.origin+p0.t+.02;qa.input(p0.lane);
 audio.ctx.currentTime=audio.origin+p1.t+.02;qa.input(p1.lane);
 assert.equal(p0.judge,'perfect');assert.equal(p1.judge,'perfect');
 assert(duel.players[0].score>0&&duel.players[1].score>0);
 qa.finish();assert(get('resultTitle').textContent.includes('勝ち')||get('resultTitle').textContent.includes('DRAW'));
 qa.settings.mode='party';qa.settings.level='easy';qa.settings.track=2;
 await qa.begin();
 const party=qa.getGame(),track=qa.getSound();
 assert.equal(party.players.length,4);
 for(let p=0;p<4;p++){
  const note=party.notes.find(n=>n.player===p);
  track.ctx.currentTime=track.origin+note.t+.015;qa.input(note.lane);
  assert.equal(note.judge,'perfect');assert(party.players[p].score>0);
 }
 qa.finish();assert(get('resultTitle').textContent.includes('優勝')||get('resultTitle').textContent.includes('同点'));
 qa.stopGame();
 console.log('PASS: 3 original-synth music tracks × 3 difficulties × 3 modes');
 console.log('PASS: beginner two-lane charts, equal two-player duels and fair four-person relay');
 console.log('PASS: WebAudio clock judgement, pause/resume, both player scores and local record');
})().catch(e=>{console.error(e);process.exitCode=1});
