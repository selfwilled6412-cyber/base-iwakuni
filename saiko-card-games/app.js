(()=>{'use strict';
const $=id=>document.getElementById(id);
const SUITS=[{id:'H',symbol:'♥',name:'ハート',red:true},{id:'D',symbol:'♦',name:'ダイヤ',red:true},{id:'C',symbol:'♣',name:'クラブ',red:false},{id:'S',symbol:'♠',name:'スペード',red:false}];
const RANKS=['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const TITLES={memory:'🧠 神経衰弱',highlow:'⬆️⬇️ ハイ＆ロー',oldmaid:'🃏 サイ校のババ抜き',sevens:'7️⃣ サイ校の七並べ'};
const KEY='saiko-cardgames-records-v1';
let records={};try{const r=JSON.parse(localStorage.getItem(KEY)||'{}');if(r&&typeof r==='object'&&!Array.isArray(r))records=r;}catch(e){}
let game=null,st=null,run=0,tasks=[],clock=null;

const THEME_KEY='saiko-card-theme-v1';
let theme='neon';
try{if(localStorage.getItem(THEME_KEY)==='sunshine')theme='sunshine'}catch(e){}
function applyTheme(){
 if(document.body?.dataset)document.body.dataset.theme=theme;
 const button=$('themeToggle');
 button.textContent=theme==='neon'?'☀️ やさしい色':'🌌 ネオン表示';
 button.setAttribute('aria-pressed',String(theme==='sunshine'));
 button.title=theme==='neon'?'明るい配色に切り替える':'ネオン配色に戻す';
}
$('themeToggle').onclick=()=>{
 theme=theme==='neon'?'sunshine':'neon';
 try{localStorage.setItem(THEME_KEY,theme)}catch(e){}
 applyTheme();
};
applyTheme();

const random=n=>Math.floor(Math.random()*n),shuffle=a=>{const b=a.slice();for(let i=b.length-1;i>0;i--){const j=random(i+1);[b[i],b[j]]=[b[j],b[i]]}return b;};
const idOf=c=>c.suit+c.rank,card=(suit,rank)=>({suit,rank,id:suit+rank});
function deck52(){return SUITS.flatMap(s=>Array.from({length:13},(_,i)=>card(s.id,i+1)))}
function cardVisual(c,{back=false,small=false,matched=false}={}){
 if(back)return '<span class="playingCard back'+(small?' small':'')+'"><span class="srOnly">裏向きのカード</span></span>';
 if(c.rank===0)return '<span class="playingCard joker'+(small?' small':'')+'"><span class="corner">JOKER</span><span class="center">★</span><span class="corner bottom">JOKER</span></span>';
 const suit=SUITS.find(s=>s.id===c.suit),r=RANKS[c.rank],cl=suit.red?'red':'black';
 return '<span class="playingCard '+cl+(small?' small':'')+(matched?' matched':'')+'"><span class="corner">'+r+'<small>'+suit.symbol+'</small></span><span class="center">'+suit.symbol+'</span><span class="corner bottom">'+r+'<small>'+suit.symbol+'</small></span><span class="watermark">'+r+'</span></span>';
}
function buttonCard(c,index,{back=false,small=false,matched=false,disabled=false,aria=''}={}){
 const title=aria||(!back?(c.rank===0?'ジョーカー':SUITS.find(s=>s.id===c.suit).name+'の'+RANKS[c.rank]):'伏せたカード '+(index+1));
 return '<button type="button" class="cardButton" data-index="'+index+'" '+(disabled?'disabled':'')+' aria-label="'+title+'">'+cardVisual(c,{back,small,matched})+'</button>';
}
function info(t){$('info').textContent=t}
function message(t,good=true){$('feedback').textContent=t;$('feedback').style.color=good?'#8ffbd9':'#ffbbbc'}
function board(h){$('board').innerHTML=h}
function foot(h){$('gameFoot').innerHTML=h}
function setBest(k,value,preferLower=false){
 const prev=Number(records[k]);
 if(!Number.isFinite(prev)||!Object.prototype.hasOwnProperty.call(records,k)||(preferLower?value<prev:value>prev)){
  records[k]=value;
  try{localStorage.setItem(KEY,JSON.stringify(records));}catch(e){}
 }
}
function clearWork(){
 run++;for(const t of tasks)clearTimeout(t);tasks=[];if(clock!==null)clearInterval(clock);clock=null;
}
function later(fn,ms){const active=run;const t=setTimeout(()=>{if(active===run)fn()},ms);tasks.push(t)}
function home(){clearWork();game=null;st=null;$('game').hidden=true;$('home').hidden=false;window.scrollTo?.({top:0,behavior:'smooth'});}
function start(type,level=0){
 if(!TITLES[type])return;clearWork();game=type;st=null;$('game').hidden=false;$('home').hidden=true;
 $('gameTitle').textContent=TITLES[type];message('');foot('');
 if(type==='memory')startMemory(level);else if(type==='highlow')startHighLow();else if(type==='oldmaid')startOldMaid();else if(type==='sevens')startSevens();
 window.scrollTo?.({top:0,behavior:'smooth'});
}
function win(title,detail,subtitle='もう一度プレイする'){
 clearWork();
 info('✨ ミッション達成！');
 board('<div class="winner" role="status"><div class="emoji">🏆 ✨ 🎉</div><h3>'+title+'</h3><p>'+detail+'</p><button class="act gold" id="playAgain" type="button">'+subtitle+'</button></div>');
 foot('<button class="act" id="chooseGame">ゲームを選び直す</button>');$('playAgain').onclick=()=>start(game,st?.difficulty||0);$('chooseGame').onclick=home;message('サイ校キャラ：いい勝負だったね！');
}
document.querySelectorAll('[data-game]').forEach(el=>el.addEventListener('click',()=>start(el.dataset.game)));
$('restart').onclick=()=>{if(game)start(game,st?.difficulty||0)};$('back').onclick=home;
/* 神経衰弱 */
const MEMORY_CARDS=[card('H',1),card('S',2),card('D',3),card('C',4),card('H',5),card('D',6),card('S',7),card('C',8),card('D',9),card('H',10),card('S',11),card('C',12),card('D',13),card('H',7),card('S',1)];
function startMemory(level=0){
 const pairs=[6,10,15][level]||6;
 const faces=shuffle(MEMORY_CARDS).slice(0,pairs);
 const cards=shuffle(faces.flatMap(c=>[{...c},{...c}]));
 st={difficulty:level,pairs,cards,flipped:[],matched:new Set(),turns:0,locked:false,started:0,elapsed:0};
 renderMemory();
}
function renderMemory(){
 const s=st,cols=s.pairs===6?4:s.pairs===10?5:6;
 info('ペア '+Math.floor(s.matched.size/2)+' / '+s.pairs+'　｜　めくった回数 '+s.turns+'　｜　'+(s.started?'チャレンジ中！':'2枚ずつめくってペアを探そう！')+
 (records['memory'+s.difficulty]?'　｜　ベスト '+records['memory'+s.difficulty]+'回':''));
 board('<div class="felt"><h3>✦ 同じカードを2枚見つけよう ✦</h3><div class="memoryGrid" style="--cols:'+cols+'">'+s.cards.map((c,i)=>buttonCard(c,i,{back:!s.matched.has(i)&&!s.flipped.includes(i),matched:s.matched.has(i),disabled:s.matched.has(i)||s.locked,aria:s.matched.has(i)?'ペア成立・'+(i+1):s.flipped.includes(i)?'公開中・'+(i+1):'カード '+(i+1)+'をめくる'})).join('')+'</div></div>');
 for(const b of $('board').querySelectorAll('[data-index]'))b.onclick=()=>tapMemory(Number(b.dataset.index));
 foot('<button class="act '+(s.difficulty===0?'gold':'')+'" data-difficulty="0">🌱 初級 6ペア</button><button class="act '+(s.difficulty===1?'gold':'')+'" data-difficulty="1">🧭 中級 10ペア</button><button class="act '+(s.difficulty===2?'gold':'')+'" data-difficulty="2">👑 上級 15ペア</button>');
 for(const b of $('gameFoot').querySelectorAll('[data-difficulty]'))b.onclick=()=>start('memory',Number(b.dataset.difficulty));
}
function tapMemory(index){
 const s=st;if(game!=='memory'||s.locked||s.flipped.includes(index)||s.matched.has(index))return;
 if(!s.started)s.started=Date.now();
 s.flipped.push(index);
 if(s.flipped.length===2){
  s.turns++;
  const [a,b]=s.flipped;
  if(s.cards[a].id===s.cards[b].id){
   s.matched.add(a);s.matched.add(b);s.flipped=[];message('🌟 ペア成立！ すごい！');
   if(s.matched.size===s.cards.length){
    const count=s.turns,level=s.difficulty;
    setBest('memory'+level,count,true);
    win('全部そろった！',s.pairs+'ペアを '+count+'回で完成！ 🎉　最少記録：'+records['memory'+level]+'回');
    return;
   }
  }else{s.locked=true;message('ちがう2枚だったね。場所を覚えておこう！',false);}
 }
 renderMemory();
 if(s.locked)later(()=>{s.flipped=[];s.locked=false;renderMemory()},1000);
}
/* ハイ＆ロー */
function startHighLow(){const cards=shuffle(deck52());st={cards,current:cards.shift(),next:null,streak:0,correct:0,round:0,phase:'guess',max:25};renderHighLow();}
function renderHighLow(){
 const s=st;
 info('第 '+(Math.min(s.round+1,s.max))+' / '+s.max+' ラウンド　｜　連続正解 '+s.streak+'　｜　最高記録 '+(records.highlow||0));
 board('<div class="felt"><h3>次は大きい？ 小さい？（Aが1、Kが13）</h3><div class="deckRow">'+cardVisual(s.current)+(s.phase==='reveal'?cardVisual(s.next):cardVisual(s.current,{back:true}))+'</div><p class="tableLabel">'+(s.phase==='guess'?'右のカードを予想してね！':'次のカードが出たよ！')+'</p></div>');
 if(s.phase==='guess'){
  foot('<button id="higher" class="act gold">⬆️ 大きい</button><button id="lower" class="act gold">⬇️ 小さい</button>');
  $('higher').onclick=()=>guessHighLow(1);$('lower').onclick=()=>guessHighLow(-1);
 }else{
  foot('<button id="nextHighLow" class="act gold">次のカードへ ▶</button>');
  $('nextHighLow').onclick=()=>{if(s.round>=s.max){win('チャレンジ終了！',s.max+'ラウンドで連続最高'+(records.highlow||0)+'！');return;}s.current=s.next;s.next=null;s.phase='guess';message('');renderHighLow();};
 }
}
function guessHighLow(direction){
 const s=st;if(game!=='highlow'||s.phase!=='guess')return;
 s.next=s.cards.shift();if(!s.next){win('カードを全部使ったよ！','最高連続正解：'+(records.highlow||0));return}
 const diff=Math.sign(s.next.rank-s.current.rank);s.round++;s.phase='reveal';
 if(diff===0)message('🤝 同じ数字！ 引き分け。連続記録はそのまま！');
 else if(diff===direction){s.streak++;s.correct++;setBest('highlow',s.streak);message('✨ 大正解！ '+s.streak+'連続！')}
 else{s.streak=0;message('おしい！ 次のカードで取り戻そう！',false)}
 renderHighLow();
}
/* ババ抜き */
function discardPairs(cards){
 const grouped=new Map();for(const c of cards){const k=String(c.rank);if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(c)}
 return [...grouped.values()].flatMap(v=>v.length%2?v.slice(-1):[]).sort((a,b)=>a.rank-b.rank||a.suit.localeCompare(b.suit));
}
function oldMaidDeck(){return shuffle([...Array.from({length:13},(_,i)=>[card('H',i+1),card('S',i+1)]).flat(),{suit:'J',rank:0,id:'J0'}]);}
function startOldMaid(){
 const cards=oldMaidDeck(),p=[],ai=[];
 cards.forEach((c,i)=>(i%2?p:ai).push(c));st={player:discardPairs(p),ai:discardPairs(ai),phase:'choose',round:1,status:'サイ校キャラの伏せたカードから1枚選ぼう！'};
 if(st.player.length===0||st.ai.length===0){startOldMaid();return}
 renderOldMaid();
}
function renderOldMaid(){
 const s=st;
 info('第'+s.round+'ターン｜あなた '+s.player.length+'枚 ・ サイ校キャラ '+s.ai.length+'枚　｜　最後のジョーカーを残さないでね！');
 board('<div class="felt"><h3>🤖 サイ校キャラの手札（裏向き） '+s.ai.length+'枚</h3><div class="deckRow">'+s.ai.map((c,i)=>buttonCard(c,i,{back:true,small:true,disabled:s.phase!=='choose',aria:'サイ校キャラの伏せたカード '+(i+1)+' を引く'})).join('')+'</div><p class="tableLabel">'+s.status+'</p><h3>🙋 あなたの手札（同じ数字2枚で消える）</h3><div class="deckRow">'+s.player.map(c=>cardVisual(c,{small:true})).join('')+'</div></div>');
 if(s.phase==='choose')for(const b of $('board').querySelectorAll('[data-index]'))b.onclick=()=>pickOldMaid(Number(b.dataset.index));
 foot('<span class="scoreItem">🏆 サイ校キャラへの勝利 '+(records.oldmaid||0)+'回</span>');
}
function endOldMaid(){
 if(st.player.length===0){setBest('oldmaid',(records.oldmaid||0)+1);win('あなたの勝ち！','最後のジョーカーはサイ校キャラの手元に！ '+records.oldmaid+'勝目だよ！');return true}
 if(st.ai.length===0){win('サイ校キャラの勝ち！','ジョーカーが残っちゃった！ 次は勝とうね。');return true}
 return false;
}
function pickOldMaid(i){
 const s=st;if(game!=='oldmaid'||s.phase!=='choose'||!s.ai[i])return;
 const drawn=s.ai.splice(i,1)[0];s.player=discardPairs([...s.player,drawn]);
 if(endOldMaid())return;
 s.phase='ai';s.status='あなたが '+(drawn.rank===0?'ジョーカー':RANKS[drawn.rank])+' を引いたよ。次はサイ校キャラの番！';message('サイ校キャラがカードを選んでいるよ。');renderOldMaid();
 later(()=>{
  if(game!=='oldmaid'||st!==s)return;
  const picked=s.player.splice(random(s.player.length),1)[0];
  s.ai=discardPairs([...s.ai,picked]);s.round++;
  if(endOldMaid())return;
  s.phase='choose';s.status='サイ校キャラは '+(picked.rank===0?'ジョーカー':RANKS[picked.rank])+' を引いた！ あなたの番！';
  message('');renderOldMaid();
 },800);
}
/* 七並べ */
function startSevens(){
 const all=shuffle(deck52().filter(c=>c.rank!==7));const user=all.slice(0,24).sort(sortCards),ai=all.slice(24);
 const laid=new Set(SUITS.map(s=>s.id+'7'));
 st={user,ai,laid,phase:'user',turn:1,status:'手札から、場のカードと数字がつながるカードを出そう！'};
 renderSevens();
}
function sortCards(a,b){return SUITS.findIndex(s=>s.id===a.suit)-SUITS.findIndex(s=>s.id===b.suit)||a.rank-b.rank}
function legalSevens(c,laid){if(laid.has(c.id))return false;return laid.has(c.suit+(c.rank-1))||laid.has(c.suit+(c.rank+1));}
function renderSevens(){
 const s=st,canPlay=s.user.filter(c=>legalSevens(c,s.laid));
 info('第'+s.turn+'ターン　｜　🙋あなた '+s.user.length+'枚　🤖サイ校キャラ '+s.ai.length+'枚　｜　'+s.status);
 board('<div class="felt"><h3>🟢 場のカード｜7から左右へつなごう</h3>'+SUITS.map(suit=>'<div class="suitRow"><div class="suitTag" style="color:'+(suit.red?'#ff9ea5':'#dfebff')+'">'+suit.symbol+'</div><div class="slots">'+Array.from({length:13},(_,i)=>{const rank=i+1,on=s.laid.has(suit.id+rank);return '<div class="slot '+(on?'on '+(suit.red?'red':''):'')+'" aria-label="'+suit.name+' '+RANKS[rank]+' '+(on?'場に出ている':'未配置')+'">'+(on?RANKS[rank]:'·')+'</div>'}).join('')+'</div></div>').join('')+
 '<h3>🙋 あなたのカード（出せるカードだけ光るよ）</h3><div class="hand">'+s.user.map((c,i)=>buttonCard(c,i,{small:true,disabled:s.phase!=='user'||!legalSevens(c,s.laid),aria:SUITS.find(x=>x.id===c.suit).name+'の'+RANKS[c.rank]+(legalSevens(c,s.laid)?'・出せる':'・まだ出せない')})).join('')+'</div></div>');
 if(s.phase==='user')for(const b of $('board').querySelectorAll('[data-index]'))b.onclick=()=>playSevens(Number(b.dataset.index));
 if(s.phase==='user'&&!canPlay.length){
  message('出せるカードがないよ。パスしてサイ校キャラに交代しよう。',false);
  foot('<button class="act gold" id="passSevens">⏭ パスしてサイ校キャラの番へ</button>');$('passSevens').onclick=()=>{if(game!=='sevens')return;s.phase='ai';s.status='出せるカードがなかったのでパス！';renderSevens();later(turnSevensAI,550)};
 }else foot('<span class="scoreItem">⚡ 出せるカード '+canPlay.length+' 枚</span>');
}
function playSevens(i){
 const s=st;if(game!=='sevens'||s.phase!=='user')return;
 const c=s.user[i];if(!c||!legalSevens(c,s.laid))return;
 s.user.splice(i,1);s.laid.add(c.id);
 if(s.user.length===0){setBest('sevens',(records.sevens||0)+1);win('七並べに勝利！','全部のカードを出せたよ！ 合計 '+records.sevens+' 勝！');return}
 s.phase='ai';s.status='あなたは '+SUITS.find(x=>x.id===c.suit).symbol+RANKS[c.rank]+' を出した！ サイ校キャラが考え中…';
 message('サイ校キャラの番だよ。');renderSevens();later(turnSevensAI,650);
}
function turnSevensAI(){
 const s=st;if(game!=='sevens'||s.phase!=='ai')return;
 const options=s.ai.filter(c=>legalSevens(c,s.laid));
 if(options.length){
  // Prefer extending the shorter open run to keep the computer challenging but fair.
  const selected=options[random(options.length)];
  s.ai.splice(s.ai.indexOf(selected),1);s.laid.add(selected.id);
  if(s.ai.length===0){win('サイ校キャラの勝ち！','サイ校キャラが先に全部出したよ！ もう一度挑戦！');return}
  s.status='サイ校キャラは '+SUITS.find(x=>x.id===selected.suit).symbol+RANKS[selected.rank]+' を出した！ あなたの番！';
 }else s.status='サイ校キャラは出せるカードがないのでパス！ あなたの番！';
 s.phase='user';s.turn++;message('');renderSevens();
}
})();