/* SAIKO SPOT DIFFERENCE • 90 deterministic illustrated puzzles.
 * The vector scene and hit target indices are generated from the same data:
 * right-hand changes can never drift away from their answer locations. */
(function(root,factory){
 const core=factory();
 if(typeof module==='object'&&module.exports)module.exports=core;
 if(root)root.SaikoSpotCore=core;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const LEVELS=[{id:'easy',name:'初級',count:10},{id:'normal',name:'中級',count:20},{id:'hard',name:'上級',count:30}];
 const THEMES=[
  ['おかしの国','#ffe0ee','#f4a1d2','#8c55cb','🍭'],['星空の遊園地','#091c54','#4035a9','#df67c5','🎡'],
  ['海底たんけん','#88e7f4','#2aaad5','#155bb3','🐠'],['もりのピクニック','#daf5bc','#8ccd74','#278c63','🌲'],
  ['おもちゃの街','#ffecc3','#f6ad5c','#eb5a72','🧸'],['宇宙のキャンプ','#141b52','#6066c8','#c49eff','🚀'],
  ['花いっぱいの庭','#dff9f6','#97d7c9','#42a5a0','🌷'],['ふしぎな水族館','#c7f4ff','#68c4ea','#3966d1','🐬'],
  ['にぎやかなお祭り','#fff0cd','#ffb462','#ee5a74','🎆'],['虹色の魔法学校','#eae4ff','#ae99f1','#6d58c7','🔮'],
  ['カフェのテラス','#ffe3ca','#d5a279','#9a5d74','☕'],['空と雲の広場','#d8efff','#90c5f6','#4c93da','☁️'],
  ['雪のプレゼント屋','#d5effa','#95c7dc','#4d7fa5','🎁'],['宝石の洞窟','#241d57','#5248a5','#b96ce5','💎'],
  ['サーカスの町','#ffe3c0','#eea75b','#d95197','🎪'],['フルーツ市場','#fff1c3','#c5df79','#7bac55','🍊'],
  ['小さな動物園','#ecf7d4','#b2dd8f','#6da376','🦊'],['きらきら夜景','#202d67','#5a78bf','#eeaf5d','🌃']
 ];
 const ICONS=['🍎','🐱','⭐','🍓','🦋','🎸','🐼','🎂','🚀','🍀','🦄','🌻','🧁','🐸','🎈','🦊','🐟','🍒','🍩','⚽','🪁','🧸','🐰','🎮','🍦','🌈','🧩','🍪','🦜','💐','🎁','🐣','🍕','🛸','🍍','🍉','🎃','🦉','🍋','🚗','🐝','🎠','🎨','🌼','🍄','🪐','🐧','🍬'];
 const OBJECTS=30,GRID_COLS=6,GRID_ROWS=5,WIDTH=960,HEIGHT=660;
 function rng(seed){let x=(seed>>>0)||1;return ()=>{x=(x+0x6D2B79F5)|0;let t=Math.imul(x^(x>>>15),1|x);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
 function shuffle(a,random){const out=[...a];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
 function makePuzzle(level,index){
  const difficulty=LEVELS.find(x=>x.id===level);
  if(!difficulty||!Number.isInteger(index)||index<0||index>=30)throw Error('問題が見つかりません');
  const seed=(0x5a17b001+(LEVELS.indexOf(difficulty)*10391+index)*12667)>>>0;
  const random=rng(seed);
  const theme=THEMES[(index*7+LEVELS.indexOf(difficulty)*5)%THEMES.length];
  const spots=new Set(shuffle(Array.from({length:OBJECTS},(_,i)=>i),random).slice(0,difficulty.count));
  const icons=shuffle(ICONS,random).slice(0,OBJECTS);
  const objects=icons.map((icon,i)=>{
   const x=85+(i%GRID_COLS)*160+(random()-.5)*24;
   const y=137+Math.floor(i/GRID_COLS)*110+(random()-.5)*13;
   const rotation=(random()-.5)*16;
   const alt=ICONS[(ICONS.indexOf(icon)+11+Math.floor(random()*24))%ICONS.length];
   return {i,icon,alt,x:Math.round(x),y:Math.round(y),rotation:Math.round(rotation),
    hue:Math.floor(random()*360),stamp:Math.floor(random()*4),different:spots.has(i)};
  });
  return {id:level+'-'+String(index+1).padStart(2,'0'),seed,level,index,
   count:difficulty.count,theme,objects,spots:[...spots].sort((a,b)=>a-b)};
 }
 const escape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function sceneBackground(p){
  const [name,a,b,c,emoji]=p.theme;
  const nameSafe=escape(name);
  const night=['夜','星空','宇宙','洞窟'].some(s=>name.includes(s));
  const rays=Array.from({length:15},(_,i)=>{
   const x=(i*79+p.seed%73)%WIDTH,y=(i*137+p.seed%61)%HEIGHT;
   return '<circle cx="'+x+'" cy="'+y+'" r="'+(i%3+2)+'" fill="'+(night?'#ffffff66':'#ffffffb5')+'"/>';
  }).join('');
  const stripes=Array.from({length:5},(_,r)=>{
   const y=108+r*110;
   return '<rect x="22" y="'+(y+25)+'" width="916" height="6" rx="3" fill="#ffffff48"/>'+
    '<path d="M30 '+(y+38)+' Q480 '+(y+48)+' 930 '+(y+38)+'" fill="none" stroke="'+c+'" stroke-opacity=".18" stroke-width="10"/>';
  }).join('');
  return '<defs><linearGradient id="bg" x2=".9" y2="1"><stop stop-color="'+a+'"/><stop offset=".58" stop-color="'+b+'"/><stop offset="1" stop-color="'+c+'"/></linearGradient>'+
   '<pattern id="dots" width="42" height="42" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="2.1" fill="#fff" opacity=".23"/></pattern></defs>'+
   '<rect width="960" height="660" rx="22" fill="url(#bg)"/><rect width="960" height="660" rx="22" fill="url(#dots)"/>'+
   '<path d="M0 90 Q220 43 420 89 T960 79 L960 0 H0Z" fill="#fff" opacity=".17"/>'+stripes+rays+
   '<rect x="14" y="11" width="932" height="76" rx="20" fill="#09193a" opacity=".60"/>'+
   '<text x="42" y="61" font-family="sans-serif" font-size="31" font-weight="900" fill="#fff">'+escape(emoji)+' '+nameSafe+'</text>'+
   '<g fill="#ffffff77"><circle cx="875" cy="50" r="20"/><circle cx="920" cy="50" r="11"/></g>'+
   '<rect x="15" y="90" width="930" height="557" rx="23" fill="#fff" opacity=".08"/>';
 }
 function objectMarkup(obj,side,found=false,hint=false){
  const changed=side==='right'&&obj.different;
  const emoji=changed?obj.alt:obj.icon;
  const tilt=obj.rotation;
  const x=obj.x,y=obj.y;
  const glow='hsl('+obj.hue+',85%,90%)';
  const band='hsl('+obj.hue+',76%,60%)';
  const variant=changed?1:0;
  const ellipseY=obj.stamp%2===0?19:24;
  return '<g class="thing" data-slot="'+obj.i+'" tabindex="0" role="button" aria-label="'+(obj.i+1)+'番の絵" transform="translate('+x+' '+y+')">'+
    '<rect x="-72" y="-46" width="144" height="98" rx="22" fill="#fff" opacity=".13"/>'+
    '<ellipse cx="0" cy="'+ellipseY+'" rx="54" ry="24" fill="#101830" opacity=".22"/>'+
    '<path d="M-58 37 Q0 54 58 37" fill="none" stroke="'+band+'" stroke-width="6" opacity=".65"/>'+
    '<g transform="rotate('+tilt+')"><circle cy="-2" r="43" fill="'+glow+'" opacity=".79" stroke="#fff" stroke-width="4"/>'+
    '<text text-anchor="middle" dominant-baseline="central" y="-2" font-family="sans-serif" font-size="63" class="itemEmoji">'+escape(emoji)+'</text></g>'+
    '<rect x="-78" y="-51" width="156" height="108" rx="23" fill="transparent" class="hitBox"/>'+
    (hint?'<circle r="50" stroke="#fff" stroke-dasharray="11 8" stroke-width="8" fill="none" class="hintRing"/>':'')+
    (found?'<circle r="50" stroke="#66fff1" stroke-width="8" fill="none" class="foundRing"/><path d="M-20 4 L-4 20 L28 -18" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>':'')+
    '</g>';
 }
 function render(p,side,found=[],hint=-1){
  if(side!=='left'&&side!=='right')throw Error('side');
  const done=new Set(found);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 660" role="img" aria-label="'+escape(p.theme[0])+'の'+(side==='left'?'左':'右')+'の絵" width="100%" height="100%">'+
   sceneBackground(p)+p.objects.map(o=>objectMarkup(o,side,done.has(o.i),hint===o.i&&!done.has(o.i))).join('')+'</svg>';
 }
 return Object.freeze({LEVELS,THEMES,ICONS,makePuzzle,render,OBJECTS,WIDTH,HEIGHT});
});
