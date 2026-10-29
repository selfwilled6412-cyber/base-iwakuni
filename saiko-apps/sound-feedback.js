/* Shared optional SFX for SAIKO games (no external assets, no autoplay).
 * All notes are tiny original WebAudio feedback sounds, initiated after user action.
 * Persistent sound preference contains no personal data. */
(()=>{'use strict';
 const KEY='saiko-sfx-enabled-v1';
 let enabled=true,ctx=null,lastCue=0,lastText='';
 try{enabled=localStorage.getItem(KEY)!=='off'}catch(e){}
 const button=document.createElement('button');
 button.type='button';button.id='saikoSoundToggle';
 button.setAttribute('aria-label','ゲームの効果音の切り替え');
 button.style.cssText='position:fixed;right:10px;bottom:12px;z-index:1000;border:2px solid #fff;background:#192c65;color:#fff;font:900 13px system-ui;padding:10px;min-height:45px;border-radius:13px;box-shadow:0 4px 15px #07092099;cursor:pointer';
 function render(){button.textContent=enabled?'🔊 効果音 ON':'🔇 効果音 OFF';button.setAttribute('aria-pressed',String(enabled))}
 render();
 (document.body||document.documentElement).appendChild(button);
 const testButton=document.createElement('button');
 testButton.type='button';testButton.id='saikoSoundTest';
 testButton.textContent='🎵 音テスト';
 testButton.setAttribute('aria-label','ゲーム音声の試聴');
 testButton.style.cssText='position:fixed;right:147px;bottom:12px;z-index:1000;border:2px solid #eaf5ff;background:#2b5674;color:#fff;font:900 13px system-ui;padding:10px;min-height:45px;border-radius:13px;box-shadow:0 4px 15px #07092099;cursor:pointer';
 (document.body||document.documentElement).appendChild(testButton);
 const audioStatus=document.createElement('div');
 audioStatus.setAttribute('role','status');
 audioStatus.style.cssText='position:fixed;right:10px;bottom:66px;max-width:270px;z-index:1000;border-radius:10px;padding:8px 10px;background:#192d4be9;color:#fff;font:700 12px system-ui;display:none';
 (document.body||document.documentElement).appendChild(audioStatus);
 function status(text){audioStatus.textContent=text;audioStatus.style.display='block'}
 
 function context(){
  if(!enabled)return null;
  if(ctx&&ctx.state==='closed')ctx=null;
  if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{ctx=new AC()}catch(e){return null}}
  if(ctx.state==='suspended')ctx.resume().catch(()=>{status('⚠️ 音声再生がブロックされました。Chromeで開いて音量を確認してね')});
  return ctx;
 }
 function tone(freq,duration=.07,volume=.045,delay=0,type='sine'){
  const a=context();if(!a)return;
  try{
   const t=a.currentTime+delay,osc=a.createOscillator(),gain=a.createGain();
   osc.type=type;osc.frequency.setValueAtTime(freq,t);
   gain.gain.setValueAtTime(.0001,t);
   gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.007);
   gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
   osc.connect(gain);gain.connect(a.destination);osc.start(t);osc.stop(t+duration+.015);
  }catch(e){}
 }
 function cue(kind){
  if(!enabled)return;
  if(kind==='win'){
   tone(659,.15,.15,0);tone(880,.16,.15,.15);tone(1047,.27,.12,.31);
  }else if(kind==='fail'){
   tone(280,.14,.105,0,'triangle');tone(220,.22,.095,.12,'triangle');
  }else tone(560,.11,.11,0,'triangle');
 }
 testButton.addEventListener('click',e=>{
  e.stopPropagation();
  if(!enabled){status('🔇 効果音がOFFです。ONにしてからテストしてね');return}
  if(!(window.AudioContext||window.webkitAudioContext)){status('⚠️ このブラウザはゲーム音に非対応です。ChromeまたはEdgeで開いてね');return}
  cue('win');status('🎵 テスト音を再生しました。聞こえない場合は端末のメディア音量を上げてみてね');
 });
 button.addEventListener('click',e=>{
  e.stopPropagation();enabled=!enabled;try{localStorage.setItem(KEY,enabled?'on':'off')}catch(err){}
  render();status(enabled?'🔊 効果音ON。🎵音テストで確認できるよ':'🔇 効果音OFF');if(enabled)cue('tap');
 });
 function isAction(target){
  return target&&typeof target.closest==='function'&&
   target.closest('button:not(#saikoSoundToggle),[role="button"],input[type="button"],input[type="submit"],.gameCell,.tile,.cell,.cardChoice');
 }
 document.addEventListener('click',e=>{if(isAction(e.target)&&e.target?.id!=='saikoSoundTest')cue('tap')},true);
 // Chimes on genuine status changes in the game; never inspect page content for music.
 const ids=['feedback','gameFeedback','status','info','win','extraHint'];
 if(typeof MutationObserver!=='undefined'){
  for(const id of ids){
   const node=document.getElementById(id);if(!node)continue;
   const watcher=new MutationObserver(()=>{
    if(!enabled||node.hidden)return;
    const text=(node.textContent||'').replace(/\s+/g,' ').trim().slice(0,250);
    if(!text||text===lastText)return;
    const now=Date.now();if(now-lastCue<350)return;
    let kind=null;
    if(/(おめでとう|クリア！|脱出成功|大正解|正解！|勝利！|大成功|PERFECT)/i.test(text))kind='win';
    else if(/(不正解|失敗！|残念！|ゲームオーバー)/.test(text))kind='fail';
    if(kind){lastText=text;lastCue=now;cue(kind)}
   });
   watcher.observe(node,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  }
 }
 window.addEventListener('pagehide',()=>{if(ctx){try{ctx.close()}catch(e){}}});
})();
