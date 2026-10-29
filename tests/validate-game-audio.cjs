#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'saiko-apps/sound-feedback.js'),'utf8');
new vm.Script(source);
const events={},observers={},buttons=[],store={};let played=0;
class Param{setValueAtTime(){}exponentialRampToValueAtTime(){}}
class Node{constructor(){this.frequency=new Param();this.gain=new Param()}connect(){return this}start(){played++}stop(){}}
class AC{constructor(){this.currentTime=0;this.state='running';this.destination=new Node()}createOscillator(){return new Node()}createGain(){return new Node()}async close(){}async resume(){}}
function makeNode(id=''){
 return {id,hidden:false,textContent:'',style:{},attrs:{},listeners:{},children:[],
 setAttribute(key,value){this.attrs[key]=value},
 addEventListener(k,fn){this.listeners[k]=fn},append(...parts){this.children.push(...parts)},
 closest(sel){return sel.includes('button')?this:null}};
}
const status=Object.fromEntries(['feedback','gameFeedback','status','info','win','extraHint'].map(id=>[id,makeNode(id)]));
const document={body:{append(...parts){buttons.push(...parts)}},documentElement:{append(...parts){buttons.push(...parts)}},createElement(){return makeNode()},getElementById(id){return status[id]},addEventListener(k,fn){events[k]=fn}};
class MutationObserver{constructor(fn){this.fn=fn}observe(node){observers[node.id]=this.fn}}
const localStorage={getItem(k){return store[k]||null},setItem(k,v){store[k]=v}};
const window={AudioContext:AC,addEventListener(){}};
vm.runInNewContext(source,{document,window,localStorage,MutationObserver,Date,Math});
assert.equal(buttons.length,2,'Only one compact sound launcher plus its closed panel may occupy the page');
const menu=buttons[0],panel=buttons[1],toggle=panel.children[0],test=panel.children[1];
assert.equal(panel.hidden,true,'Sound controls must be hidden while playing');
assert.equal(played,0,'No audio before gesture');
events.click({target:makeNode('start')});
assert(played>0,'Click must create playable sound');
menu.listeners.click({stopPropagation(){}});
assert.equal(panel.hidden,false,'Small speaker icon opens test and mute menu');
const beforeTest=played;test.listeners.click({stopPropagation(){}});assert(played>beforeTest,'Sound test must play a chime');
const count=played;toggle.listeners.click({stopPropagation(){}});
assert.equal(store['saiko-sfx-enabled-v1'],'off');events.click({target:makeNode('start')});assert.equal(played,count);
toggle.listeners.click({stopPropagation(){}});
assert.equal(store['saiko-sfx-enabled-v1'],'on');status.feedback.textContent='大正解！';
observers.feedback();assert(played>count+1,'Correct answer must make a win chime');
menu.listeners.click({stopPropagation(){}});
assert.equal(panel.hidden,true,'Sound panel must close without obstructing gameplay');
for(const folder of ['saiko-adventure','saiko-kids','saiko-solo-arcade','saiko-party-games','saiko-card-games','lumi-escape','lumi-escape-2','lumi-nazotoki']){
 const html=fs.readFileSync(path.join(root,folder,'index.html'),'utf8');
 assert(html.includes('../saiko-apps/sound-feedback.js'),folder+' missing sound module');
}
console.log('PASS: shared SFX has no autoplay; click, win, mute toggling works in eight game series');
