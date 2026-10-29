/* Compact optional SFX shared by SAIKO games.
 * No network, autoplay, personal data, or non-original sounds. */
(()=>{'use strict';
 const KEY='saiko-sfx-enabled-v1';
 let enabled=true,ctx=null,lastCue=0,lastText='';
 try{enabled=localStorage.getItem(KEY)!=='off'}catch(e){}
 const root=document.body||document.documentElement;
 const menu=document.createElement('button');
 menu.type='button';menu.id='saikoSoundMenu';
 menu.setAttribute('aria-label','効果音の設定を開く');
 menu.style.cssText='position:fixed;right:11px;bottom:12px;z-index:1001;border:2px solid #eaf6ff;background:#162d5a;color:#fff;width:47px;height:47px;border-radius:50%;font:900 20px system-ui;box-shadow:0 3px 11px #040b2dbb;cursor:pointer';
 const panel=document.createElement('div');
 panel.id='saikoSoundPanel';panel.hidden=true;
 panel.style.cssText='position:fixed;right:11px;bottom:67px;width:min(275px,calc(100vw - 22px));z-index:1001;display:none;grid-template-columns:1fr 1fr;gap:8px;border:2px solid #9fc7ff;border-radius:14px;background:#152748;color:white;padding:11px;box-shadow:0 8px 25px #01071de0;font:800 13px system-ui';
 const toggle=document.createElement('button');
 toggle.type='button';toggle.id='saikoSoundToggle';toggle.setAttribute('aria-label','ゲームの効果音を切り替える');
 const test=document.createElement('button');
 test.type='button';test.id='saikoSoundTest';test.textContent='🎵 音テスト';
 const statusElement=document.createElement('div');
 statusElement.id='saikoSoundStatus';statusElement.setAttribute('role','status');
 statusElement.style.cssText='grid-column:1/-1;font:700 12px system-ui;line-height:1.6;color:#dceeff';
 for(const el of [toggle,test]){
  el.style.cssText='min-height:43px;border:1px solid #a0c9eb;border-radius:10px;background:#315077;color:white;font:850 12px system-ui;cursor:pointer;padding:7px 5px';
 }
 panel.append(toggle,test,statusElement);
 root.append(menu,panel);
 let open=false;
 function render(){
  menu.textContent=enabled?'🔊':'🔇';
  toggle.textContent=enabled?'🔊 効果音 ON':'🔇 効果音 OFF';
  toggle.setAttribute('aria-pressed',String(enabled));
  menu.setAttribute('aria-expanded',String(open));
  panel.hidden=!open;panel.style.display=open?'grid':'none';
 }
 function status(message){statusElement.textContent=message}
 render();
 menu.addEventListener('click',e=>{
  e.stopPropagation();open=!open;status(enabled?'音が聞こえるか「音テスト」で確認してね':'効果音はOFFです');
  render();
 });
 function context(){
  if(!enabled)return null;
  if(ctx?.state==='closed')ctx=null;
  if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{ctx=new AC()}catch(e){return null}}
  if(ctx.state==='suspended'&&typeof ctx.resume==='function')ctx.resume().catch(()=>status('⚠️ 音声再生が制限されています。ブラウザで開いてね'));
  return ctx;
 }
 function tone(freq,duration=.12,volume=.11,delay=0,type='sine'){
  const a=context();if(!a)return;
  try{
   const t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();
   o.type=type;o.frequency.setValueAtTime(freq,t);
   g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.007);
   g.gain.exponentialRampToValueAtTime(.0001,t+duration);
   o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+duration+.018);
  }catch(e){status('⚠️ 効果音を作成できませんでした')}
 }
 function cue(kind='tap'){
  if(!enabled)return;
  if(kind==='win'){tone(659,.15,.15,0);tone(880,.16,.15,.15);tone(1047,.27,.12,.31)}
  else if(kind==='fail'){tone(280,.14,.105,0,'triangle');tone(220,.22,.095,.12,'triangle')}
  else tone(560,.11,.11,0,'triangle');
 }
 toggle.addEventListener('click',e=>{
  e.stopPropagation();enabled=!enabled;try{localStorage.setItem(KEY,enabled?'on':'off')}catch(err){}
  render();status(enabled?'🔊 効果音をONにしました':'🔇 効果音をOFFにしました');
  if(enabled)cue('tap');
 });
 test.addEventListener('click',e=>{
  e.stopPropagation();
  if(!enabled){status('🔇 効果音をONにしてから試してね');return}
  if(!(window.AudioContext||window.webkitAudioContext)){status('⚠️ このブラウザはWebAudioに対応していません');return}
  const audio=context();
  if(!audio){status('⚠️ 音声エンジンを起動できません');return}
  status('音声出力を確認中…');
  const play=()=>{
   if(audio.state!=='running'){status('⚠️ ブラウザに音声再生をブロックされました。Chromeで直接開いてね');return}
   cue('win');status('🔊 テスト音を出力中。聞こえなければメディア音量と出力先を確認してね');
  };
  if(audio.state==='running')play();
  else if(typeof audio.resume==='function')audio.resume().then(play).catch(()=>status('⚠️ 音声再生が許可されませんでした'));
  else status('⚠️ このブラウザでは音が鳴らせません');
 });
 document.addEventListener('click',e=>{
  const t=e.target;
  if(!t||typeof t.closest!=='function')return;
  if(t.closest('#saikoSoundPanel,#saikoSoundMenu'))return;
  if(t.closest('button,[role="button"],input[type="button"],input[type="submit"],.gameCell,.tile,.cell,.cardChoice')){
   if(!['a_draw','a_repeat'].includes(t.id))cue('tap');
  }
 },true);
 const ids=['feedback','gameFeedback','status','info','win','extraHint'];
 if(typeof MutationObserver!=='undefined')for(const id of ids){
  const node=document.getElementById(id);if(!node)continue;
  new MutationObserver(()=>{
   if(!enabled||node.hidden)return;
   const value=(node.textContent||'').replace(/\s+/g,' ').trim().slice(0,250);
   if(!value||value===lastText)return;
   const now=Date.now();if(now-lastCue<350)return;
   let kind=null;
   if(/(おめでとう|クリア！|脱出成功|大正解|正解！|勝利！|大成功|PERFECT)/i.test(value))kind='win';
   else if(/(不正解|失敗！|残念！|ゲームオーバー)/.test(value))kind='fail';
   if(kind){lastText=value;lastCue=now;cue(kind)}
  }).observe(node,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 }
 window.addEventListener('pagehide',()=>{if(ctx)try{ctx.close()}catch(e){}});
})();