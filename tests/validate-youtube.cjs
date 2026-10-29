#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const core=require('../saiko-rhythm/youtube-core.js'),studio=require('../saiko-rhythm/studio-core.js');
const html=read('saiko-rhythm/youtube.html'),client=read('saiko-rhythm/youtube.js');
new vm.Script(client,{filename:'youtube.js'});
assert(html.includes('studio-core.js')&&html.includes('youtube-core.js')&&html.includes('youtube.js'));
assert(html.includes('videoContainer')&&html.includes('id="rights"')&&html.includes('音声抽出・アップロードなし'));
assert(html.includes('正規')===false||html.includes('YouTube'));

assert(html.indexOf('id="videoUrl"')<html.indexOf('id="studioSettings"'),'Video entry must come before setup');
assert(html.indexOf('id="recordDock"')>html.indexOf('id="studioSettings"'),'Recording buttons stay out of first-screen gameplay');
const startView=html.slice(html.indexOf('<main>'),html.indexOf('<section class="layout"'));
assert(!startView.includes('音声を解析できません')&&!startView.includes('利用権限'),'Technical and legal explanations must not crowd first screen');
assert(!client.includes('ytCore.makeSyncChart('),'Video-only playback must never invent BPM filler notes');

const valid=[
 ['https://www.youtube.com/watch?v=dQw4w9WgXcQ','dQw4w9WgXcQ'],
 ['https://youtu.be/dQw4w9WgXcQ?t=1','dQw4w9WgXcQ'],
 ['https://youtube.com/shorts/abcDEF123_-','abcDEF123_-'],
 ['https://m.youtube.com/watch?v=abcDEF123_-','abcDEF123_-'],
 ['https://music.youtube.com/watch?v=dQw4w9WgXcQ','dQw4w9WgXcQ'],
 ['https://www.youtube.com/embed/dQw4w9WgXcQ','dQw4w9WgXcQ'],
 ['abcDEF123_-','abcDEF123_-']
];
for(const [url,id] of valid)assert.equal(core.parseYouTube(url),id);
for(const url of [
 '',null,'https://evil.com/watch?v=dQw4w9WgXcQ',
 'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ',
 'https://youtube.com@evil.com/watch?v=dQw4w9WgXcQ',
 'javascript:alert(1)','https://youtu.be/dQw4w9WgXcQ/abc',
 'https://www.youtube.com/watch?v=short','http://evil.com',
 'https://youtu.be/dQw4w9WgXcQ:1234'
])assert.equal(core.parseYouTube(url),null,'Reject spoofed or malformed URL: '+url);
assert.equal(core.estimateTapBpm([0,500,1000,1500]),120);
assert.equal(core.estimateTapBpm([0,333,666,999,1332]),180);
assert.equal(core.estimateTapBpm([0,100,200,300]),null);
assert.equal(core.estimateTapBpm([0,500,1000]),null);
for(const lvl of ['easy','normal','hard']){
 const result=core.makeSyncChart(studio,{duration:125,bpm:128,offset:.5,level:lvl});
 assert(result.notes.length>10&&result.notes.length<900);
 assert(result.notes.every(n=>n.t>=0&&n.t<=125));
}
assert.throws(()=>core.makeSyncChart(studio,{duration:999999,bpm:130,offset:0,level:'easy'}));
assert.throws(()=>core.makeSyncChart(studio,{duration:120,bpm:-4,offset:0,level:'easy'}));
assert.throws(()=>core.makeSyncChart(studio,{duration:120,bpm:120,offset:4,level:'easy'}));
const chart=core.makeSyncChart(studio,{duration:120,bpm:120,offset:0,level:'normal'});
const first=chart.notes[0],hit=core.selectHit(chart.notes,first.t+.02,first.lane,new Set(),0);
assert(hit&&hit.grade==='PERFECT');
assert.equal(core.selectHit(chart.notes,first.t,first.lane,new Set([hit.index])),null);
assert.equal(core.selectHit(chart.notes,first.t,5,new Set()),null);
const missed=new Set();assert(core.recordMisses(chart.notes,first.t+.5,missed)>0);
assert.equal(core.recordMisses(chart.notes,first.t+.5,missed),0);

