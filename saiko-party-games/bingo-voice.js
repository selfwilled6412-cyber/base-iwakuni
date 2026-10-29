/* Bingo caller voice: uses browser/device speech engine only, no audio asset or server. */
(function(root){'use strict';
 const key='saiko-bingo-voice-v2';
 const label=['B','I','N','G','O'];
 const alphabet=['ビー','アイ','エヌ','ジー','オー'];
 let enabled=true,lastResult='';try{enabled=root.localStorage?.getItem(key)!=='off'}catch(e){}
 function announceStatus(message){
  lastResult=message;
  const n=root.document?.getElementById('bingoVoiceStatus');
  if(n)n.textContent=message;
 }
 function supported(){return !!(root.speechSynthesis&&root.SpeechSynthesisUtterance)}
 function cancel(){try{root.speechSynthesis?.cancel()}catch(e){}}
 function isEnabled(){return enabled}
 function toggle(){
  enabled=!enabled;
  try{root.localStorage?.setItem(key,enabled?'on':'off')}catch(e){}
  if(!enabled)cancel();
  announceStatus(enabled?'🔊 読み上げON：次の数字から自動で読みます':'🔇 読み上げOFF');
  return enabled;
 }
 function getText(number){
  if(!Number.isInteger(number)||number<1||number>75)return '';
  const group=Math.floor((number-1)/15);
  return alphabet[group]+'、'+number+'番！';
 }
 function say(number){
  if(!enabled){announceStatus('🔇 読み上げOFFです');return false}
  const phrase=getText(number);
  if(!phrase)return false;
  if(!supported()){announceStatus('⚠️ このブラウザの音声読み上げに非対応です。ChromeまたはEdgeで開いてね');return false}
  try{
   const engine=root.speechSynthesis;engine.cancel();
   const utterance=new root.SpeechSynthesisUtterance(phrase);
   utterance.lang='ja-JP';utterance.rate=.84;utterance.pitch=1;utterance.volume=1;
   const voices=engine.getVoices?.()||[];
   const ja=voices.find(v=>(v.lang||'').toLowerCase()==='ja-jp')||voices.find(v=>(v.lang||'').toLowerCase().startsWith('ja'));
   if(ja)utterance.voice=ja;
   utterance.onstart=()=>announceStatus('🔊 '+label[Math.floor((number-1)/15)]+'-'+number+' を読み上げ中');
   utterance.onend=()=>announceStatus('✅ '+label[Math.floor((number-1)/15)]+'-'+number+' を読み上げました');
   utterance.onerror=()=>announceStatus('⚠️ 読み上げに失敗。ブラウザの音声・メディア音量を確認してね');
   engine.speak(utterance);
   announceStatus('🎙️ '+label[Math.floor((number-1)/15)]+'-'+number+' を読み上げます');
   return true;
  }catch(e){announceStatus('⚠️ 音声読み上げを開始できません。Chromeで試してね');return false}
 }
 const api=Object.freeze({say,toggle,cancel,getText,isEnabled,supported,getStatus:()=>lastResult});
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.SaikoBingoVoice=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null);
