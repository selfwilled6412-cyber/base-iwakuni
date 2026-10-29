#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'saiko-party-games/bingo-voice.js'),'utf8');
const html=fs.readFileSync(path.join(root,'saiko-party-games/index.html'),'utf8');
const game=fs.readFileSync(path.join(root,'saiko-party-games/app.js'),'utf8');
assert(html.includes('bingo-voice.js')&&html.indexOf('bingo-voice.js')<html.indexOf('app.js'));
assert(game.includes('SaikoBingoVoice?.say(called)'),'Draw must speak directly on user action');
assert(game.includes('a_repeat')&&game.includes('a_voice'),'Expose replay and voice toggle');
const store={},node={textContent:''},spoken=[];
class Utterance{constructor(text){this.text=text}}
const window={
 SpeechSynthesisUtterance:Utterance,
 speechSynthesis:{cancel(){},getVoices(){return [{lang:'ja-JP',name:'Japanese'}]},speak(u){spoken.push(u)}},
 localStorage:{getItem(k){return store[k]},setItem(k,v){store[k]=v}},
 document:{getElementById(){return node}}
};
vm.runInNewContext(script,{window});
const voice=window.SaikoBingoVoice;
assert.equal(voice.getText(59),'ジー、59番！');
assert.equal(voice.getText(1),'ビー、1番！');
assert.equal(voice.getText(75),'オー、75番！');
assert.equal(voice.getText(76),'');
assert(voice.say(59));assert.equal(spoken[0].text,'ジー、59番！');
assert.equal(spoken[0].lang,'ja-JP');assert.equal(spoken[0].volume,1);
assert.equal(spoken[0].voice.lang,'ja-JP');
voice.toggle();assert.equal(store['saiko-bingo-voice-v2'],'off');
assert.equal(voice.say(1),false);assert.equal(spoken.length,1);
voice.toggle();assert.equal(voice.say(75),true);assert.equal(spoken.length,2);
const yt=fs.readFileSync(path.join(root,'saiko-rhythm/youtube.html'),'utf8');
assert(yt.includes('class="quickLaunch"')&&yt.includes('class="consentDialog"'));
assert(yt.includes('main > .layout{order:1')&&yt.includes('main > .compactSettings{order:2'));
assert(yt.indexOf('id="videoUrl"')<yt.indexOf('id="studioSettings"'));
assert(yt.indexOf('id="consentDialog"')>yt.indexOf('id="gameCanvas"'),'Consent cannot block the first screen');
console.log('PASS: Japanese BINGO speech with replay, mute, language, legal one-time consent, game-first layout');
