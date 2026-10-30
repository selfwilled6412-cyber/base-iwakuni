/* SAIKO まちがいさがし: original hand-drawn SVG landscape scenes.
 * 90 seeded scenes; left and right share every element except exact answer slots.
 * No emoji tiles, remote image licenses, or image loading needed. */
(function(root,factory){
 const core=factory();
 if(typeof module==='object'&&module.exports)module.exports=core;
 if(root)root.SaikoSpotCore=core;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const LEVELS=[{id:'easy',name:'初級',count:5},{id:'normal',name:'中級',count:7},{id:'hard',name:'上級',count:10}];
 const THEMES=[
  ['緑いっぱいの公園','park','#8bdbff','#eefcc8','#76ba73'],
  ['青い海のビーチ','beach','#75d6ff','#72c7e9','#ffe3a5'],
  ['こもれびの森','forest','#9cdef3','#6cc299','#376f57'],
  ['小さな街の広場','village','#a9dbff','#d6deaa','#d5a774'],
  ['海の生き物たち','aquarium','#073d83','#1264a3','#0e8caa'],
  ['にぎやかな夏祭り','festival','#303c82','#71539c','#a86674'],
  ['楽しい学校の庭','school','#a8dfff','#b8df9b','#81be6b'],
  ['ゆたかな牧場','farm','#b3eaff','#a7d47a','#61a65d'],
  ['山のキャンプ場','camp','#99d9fc','#b5dc9b','#648c67'],
  ['おしゃれなカフェ通り','cafe','#b6e4fb','#f5d9b2','#d6aa8c'],
  ['雪のふる町','winter','#9acde9','#d9eafa','#aed4eb'],
  ['春のお花畑','garden','#98d9f3','#b8ea9d','#79bd75'],
  ['湖のピクニック','lake','#99dff7','#8fd0c4','#6ebca3'],
  ['お城のある丘','castle','#a8bffb','#b7c2f1','#82b4a5'],
  ['果物いっぱいの果樹園','orchard','#aee5fd','#e3efad','#83be72'],
  ['星明かりの街','night','#1c2e70','#374e86','#56456d']
 ];
 const SCENE_PACKS={
 park:['cloud','sun','bird','kite','tree','balloon','butterfly','bench','bush','bird','flower','mushroom','dog','ball','flower','cat','basket','flower'],
 beach:['sun','cloud','bird','kite','palm','umbrella','boat','balloon','palm','bird','shell','crab','bucket','sandcastle','starfish','shell','ball','umbrella'],
 forest:['cloud','sun','bird','butterfly','pine','tree','bird','pine','bush','butterfly','mushroom','flower','rabbit','bush','mushroom','butterfly','flower','mushroom'],
 village:['cloud','sun','bird','balloon','house','house','tree','lamp','sign','bird','flower','dog','bicycle','basket','bush','flower','bench','cat'],
 aquarium:['bubble','fish','bubble','star','fish','coral','fish','jelly','fish','coral','shell','starfish','coral','fish','shell','coral','fish','starfish'],
 festival:['star','moon','star','lantern','house','flag','lantern','stand','balloon','flag','cat','ball','lantern','basket','flower','dog','balloon','flower'],
 school:['cloud','sun','bird','kite','house','tree','flag','sign','balloon','bird','ball','basket','flower','bicycle','dog','bench','flower','ball'],
 farm:['cloud','sun','bird','kite','barn','tree','bird','barn','bush','tree','flower','basket','rabbit','flower','bush','dog','flower','cat'],
 camp:['sun','cloud','bird','kite','pine','tent','flag','tree','pine','bird','flower','bush','fire','basket','mushroom','ball','flower','cat'],
 cafe:['cloud','sun','bird','balloon','house','umbrella','sign','house','lamp','bird','flower','cup','chair','cat','flower','basket','bicycle','flower'],
 winter:['cloud','sun','bird','star','pine','house','snowman','pine','house','cloud','gift','flower','snowman','gift','pine','basket','gift','cat'],
 garden:['cloud','sun','butterfly','bird','tree','flower','butterfly','bush','sign','bird','flower','flower','basket','flower','mushroom','butterfly','flower','flower'],
 lake:['sun','cloud','bird','kite','pine','boat','tree','bird','bush','boat','flower','duck','basket','flower','rabbit','bush','flower','duck'],
 castle:['cloud','sun','bird','star','castle','flag','tree','castle','balloon','bird','flower','mushroom','cat','flower','basket','butterfly','flower','flower'],
 orchard:['cloud','sun','bird','kite','fruitTree','tree','butterfly','fruitTree','bush','bird','flower','basket','fruitTree','cat','flower','fruit','basket','flower'],
 night:['moon','star','star','cloud','house','house','lamp','flag','star','house','lantern','cat','basket','flower','lantern','dog','bicycle','lamp']
 };
 const ALT_TYPES={tree:'pine',pine:'tree',flower:'mushroom',mushroom:'flower',bird:'butterfly',butterfly:'bird',
  balloon:'kite',kite:'balloon',house:'barn',barn:'house',fruitTree:'tree',dog:'cat',cat:'rabbit',rabbit:'cat',
  boat:'duck',duck:'boat',shell:'starfish',starfish:'shell',fish:'jelly',jelly:'fish',coral:'fish',bench:'bush',
  bush:'flower',ball:'basket',basket:'ball',flag:'lantern',lantern:'flag',sun:'cloud',cloud:'sun',star:'moon',
  moon:'star',sign:'flower',fire:'mushroom',tent:'house',stand:'house',cup:'flower',chair:'bench',crab:'shell',
  bucket:'shell',sandcastle:'bucket',palm:'tree',bicycle:'bench',umbrella:'balloon',castle:'house',bubble:'fish',
  lamp:'lantern',gift:'basket',snowman:'rabbit',fruit:'flower'};
 const PLACEMENTS=[
  [124,111],[345,127],[596,97],[832,124],
  [104,274],[278,330],[443,256],[606,310],[752,267],[862,333],
  [86,468],[215,545],[343,451],[466,548],[590,460],[698,553],[810,459],[910,552]
 ];
 const OBJECTS=PLACEMENTS.length,WIDTH=960,HEIGHT=660;
 function rng(seed){let t=seed>>>0;return ()=>{t+=0x6D2B79F5;let v=t;v=Math.imul(v^(v>>>15),v|1);v^=v+Math.imul(v^(v>>>7),v|61);return ((v^(v>>>14))>>>0)/4294967296}};
 function shuffle(arr,r){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 function makePuzzle(level,index){
  const difficulty=LEVELS.find(x=>x.id===level);
  if(!difficulty||!Number.isInteger(index)||index<0||index>=30)throw Error('問題が見つかりません');
  const seed=(312986531+(LEVELS.indexOf(difficulty)*541+index)*10993)>>>0;
  const random=rng(seed);
  const theme=THEMES[(index*7+LEVELS.indexOf(difficulty)*5)%THEMES.length];
  const pack=SCENE_PACKS[theme[1]];
  const answers=new Set(shuffle(Array.from({length:OBJECTS},(_,i)=>i),random).slice(0,difficulty.count));
  const objects=pack.map((kind,i)=>{
   const [bx,by]=PLACEMENTS[i],jitterX=Math.round((random()-.5)*20),jitterY=Math.round((random()-.5)*17);
   const variation=level==='easy'?['missing','color','type'][Math.floor(random()*3)]:
    level==='normal'?['color','type','size','missing'][Math.floor(random()*4)]:
    ['detail','color','size','type'][Math.floor(random()*4)];
   return {i,kind,x:bx+jitterX,y:by+jitterY,scale:.83+random()*.27,
    tilt:Math.round((random()-.5)*9),color:Math.floor(random()*5),
    variation,alt:ALT_TYPES[kind]||'flower',different:answers.has(i)};
  });
  return {id:level+'-'+String(index+1).padStart(2,'0'),seed,level,index,theme,objects,
    spots:[...answers].sort((a,b)=>a-b),count:difficulty.count};
 }
 const esc=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const rect=(x,y,w,h,rx,fill,stroke='none',sw=0)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
 const circle=(x,y,r,fill,stroke='none',sw=0)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
 const path=(d,fill,stroke='none',sw=0)=>'<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round"/>';
 const ellipse=(x,y,rx,ry,fill)=>'<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+fill+'"/>';
 const line=(x,y,a,b,color='#594c62',width=3)=>'<path d="M'+x+' '+y+'L'+a+' '+b+'" fill="none" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round"/>';
 const COLORS=['#fa755b','#ffc947','#55c9b9','#9e86e7','#f28fb9'];
 function palette(obj,changed){
  const base=COLORS[obj.color];
  return changed?COLORS[(obj.color+2)%COLORS.length]:base;
 }
 function motif(kind,color,detail){
  const outline='#4a5270',soft='#fff7de',green='#62ad76',trunk='#9a644c';
  let s='';
  switch(kind){
   case 'cloud':s=ellipse(-13,4,30,19,'#fff')+ellipse(10,-5,28,24,'#fff')+ellipse(32,9,23,14,'#fff')+path('M-36 10Q0 23 53 12','none','#c5e7f7',3);break;
   case 'sun':s=circle(0,0,28,'#ffda56','#f3a83f',4)+Array.from({length:10},(_,i)=>{const a=i*Math.PI/5;return line(Math.cos(a)*36,Math.sin(a)*36,Math.cos(a)*46,Math.sin(a)*46,'#f9d45b',5)}).join('')+circle(-9,-4,2.8,'#ad7835')+circle(9,-4,2.8,'#ad7835')+path('M-8 9Q0 18 9 9','none','#a96735',2);break;
   case 'moon':s=path('M22 -33A36 36 0 1 0 26 30Q0 19 -1 -4Q-3 -23 22 -33',soft);break;
   case 'star':s=path('M0-33L9-11L33-9L15 7L20 30L0 18L-20 30L-15 7L-33-9L-9-11Z','#fff0a0','#e8b770',3);break;
   case 'bird':s=path('M-34 6Q-20 -16 -5 -2Q11 -21 31 -1Q10 -2 -1 14Q-19 1 -34 6','#fffdf5',outline,3)+circle(13,-2,2.6,outline)+path('M30 4L44 7L29 12','#f5ad59');break;
   case 'butterfly':s=ellipse(-21,-16,21,25,color)+ellipse(21,-16,21,25,color)+ellipse(-16,16,17,21,'#f6dc80')+ellipse(16,16,17,21,'#f6dc80')+ellipse(0,0,6,29,outline)+line(-2,-24,-12,-35,outline,2)+line(2,-24,12,-35,outline,2)+circle(-21,-16,5,'#ffffffb9')+circle(21,-16,5,'#ffffffb9');break;
   case 'kite':s=path('M0-47L35-6L0 28L-35 -6Z',color,outline,3)+path('M0 -47V28M-35 -6H35','none','#fff',3)+path('M0 28Q-9 53 16 75','none',outline,3)+path('M3 41l-12 -4 6 14M11 57l-14 -3 7 13',color);break;
   case 'balloon':s=circle(0,-17,28,color,'#fff5d1',3)+path('M-5 9L0 20L5 9',color)+path('M0 20Q14 38 -2 60Q-10 67 0 72','none',outline,2);break;
   case 'bubble':s=circle(0,0,27,'#ffffff16','#ddfbff',4)+ellipse(-11,-13,8,4,'#ffffffaa');break;
   case 'tree':case 'fruitTree':s=path('M-10 9L-13 55H13L10 9',trunk,outline,3)+
     circle(-24,-16,28,green)+circle(15,-29,32,'#66b76d')+circle(35,-5,24,'#79c27e')+circle(-11,10,30,'#83ce80')+
     (kind==='fruitTree'?[[-29,-18],[13,-33],[24,0],[-9,11]].map(([x,y])=>circle(x,y,7,color,'#fce6c5',1)).join(''):'');break;
   case 'palm':s=path('M-4 51Q5 8 8 -20L20 -20Q11 22 18 51Z',trunk,outline,3)+
     [-160,-95,-30,35,100].map(angle=>'<g transform="translate(8 -27) rotate('+angle+')">'+path('M0 0Q28 -20 66 -5Q29 -3 10 13Z','#4cbd8b','#348569',2)+'</g>').join('');break;
   case 'pine':s=path('M-10 14L-13 52H13L10 14',trunk)+path('M0 -58L-38 0H-22L-48 27H48L22 0H38Z','#3f9d72',outline,3)+path('M0-41L-22 -5M0 -17L-27 22','none','#90d5a2',4);break;
   case 'flower':s=line(0,4,0,51,'#428a56',7)+path('M0 29Q-25 6 -33 29Q-12 48 0 29M0 35Q24 12 32 38Q12 50 0 35','#66b878')+
    Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return circle(Math.cos(a)*17,Math.sin(a)*17-14,12,color,'#fff8d7',1)}).join('')+circle(0,-14,11,'#ffc94a','#efa23e',2);break;
   case 'bush':s=ellipse(-18,12,27,27,'#65b88a')+ellipse(17,5,30,29,'#47a878')+ellipse(1,-13,27,25,'#81c77f')+ellipse(0,29,41,14,'#49946a');break;
   case 'mushroom':s=path('M-13 3L-12 43Q0 53 12 43L13 3Z',soft,outline,3)+path('M-37 7Q-30 -35 0 -38Q30 -35 37 7Z',color,outline,3)+circle(-15,-5,7,'#fff3c9')+circle(10,-23,6,'#fff3c9')+circle(22,1,4,'#fff3c9');break;
   case 'house':case 'barn':s=rect(-35,-8,70,60,5,kind==='barn'?'#f07d69':'#f9dfa9',outline,3)+path('M-48 -5L0 -50L48 -5Z',color,outline,4)+rect(-8,15,19,37,3,'#b97f65',outline,2)+rect(-28,4,15,17,3,'#c3ebfa',outline,2)+rect(17,4,15,17,3,'#c3ebfa',outline,2);break;
   case 'castle':s=rect(-36,-17,72,72,3,'#efe6ef',outline,3)+rect(-49,-45,25,88,3,'#f4dfff',outline,3)+rect(24,-45,25,88,3,'#f4dfff',outline,3)+path('M-52-45L-37-68L-22-45M21-45L36-68L51-45',color,outline,2)+path('M-12 55V24A12 12 0 0 1 12 24V55Z','#8274a9')+circle(0,-10,9,'#a9dbf4');break;
   case 'bench':s=rect(-42,-20,84,14,3,color,outline,3)+rect(-40,4,80,13,2,color,outline,3)+line(-28,17,-35,52,outline,5)+line(28,17,35,52,outline,5)+line(-38,-9,-38,25,outline,4)+line(38,-9,38,25,outline,4);break;
   case 'sign':s=line(0,-20,0,55,outline,7)+rect(-39,-37,78,30,7,color,outline,3)+path('M-23-20H23','none','#fff',4);break;
   case 'lamp':s=line(0,-24,0,55,outline,6)+path('M-8-24L-20-8H20L8-24Z','#fff4b6',outline,3)+path('M-21 -8H21','none',outline,3)+circle(0,-8,6,'#ffce62');break;
   case 'bicycle':s=circle(-30,25,18,'#ffffff30',outline,5)+circle(31,25,18,'#ffffff30',outline,5)+path('M-30 25L-7 -3L8 25L-30 25M8 25L31 25L17 -9L-7 -3','none',color,5)+line(-19,-10,0,-10,outline,4)+line(17,-9,33,-16,outline,4);break;
   case 'dog':case 'cat':case 'rabbit':s=ellipse(0,26,27,30,color)+circle(0,-11,30,color,outline,3)+
     (kind==='rabbit'?ellipse(-20,-55,10,32,color)+ellipse(19,-55,10,32,color):
       kind==='cat'?path('M-27-22L-33-55L-7-38M27-22L33-55L7-38',color,outline,3):
       ellipse(-30,-25,16,25,'#c77d62')+ellipse(30,-25,16,25,'#c77d62'))+
     circle(-10,-16,4,outline)+circle(12,-16,4,outline)+ellipse(0,-1,6,5,outline)+path('M-8 10Q0 18 8 10','none',outline,2)+ellipse(-21,47,10,6,color)+ellipse(21,47,10,6,color);break;
   case 'boat':s=path('M-48 13H47L29 39H-27Z',color,outline,4)+line(0,-57,0,13,outline,4)+path('M-3 -52L-3 6L-40 6Z','#fffae2',outline,2)+path('M3-41L37 7H3Z','#f8f5d2',outline,2);break;
   case 'duck':s=ellipse(0,19,37,23,'#ffdc79')+circle(24,-13,19,'#ffe69b')+circle(30,-17,3,outline)+path('M39-9L54-4L39 3','#ef9454')+path('M-10 4Q4 -12 16 5Z','#efc45e');break;
   case 'fish':s=ellipse(0,0,34,22,color,outline,3)+path('M-30 0L-56 -24V25Z',color,outline,3)+path('M-3 -16L12 -34L19 -18',color,outline,2)+circle(22,-4,3,outline)+path('M-8-10Q0 0 -8 13','none','#fff7e0',4);break;
   case 'jelly':s=path('M-30 8Q-32-37 0-39Q32-37 30 8Z',color,outline,3)+[ -22,-8,9,23].map((x,i)=>path('M'+x+' 8Q'+(x-7)+' 36 '+x+' 48','none',i%2?'#ffc6e1':'#a1f1e4',5)).join('')+circle(-10,-1,3,outline)+circle(11,-1,3,outline);break;
   case 'coral':s=path('M-28 43Q-10 12 -16 -12M-16 13Q-42-4 -44-21M-16 24Q22 8 17-22M-1 22Q-9-5 6-33M17-2Q44-6 38-30','none',color,12)+path('M-44 44H44','none','#f9c9aa',8);break;
   case 'shell':s=path('M-38 32Q-57-20 -20-34Q0-48 21-32Q53-11 35 32Z','#f6d6cf',outline,3)+[-21,-11,0,11,22].map(x=>line(x*.55,-27,x,28,'#df9aab',2)).join('')+rect(-42,28,85,13,5,'#f3c1b0',outline,2);break;
   case 'starfish':s=path('M0-43L15-15L43-12L21 7L29 39L0 23L-28 39L-21 7L-43-12L-15-15Z',color,outline,4)+circle(-11,-3,3,outline)+circle(12,-3,3,outline)+path('M-7 8Q0 16 8 8','none',outline,2);break;
   case 'crab':s=ellipse(0,18,31,21,color,outline,3)+circle(-13,15,3,outline)+circle(13,15,3,outline)+path('M-25 3L-42-12L-49-33M25 3L42-12L49-33M-26 27L-43 41M26 27L43 41','none',outline,5)+circle(-48,-34,10,color)+circle(48,-34,10,color);break;
   case 'umbrella':s=path('M-52 0Q-37-47 0-47Q38-47 52 0Q38 10 25 0Q12 10 0 0Q-13 10 -25 0Q-39 10 -52 0',color,outline,4)+path('M0-47V46Q0 61 17 54','none',outline,5);break;
   case 'bucket':s=path('M-30-10H30L24 43H-24Z',color,outline,3)+path('M-24-10Q0-46 24-10','none',outline,4)+ellipse(0,-10,32,8,'#f3f5dd',outline,2);break;
   case 'sandcastle':s=rect(-33,-6,66,53,3,'#edbd7b',outline,3)+rect(-48,9,20,39,2,'#e3b477',outline,3)+rect(28,9,20,39,2,'#e3b477',outline,3)+[-37,-14,8,32].map(x=>rect(x,-15,15,15,1,'#e8c88d')).join('')+path('M-13 47V25A13 13 0 0 1 13 25V47Z','#ae825f');break;
   case 'ball':s=circle(0,0,34,'#fffef0',outline,3)+path('M0 -34Q-5 0 31 16M-32-11Q0-2 8 33','none',color,12)+circle(0,0,6,color);break;
   case 'basket':s=path('M-40-7H40L27 38H-27Z','#c88f61',outline,3)+path('M-29-9Q-2-63 29-9','none',outline,5)+[-20,0,20].map(x=>line(x,-7,x*.6,35,'#efcf9c',3)).join('')+line(-33,14,32,14,'#efcf9c',4);break;
   case 'fruit':s=circle(0,10,30,color,outline,3)+path('M0-22Q-12-43-29-30Q-12-11 0-22',green,outline,2)+line(0,-19,4,-30,trunk,4)+ellipse(-9,-1,7,5,'#ffffffaa');break;
   case 'flag':s=line(-25,-42,-25,56,outline,4)+path('M-25 -39L37 -30L18 0L-25 -7Z',color,outline,3);break;
   case 'lantern':s=path('M-19-33Q0-43 19-33L25 17Q0 35-25 17Z',color,outline,3)+rect(-16,-41,32,8,3,'#ffe5ab',outline,2)+rect(-17,24,34,7,3,'#ffe5ab')+line(0,31,0,44,outline,2)+ellipse(0,-3,7,18,'#fff3c39c');break;
   case 'stand':s=rect(-45,-6,90,55,2,'#ffdcac',outline,3)+path('M-52-30L-40-49H40L52-30Z',color,outline,3)+[-41,-14,14,41].map(x=>rect(x-11,-30,22,24,1,x%2?'#fff7dc':color)).join('')+rect(-25,12,50,30,2,'#acdce1');break;
   case 'tent':s=path('M-54 44L0-51L54 44Z',color,outline,4)+path('M0-51L0 44H54Z','#fff4dd6b')+path('M-18 44L0 8L18 44Z','#685f9e',outline,2);break;
   case 'fire':s=path('M-31 20Q-39-9-3-37Q-9-14 14-44Q40-7 29 20Q0 48-31 20Z','#f9aa47','#c36d42',3)+path('M-17 20Q-13-8 6-23Q7-2 17 16Q13 35-7 35Z','#ffe287')+line(-39,47,34,41,trunk,8);break;
   case 'cup':s=path('M-28-19H27L23 35Q0 49-23 35Z',color,outline,4)+path('M28-8Q64-13 47 23L23 23','none',outline,5)+path('M-10 -33Q-19-44-10-55M12-33Q3-44 12-55','none','#ffffffb5',4);break;
   case 'chair':s=rect(-33,-20,66,30,7,color,outline,3)+rect(-31,15,60,13,4,'#e1ab6b',outline,3)+line(-25,28,-34,53,outline,5)+line(24,28,34,53,outline,5);break;
   case 'gift':s=rect(-34,-8,68,58,5,color,outline,3)+rect(-41,-18,82,16,3,'#ffd98e',outline,3)+rect(-9,-19,18,69,1,'#fff4db')+path('M0-17Q-50-17-26-43Q-3-49 0-17Q2-52 25-44Q51-19 0-17','none','#fff4db',7);break;
   case 'snowman':s=circle(0,23,31,'#fff','#9cc6dd',3)+circle(0,-23,24,'#fff','#9cc6dd',3)+circle(-9,-30,2.7,outline)+circle(9,-30,2.7,outline)+path('M0-19L19-14L0-10','#f79c60')+circle(0,5,4,outline)+circle(0,21,4,outline)+path('M-37 15L-59 -3M37 15L57 -3','none',trunk,4)+rect(-26,-48,52,9,3,color)+rect(-17,-73,34,26,4,color);break;
   default:s=circle(0,0,26,color,outline,2);
  }
  return s+(detail?circle(26,-26,8,'#fffbe0',outline,2)+circle(26,-26,3,'#ff8a76'):'');
 }
 function background(p){
  const [title,style,sky,horizon,land]=p.theme;
  const isNight=style==='night'||style==='festival'||style==='aquarium';
  let out='<defs><linearGradient id="sky-'+p.id+'" x1="0" y1="0" x2="0" y2="1"><stop stop-color="'+sky+'"/><stop offset="1" stop-color="'+horizon+'"/></linearGradient>'+
    '<linearGradient id="ground-'+p.id+'" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="'+land+'"/><stop offset="1" stop-color="'+(isNight?'#263f73':'#409675')+'"/></linearGradient></defs>'+
    rect(0,0,WIDTH,HEIGHT,17,'url(#sky-'+p.id+')');
  if(style==='aquarium'){
   out+=path('M0 120Q240 93 470 123T960 107V660H0Z','#0c89ad')+
     path('M0 306Q250 270 480 316T960 296V660H0Z','#1b6f9b')+
     path('M0 555Q235 528 475 565T960 539V660H0Z','#d4c091')+
     Array.from({length:19},(_,i)=>{const x=(i*91+p.seed%43)%960,y=55+(i*61)%440;return circle(x,y,i%3+5,'#ffffff24','#d0faff66',1)}).join('');
  }else if(style==='beach'||style==='lake'){
   out+=path('M0 308Q250 288 500 317T960 298V660H0Z',style==='beach'?'#50b9d3':'#5bbdd1')+
      path('M0 403Q270 380 590 423T960 397V660H0Z',style==='beach'?'#3ba9c3':'#4dabb5')+
      path('M0 508Q200 480 415 520T960 493V660H0Z',style==='beach'?'#f3d293':'#8ac67b')+
      path('M0 562Q245 535 470 571T960 551','none','#fff8d8a0',8);
  }else{
   const mountains=['camp','forest','castle','winter'].includes(style);
   out+=mountains?path('M0 328L137 124L290 325L441 146L633 344L761 190L960 330V660H0Z',style==='winter'?'#edf8ff':'#739db8')+
     path('M93 192L137 124L186 192L139 175Z',style==='winter'?'#fff':'#f0f8e9'):
     path('M0 344Q196 248 391 343T960 322V660H0Z','#9ccf9b');
   out+=path('M0 389Q210 332 450 397T960 361V660H0Z','url(#ground-'+p.id+')')+
     path('M0 550Q238 509 453 546T960 523V660H0Z',style==='winter'?'#e8f6fd':'#66b082');
   if(style==='winter')out+=path('M0 480Q260 445 515 490T960 463V660H0Z','#f3faff');
   else out+=path('M390 660Q425 557 545 478Q601 433 670 390L721 392Q653 484 615 660Z',
      style==='village'||style==='cafe'||style==='school'?'#ddc4a4':'#d5bd8c');
   if(['village','cafe','school','festival','night'].includes(style)){
    // Streetscape buildings are fixed atmosphere; actual differences stay on foreground motifs.
    const bcols=style==='night'?['#536898','#8994b6','#647c9c']:['#f5dbba','#e9b9a3','#f5e4cb'];
    out+=rect(110,207,174,219,5,bcols[0],'#6a7580',3)+path('M95 207L197 142L298 207Z',style==='night'?'#39476e':'#a66c71','#57607a',3)+
      rect(681,186,170,233,5,bcols[1],'#6a7580',3)+path('M662 186L765 127L871 186Z',style==='night'?'#52688a':'#bb897b','#57607a',3)+
      rect(165,284,44,54,5,style==='night'?'#fff3a1':'#bfeafa','#747f90',3)+
      rect(725,249,46,50,5,style==='night'?'#fff3a1':'#bfeafa','#747f90',3);
   }
   if(style==='farm')out+=rect(410,248,156,180,4,'#dc8c76','#806762',3)+path('M391 250L490 165L582 250Z','#a74e57','#806762',4)+rect(468,321,57,107,4,'#f3dec1','#806762',3);
   if(style==='castle')out+=rect(384,213,184,218,6,'#e8ddf5','#6a7198',3)+
    rect(364,159,50,264,4,'#e8ddf5')+rect(542,159,49,264,4,'#e8ddf5')+
    path('M359 159L390 109L421 159M535 159L566 109L596 159','#bc8bcb','#7e79a1',3);
   if(style==='garden')out+=rect(340,311,264,135,8,'#e9f2d8','#809a79',4)+
     [361,405,449,493,537,581].map(x=>line(x,314,x,433,'#8bc28a',4)).join('');
   if(style==='forest')out+=Array.from({length:9},(_,i)=>{
    const x=(i*137+46)%960;return path('M'+x+' 380L'+(x+8)+' 134L'+(x+40)+' 136L'+(x+38)+' 376Z','#7e7357')+
       circle(x+23,146,72,i%2?'#3c9869':'#66ad75');
   }).join('');
  }
  const decoration=Array.from({length:38},(_,i)=>{
   const x=(i*113+(p.seed%73))%960,y=470+(i*61)%172;
   if(style==='aquarium')return circle(x,y,2+(i%3),'#daf9f0');
   return i%3===0?path('M'+x+' '+y+'l-6 -10M'+x+' '+y+'l6 -12','none','#346d5388',2):
     ellipse(x,y,3+i%2,2,i%2?'#f9e3a0':'#ffffff6b');
  }).join('');
  return out+decoration;
 }
 function objectMarkup(obj,side,found,hint){
  const changed=side==='right'&&obj.different;
  const mode=changed?obj.variation:'none';
  const kind=mode==='type'?obj.alt:obj.kind;
  const color=palette(obj,mode==='color');
  const scale=obj.scale*(mode==='size'?.61:1);
  const graphic=mode==='missing'?'':motif(kind,color,mode==='detail');
  return '<g class="thing" data-slot="'+obj.i+'" tabindex="0" role="button" aria-label="イラストの'+(obj.i+1)+'番の場所" transform="translate('+obj.x+' '+obj.y+')">'+
   '<g transform="rotate('+obj.tilt+') scale('+scale.toFixed(3)+')">'+graphic+'</g>'+
   circle(0,0,49,'transparent','none',0).replace('<circle','<circle class="hitBox"')+
   (hint?circle(0,0,49,'none','#fffbd0',7).replace('<circle','<circle class="hintRing" stroke-dasharray="11 8"'):'')+
   (found?circle(0,0,49,'none','#46ffe0',8).replace('<circle','<circle class="foundRing"')+
     path('M-17 4L-3 18L21 -15','none','#fff',7):'')+'</g>';
 }
 function render(p,side,found=[],hint=-1){
  if(side!=='left'&&side!=='right')throw Error('side');
  const done=new Set(found);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 660" role="img" aria-label="'+esc(p.theme[0])+'の'+(side==='left'?'お手本':'間違い入り')+'イラスト" width="100%" height="100%">'+
    background(p)+p.objects.map(obj=>objectMarkup(obj,side,done.has(obj.i),hint===obj.i&&!done.has(obj.i))).join('')+'</svg>';
 }
 return Object.freeze({LEVELS,THEMES,makePuzzle,render,OBJECTS,WIDTH,HEIGHT});
});