// Manual beat timestamps must be used verbatim: a BPM estimate cannot move the recorded hits.
const performed=[1.03,1.49,2.04,2.61,3.23,4.11].map(t=>({t,lane:null}));
const live=core.makeRecordedChart(studio,{duration:65,bpm:120,offset:0,level:'normal',taps:performed});
assert.deepEqual(live.notes.map(n=>n.t),performed.map(n=>n.t),'Real performance timestamps, not even BPM-grid notes');
const easyRecorded=core.makeRecordedChart(studio,{duration:65,bpm:120,offset:0,level:'easy',taps:performed});
assert.deepEqual(easyRecorded.notes.map(n=>n.t),[1.03,2.04,3.23]);
const fourLanes=core.makeRecordedChart(studio,{duration:65,bpm:120,offset:0,level:'hard',taps:[{t:1,lane:0},{t:1,lane:3},{t:1.5,lane:1},{t:2,lane:2}]});
assert.equal(fourLanes.notes.length,4,'Manually chosen simultaneous lanes are preserved');
assert.throws(()=>core.makeRecordedChart(studio,{duration:65,bpm:120,offset:0,level:'normal',taps:[{t:1}]}));
assert(html.includes('id="recordBeat"')&&html.includes('id="captureBeat"'));
assert(!html.includes('canvas id="gameCanvas"')||html.indexOf('id="gameCanvas"')>html.indexOf('id="videoContainer"'),'Notes exist outside official iframe');

// Full page integration with a simulated official IFrame API. No real YouTube data is downloaded.
const elements=new Map(),listeners=new Map(),pads=[],drawLog=[],frames=[];
const mockCtx={setTransform(){},clearRect(){},fillRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},roundRect(){}};
function el(id){return {id,value:'',checked:false,hidden:false,textContent:'',innerHTML:'',style:{},duration:0,dataset:{},disabled:false,href:'',classList:{add(){},remove(){},toggle(){}},
 addEventListener(name,fn){listeners.set(id+':'+name,fn)},getContext(){return mockCtx},
 getBoundingClientRect(){return {width:500,height:370}},replaceChildren(){this.textContent=''},append(...parts){this.textContent+=parts.map(x=>x.textContent||'').join(' ')}};
}
const $=id=>elements.get(id)||(elements.set(id,el(id)),elements.get(id));
for(let i=0;i<4;i++){const p=el('pad'+i);p.dataset.lane=String(i);pads.push(p)}
const document={getElementById:$,querySelectorAll(q){return q==='[data-lane]'?pads:[]},createElement(tag){return el(tag)},head:{appendChild(){}},addEventListener(n,fn){listeners.set('doc:'+n,fn)},hidden:false};
let lastPlayer=null,createdPlayers=0;
class FakePlayer{
 constructor(id,opts){assert.equal(id,'ytPlayer');assert.equal(opts.playerVars.playsinline,1);this.opts=opts;this.clock=0;this.duration=120;this.pauses=0;createdPlayers++;lastPlayer=this}
 getDuration(){return this.duration}
 getCurrentTime(){return this.clock}
 pauseVideo(){this.pauses++}
 seekTo(time){this.clock=time}
 destroy(){this.destroyed=true}
 start(){this.opts.events.onReady({target:this})}
 emit(code){this.opts.events.onStateChange({data:code,target:this})}
}
const analyzer=require('../saiko-rhythm/beat-analyzer.js');
class FakeAudioContext{async decodeAudioData(){return {duration:120}}async close(){}}
const window={YT:{Player:FakePlayer},AudioContext:FakeAudioContext,devicePixelRatio:1,addEventListener(){},SaikoYouTubeCore:core,SaikoStudioCore:studio,SaikoBeatAnalyzer:{...analyzer,extractOnsets(){return [1.02,1.5,2.05,2.6,3.19,4.2,5.18]}}};
const context=vm.createContext({window,document,performance:{now(){return 1500}},console,
 requestAnimationFrame(fn){frames.push(fn);return frames.length},cancelAnimationFrame(){},Math,Set,Number,URL});
$('bpm').value='120';$('offset').value='0';$('level').value='normal';$('latency').value='0';$('videoUrl').value='https://youtu.be/dQw4w9WgXcQ';
new vm.Script(client).runInContext(context);
$('load').onclick();
assert.equal(createdPlayers,1);assert(lastPlayer);assert(lastPlayer.opts.videoId==='dQw4w9WgXcQ');
lastPlayer.start();assert(window.SaikoYouTubeGame.getState().ready);
$('prepare').onclick();assert.equal(window.SaikoYouTubeGame.getState().chart,null);
$('rights').checked=true;$('prepare').onclick();
assert.equal(window.SaikoYouTubeGame.getState().chart,null,'Never invent beatmap from BPM without audio');
lastPlayer.emit(1);
window.SaikoYouTubeGame.startRecording();
for(const t of [1.2,1.6,2.0,2.4,2.8,3.2]){lastPlayer.clock=t;window.SaikoYouTubeGame.captureRecordedTap()}
window.SaikoYouTubeGame.stopRecording();
const actual=window.SaikoYouTubeGame.getState().chart;assert(actual&&actual.notes.length===6);
$('restart').onclick();
lastPlayer.emit(2);
lastPlayer.clock=actual.notes[0].t+.02;
window.SaikoYouTubeGame.tap(actual.notes[0].lane);
assert.equal(window.SaikoYouTubeGame.getState().score,0,'Cannot score while YouTube is paused');
lastPlayer.emit(1);
window.SaikoYouTubeGame.tap(actual.notes[0].lane);
assert(window.SaikoYouTubeGame.getState().score>0);
const before=window.SaikoYouTubeGame.getState().score;
window.SaikoYouTubeGame.tap(actual.notes[0].lane);
assert.equal(window.SaikoYouTubeGame.getState().score,before,'No duplicate tap credit');

