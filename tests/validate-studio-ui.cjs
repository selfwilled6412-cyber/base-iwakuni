#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const handler=new Map(),nodes=new Map(),storageData=new Map();
let downloads=0;const canvasCtx={setTransform(){},clearRect(){},fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},roundRect(){},fill(){},fillText(){}};
function element(id){
 return {id,value:{bpm:'120',offset:'0',level:'normal',latency:'0'}[id]||'',files:[],checked:false,hidden:false,innerHTML:'',textContent:'',disabled:false,style:{},dataset:{},duration:15,currentTime:0,paused:true,ended:false,controls:true,
 getContext(){return canvasCtx},getBoundingClientRect(){return {width:800,height:320,left:0,top:0}},scrollIntoView(){},removeAttribute(){},focus(){},load(){},
 classList:{add(){},remove(){},toggle(){}},addEventListener(name,fn){handler.set(id+':'+name,fn)},replaceChildren(){},append(){},remove(){},pause(){this.paused=true},async play(){this.paused=false},click(){downloads++}};
}
const get=id=>nodes.get(id)||(nodes.set(id,element(id)),nodes.get(id));
const pads=Array.from({length:4},(_,i)=>{const p=element('pad'+i);p.dataset.lane=String(i);return p});
const document={getElementById:get,querySelectorAll(q){return q==='[data-lane]'?pads:[]},createElement(){return element('download')},body:{append(){}},addEventListener(k,fn){handler.set('doc:'+k,fn)}};
const localStorage={getItem(k){return storageData.get(k)||null},setItem(k,v){storageData.set(k,v)}};
const URL={createObjectURL(){return 'blob:offline-test'},revokeObjectURL(){}};
class AudioContext{
 async decodeAudioData(){return {sampleRate:8000,getChannelData(){return new Float32Array(8000*12)}}}
 async close(){}
}
const window={AudioContext,devicePixelRatio:1,addEventListener(){}};
const context=vm.createContext({window,document,localStorage,URL,Blob:class{},console,Float32Array,
 setTimeout(){return 1},setInterval(){return 2},clearInterval(){},Date,Math});
new vm.Script(source('saiko-rhythm/studio-core.js'),{filename:'studio-core.js'}).runInContext(context);
new vm.Script(source('saiko-rhythm/studio.js'),{filename:'studio.js'}).runInContext(context);
(async()=>{
 const api=window.SaikoBeatStudio;assert(api);
 get('audioFile').files=[{type:'audio/wav',size:250000,name:'own-composition.wav',async arrayBuffer(){return new ArrayBuffer(10)}}];
 handler.get('audioFile:change')();
 get('audio').onloadedmetadata();
 assert(get('setupStatus').textContent.includes('own-composition.wav'));
 await get('generate').onclick();
 assert.equal(api.getChart(),null,'No audio chart until rights acknowledgement');
 get('rights').checked=true;
 await get('generate').onclick();
 const chart=api.getChart();
 assert(chart&&chart.notes.length>5&&get('editor').hidden===false);
 assert.equal(chart.duration,15);
 const before=chart.notes.length;
 // Edit and undo one note.
 const canvasEvent=handler.get('timeline:pointerdown');
 canvasEvent({clientX:370,clientY:35});
 assert(api.getChart().notes.length>=before-1&&api.getChart().notes.length<=before+1);
 get('undo').onclick();
 assert.equal(api.getChart().notes.length,before);
 get('saveLocal').onclick();
 assert(storageData.has('saiko-beat-studio-chart-v1'));
 get('export').onclick();
 assert.equal(downloads,1);
 await get('startTest').onclick();
 assert.equal(api.getMode(),'play');
 const note=api.getChart().notes[0];
 get('audio').currentTime=note.t+.03;
 pads[note.lane]&&handler.get(pads[note.lane].id+':pointerdown')({preventDefault(){}});
 assert(Number(get('score').textContent.replace(/,/g,''))>0,'Tap near a note earns score');
 get('audio').ended=true;get('audio').currentTime=15;
 handler.get('audio:ended')();
 assert.equal(get('result').hidden,false);
 assert.equal(api.getMode(),'edit');
 assert(get('result').textContent!=='');
 const imported=JSON.stringify(chart),file={size:imported.length,async text(){return imported}};
 get('importFile').files=[file];
 await handler.get('importFile:change')();
 assert.equal(api.getChart().notes.length,before);
 console.log('PASS: studio UI upload -> rights gate -> generated chart -> editor undo -> JSON save/export');
 console.log('PASS: playable file audio -> scored pad hit -> end rank -> JSON import, with no network mock');
})().catch(e=>{console.error(e);process.exitCode=1});
