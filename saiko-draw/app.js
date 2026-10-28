(() => {
'use strict';
const $=id=>document.getElementById(id),canvas=$('drawing'),ctx=canvas.getContext('2d');
const W=1200,H=800,KEY='saiko-draw-v1';
const COLORS=['#ec505e','#f58e45','#f8d13e','#62b878','#38aaca','#3679d7','#885dd4','#e47bcc','#30384a','#ffffff','#000000','#986b45'];
let state={template:'white',tool:'pen',stamp:'star',color:'#ec505e',size:12,ops:[]},history=[],future=[],active=null;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const allowedTypes=new Set(['stroke','stamp']),allowedTools=new Set(['pen','eraser','stamp']);
function validate(raw){
 if(!raw||typeof raw!=='object'||!Array.isArray(raw.ops))throw Error('bad save');
 const validTemplates=['white','sky','space','park','grid'];
 const v={template:validTemplates.includes(raw.template)?raw.template:'white',tool:allowedTools.has(raw.tool)?raw.tool:'pen',stamp:typeof raw.stamp==='string'&&['star','heart','flower','sun','cat','rocket','sparkle','rainbow'].includes(raw.stamp)?raw.stamp:'star',color:/^#[0-9a-fA-F]{6}$/.test(raw.color)?raw.color:'#ec505e',size:clamp(Number(raw.size)||12,3,65),ops:[]};
 for(const op of raw.ops.slice(-380)){
  if(!allowedTypes.has(op?.kind))continue;
  if(op.kind==='stroke'){
    if(!['pen','eraser'].includes(op.tool)||!Array.isArray(op.points))continue;
    const points=op.points.slice(0,3000).filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)).map(p=>[clamp(p[0],0,W),clamp(p[1],0,H)]);
    if(!points.length)continue;
    v.ops.push({kind:'stroke',tool:op.tool,color:/^#[0-9a-fA-F]{6}$/.test(op.color)?op.color:'#30384a',size:clamp(Number(op.size)||12,3,65),points});
  } else {
    if(typeof op.symbol!=='string'||!['star','heart','flower','sun','cat','rocket','sparkle','rainbow'].includes(op.symbol))continue;
    v.ops.push({kind:'stamp',symbol:op.symbol,x:clamp(Number(op.x)||0,0,W),y:clamp(Number(op.y)||0,0,H),size:clamp(Number(op.size)||32,3,65),color:/^#[0-9a-fA-F]{6}$/.test(op.color)?op.color:'#ec505e'});
  }
 }
 return v;
}
try{const raw=localStorage.getItem(KEY);if(raw){state=validate(JSON.parse(raw));}}catch(e){}
let persistTimer=0;
function saveSoon(){clearTimeout(persistTimer);persistTimer=window.setTimeout(()=>{
 try{localStorage.setItem(KEY,JSON.stringify(state));$('status').textContent='✅ この端末に作品を一時保存したよ。';}
 catch(e){$('status').textContent='保存容量がいっぱいだよ。PNG画像で保存してね。';}
},400);}
function updateButtons(){
 $('undo').disabled=state.ops.length===0;
 $('redo').disabled=future.length===0;
 $('sizeText').textContent=String(state.size);
 $('size').value=String(state.size);
 $('template').value=state.template;
 $('customColor').value=state.color;
 for(const b of document.querySelectorAll('[data-tool]')){const act=b.dataset.tool===state.tool;b.classList.toggle('active',act);b.setAttribute('aria-pressed',String(act));}
 for(const b of document.querySelectorAll('[data-stamp]')){const act=b.dataset.stamp===state.stamp;b.classList.toggle('active',act);b.setAttribute('aria-pressed',String(act));}
 for(const b of document.querySelectorAll('[data-color]'))b.classList.toggle('active',b.dataset.color.toLowerCase()===state.color.toLowerCase());
}
function drawStar(c,x,y,r,color){
 c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2===0?r:r*.48;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fillStyle=color;c.fill();
}
function rounded(c,x,y,w,h,r,fill){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();}
function drawBackground(){
 ctx.save();ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
 if(state.template==='white'){ctx.restore();return;}
 if(state.template==='grid'){
  ctx.strokeStyle='#daeaf7';ctx.lineWidth=2;for(let x=0;x<=W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<=H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}ctx.restore();return;
 }
 const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,state.template==='space'?'#17275a':'#b7eaff');g.addColorStop(1,state.template==='space'?'#6863ba':'#fffbe4');
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 if(state.template==='space'){
  for(let i=0;i<45;i++){const x=(i*193+67)%W,y=(i*107+37)%H;drawStar(ctx,x,y,4+(i%4),i%3===0?'#fff4a7':'#d7eaff');}
  ctx.fillStyle='#ffda7d';ctx.beginPath();ctx.arc(1030,128,75,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#92b4f2';ctx.beginPath();ctx.arc(110,645,110,0,Math.PI*2);ctx.fill();
 }else{
  ctx.fillStyle='#fffdf4';for(let i=0;i<5;i++){const x=(i*291+30)%W,y=60+(i%2)*87;ctx.beginPath();ctx.ellipse(x,y,80,23,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x-25,y-15,35,0,Math.PI*2);ctx.arc(x+15,y-24,44,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle=state.template==='park'?'#80d3a0':'#a1d9b4';ctx.beginPath();ctx.moveTo(0,640);ctx.quadraticCurveTo(300,570,620,660);ctx.quadraticCurveTo(850,710,1200,590);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
  if(state.template==='park')for(let i=0;i<13;i++){let x=60+i*90,y=674+(i%3)*40;ctx.fillStyle='#e99cba';ctx.beginPath();ctx.arc(x,y,19,0,7);ctx.fill();ctx.fillStyle='#ffe871';ctx.beginPath();ctx.arc(x,y,8,0,7);ctx.fill();}
  if(state.template==='sky'){ctx.fillStyle='#ffdd78';ctx.beginPath();ctx.arc(1015,131,73,0,Math.PI*2);ctx.fill();}
 }
 ctx.restore();
}
const layer=document.createElement('canvas');layer.width=W;layer.height=H;const paint=layer.getContext('2d');
function drawStroke(op){
 if(!op.points.length)return;
 const eraser=op.tool==='eraser';
 paint.save();paint.globalCompositeOperation=eraser?'destination-out':'source-over';
 paint.strokeStyle=eraser?'#000':op.color;paint.fillStyle=eraser?'#000':op.color;
 paint.lineJoin='round';paint.lineCap='round';paint.lineWidth=op.size;
 const pts=op.points;
 if(pts.length===1){paint.beginPath();paint.arc(pts[0][0],pts[0][1],op.size/2,0,Math.PI*2);paint.fill();}
 else{paint.beginPath();paint.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)paint.lineTo(pts[i][0],pts[i][1]);paint.stroke();}
 paint.restore();
}
function drawStamp(op){
 paint.save();const sz=op.size*2.5;
 const emoji={star:'⭐',heart:'💗',flower:'🌸',sun:'☀️',cat:'🐱',rocket:'🚀',sparkle:'✨',rainbow:'🌈'}[op.symbol]||'⭐';
 paint.textAlign='center';paint.textBaseline='middle';paint.font=Math.round(sz)+'px system-ui, "Apple Color Emoji","Segoe UI Emoji"';paint.fillText(emoji,op.x,op.y);
 paint.restore();
}
function render(){
 paint.clearRect(0,0,W,H);
 for(const op of state.ops){if(op.kind==='stroke')drawStroke(op);else drawStamp(op);}
 if(active)drawStroke(active);
 drawBackground();ctx.drawImage(layer,0,0);
 updateButtons();
}
let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;render();});}
function point(event){
 const rect=canvas.getBoundingClientRect();const x=(event.clientX-rect.left)*W/rect.width;const y=(event.clientY-rect.top)*H/rect.height;
 return [clamp(x,0,W),clamp(y,0,H)];
}
function begin(e){
 if(active||e.button!==undefined&&e.button!==0)return;
 e.preventDefault();const [x,y]=point(e);
 if(state.tool==='stamp'){
   state.ops.push({kind:'stamp',symbol:state.stamp,x,y,size:state.size,color:state.color});
   future=[];if(state.ops.length>380)state.ops.shift();schedule();saveSoon();return;
 }
 active={kind:'stroke',tool:state.tool,color:state.color,size:state.size,points:[[x,y]]};
 try{canvas.setPointerCapture(e.pointerId);}catch(err){}
 schedule();
}
function move(e){
 if(!active)return;e.preventDefault();
 const p=point(e),last=active.points[active.points.length-1];
 if((p[0]-last[0])**2+(p[1]-last[1])**2<14)return;
 if(active.points.length<3000)active.points.push(p);
 schedule();
}
function end(e){
 if(!active)return;e.preventDefault();
 const op=active;active=null;state.ops.push(op);
 future=[];if(state.ops.length>380)state.ops.shift();schedule();saveSoon();
 try{canvas.releasePointerCapture(e.pointerId);}catch(err){}
}
canvas.addEventListener('pointerdown',begin);
canvas.addEventListener('pointermove',move);
canvas.addEventListener('pointerup',end);
canvas.addEventListener('pointercancel',end);
canvas.addEventListener('lostpointercapture',()=>{if(active){state.ops.push(active);active=null;future=[];schedule();saveSoon();}});
for(const color of COLORS){
 const b=document.createElement('button');b.type='button';b.className='swatch';b.style.setProperty('--swatch',color);b.dataset.color=color;
 b.setAttribute('aria-label','カラー '+color);b.title=color;
 b.addEventListener('click',()=>{state.color=color;state.tool='pen';updateButtons();});
 $('palette').append(b);
}
for(const b of document.querySelectorAll('[data-tool]'))b.addEventListener('click',()=>{state.tool=b.dataset.tool;updateButtons();});
for(const b of document.querySelectorAll('[data-stamp]'))b.addEventListener('click',()=>{state.stamp=b.dataset.stamp;state.tool='stamp';updateButtons();});
$('size').addEventListener('input',e=>{state.size=clamp(Number(e.target.value),3,65);updateButtons();});
$('customColor').addEventListener('input',e=>{state.color=e.target.value;state.tool='pen';updateButtons();});
$('template').addEventListener('change',e=>{state.template=e.target.value;schedule();saveSoon();});
$('undo').onclick=()=>{if(!state.ops.length)return;future.push(state.ops.pop());schedule();saveSoon();};
$('redo').onclick=()=>{if(!future.length)return;state.ops.push(future.pop());schedule();saveSoon();};
$('clear').onclick=()=>{if(!window.confirm('いま描いている絵を全部消しますか？'))return;state.ops=[];future=[];schedule();saveSoon();$('status').textContent='🧹 まっさらになったよ！';};
$('save').onclick=()=>{if(!canvas.toBlob){$('status').textContent='この端末は画像保存に対応していないよ。';return;}render();canvas.toBlob(blob=>{
 if(!blob){$('status').textContent='画像保存に失敗したよ。';return;}
 const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download='サイ校おえかき作品.png';document.body.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),5000);$('status').textContent='🎉 おえかきをPNG画像で保存したよ！';
},'image/png');};
$('print').onclick=()=>window.print();
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)$('redo').click();else $('undo').click();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();$('redo').click();}});
window.addEventListener('beforeunload',()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}});
render();
})();