const oldNoteCount=window.SaikoYouTubeGame.getState().chart.notes.length;
// A recorded performance must produce a chart with the exact recorded beat times.
lastPlayer.clock=1.02;
window.SaikoYouTubeGame.startRecording();
assert.equal(window.SaikoYouTubeGame.getState().recording,true);
for(const t of [1.02,1.45,1.96,2.54,3.17]){
 lastPlayer.clock=t;window.SaikoYouTubeGame.captureRecordedTap();
}
assert.equal(window.SaikoYouTubeGame.getState().recordedCount,5);
window.SaikoYouTubeGame.stopRecording();
$('restart').onclick(); // user seeks to the beginning for a full playthrough
const beatChart=window.SaikoYouTubeGame.getState().chart;
assert.deepEqual(Array.from(beatChart.notes,n=>n.t),[1.02,1.45,1.96,2.54,3.17]);
assert.notEqual(beatChart.notes.length,oldNoteCount);

lastPlayer.emit(2);
assert.equal(window.SaikoYouTubeGame.getState().playing,false);
document.hidden=true;lastPlayer.emit(1);
listeners.get('doc:visibilitychange')();
assert.equal(lastPlayer.pauses,1,'Never allow background playback');
lastPlayer.emit(0);
assert.equal(window.SaikoYouTubeGame.getState().ended,true);
assert.equal(window.SaikoYouTubeGame.getState().perfect+window.SaikoYouTubeGame.getState().great+window.SaikoYouTubeGame.getState().good+window.SaikoYouTubeGame.getState().miss,window.SaikoYouTubeGame.getState().chart.notes.length,'Every note must count at video end, including missed notes');
assert.equal($('result').hidden,false);
assert($('result').textContent.includes('RANK'));
$('videoUrl').value='https://youtu.be/abcDEF123_-';$('load').onclick();
assert.equal(createdPlayers,2);
assert.equal(lastPlayer.opts.videoId,'abcDEF123_-');
assert.equal(window.SaikoYouTubeGame.getState().chart,null);
$('rights').checked=true;lastPlayer.start();
$('syncAudioFile').files=[{type:'audio/wav',size:110000,name:'licensed-original.wav',async arrayBuffer(){return new ArrayBuffer(64)}}];
$('syncShift').value='0.3';
(async()=>{
 await $('analyzeAudio').onclick();
 const mapped=window.SaikoYouTubeGame.getState().chart;
 assert(mapped&&mapped.notes.length===7,'Automatic beatmap uses detected music accents');
 assert.equal(mapped.notes[0].t,1.32,'Audio onset + video intro shift');
 assert($('audioAnalysisStatus').textContent.includes('検出'));
 console.log('PASS: real-audio-derived YouTube beatmap wiring using a separate licensed local audio file');
 // The draft autochart URL-only path must receive the BEATMAP JSON directly.
 let calls=0;
 $('chartEndpoint').value='https://private-chart.example';
 context.fetch=async(url,options)=>{
  calls++;
  assert.equal(url,'https://private-chart.example/api/chart');
  assert.equal(options.method,'POST');
  assert.equal(JSON.parse(options.body).video_id,'abcDEF123_-');
  assert(!options.body.includes('audio')&&!options.body.includes('youtube.com'));
  return {ok:true,json:async()=>({video_id:'abcDEF123_-',duration:120,notes:[
   {t:1.13,lane:0},{t:1.59,lane:2},{t:2.10,lane:3},{t:2.72,lane:1},{t:3.17,lane:0}
  ]})};
 };
 await $('autoChart').onclick();
 assert.equal(calls,1,'One request per manual autochart tap');
 const generated=window.SaikoYouTubeGame.getState().chart;
 assert(generated&&generated.notes.length===5,'Server-detected notes must play in the game');
 assert.deepEqual(Array.from(generated.notes,n=>n.t),[1.13,1.59,2.10,2.72,3.17]);
 assert($('status').textContent.includes('5個のノーツ'));
 console.log('PASS: YouTube URL -> private audio analysis gateway -> genuine timestamped playable notes');

})().catch(e=>{console.error(e);process.exitCode=1});
console.log('PASS: strict YouTube ID parsing, malicious host rejection, 3 difficulties, time-based judging');
console.log('PASS: official visible IFrame setup, rights gate only for gameplay, play/pause/finish/seek reset, no audio downloads');
console.log('PASS: frame hides when inactive and YouTube paused on background; no permanent video/track storage');
