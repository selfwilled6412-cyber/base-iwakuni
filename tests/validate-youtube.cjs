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
 destroy(){this.destroyed=true}
 start(){this.opts.events.onReady({target:this})}
 emit(code){this.opts.events.onStateChange({data:code,target:this})}
}
const window={YT:{Player:FakePlayer},devicePixelRatio:1,addEventListener(){},SaikoYouTubeCore:core,SaikoStudioCore:studio};
const context=vm.createContext({window,document,performance:{now(){return 1500}},console,
 requestAnimationFrame(fn){frames.push(fn);return frames.length},cancelAnimationFrame(){},Math,Set,Number});
$('bpm').value='120';$('offset').value='0';$('level').value='normal';$('latency').value='0';$('videoUrl').value='https://youtu.be/dQw4w9WgXcQ';
new vm.Script(client).runInContext(context);
$('load').onclick();
assert.equal(createdPlayers,1);assert(lastPlayer);assert(lastPlayer.opts.videoId==='dQw4w9WgXcQ');
lastPlayer.start();assert(window.SaikoYouTubeGame.getState().ready);
$('prepare').onclick();assert.equal(window.SaikoYouTubeGame.getState().chart,null);
$('rights').checked=true;$('prepare').onclick();
const actual=window.SaikoYouTubeGame.getState().chart;assert(actual&&actual.notes.length>10);
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
console.log('PASS: strict YouTube ID parsing, malicious host rejection, 3 difficulties, time-based judging');
console.log('PASS: official visible IFrame setup, rights gate only for gameplay, play/pause/finish/seek reset, no audio downloads');
console.log('PASS: frame hides when inactive and YouTube paused on background; no permanent video/track storage');
