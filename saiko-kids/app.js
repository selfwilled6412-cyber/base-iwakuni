(() => {
'use strict';
const $ = id => document.getElementById(id);
const LABELS = {easy:'やさしい',normal:'ふつう',hard:'むずかしい'};
const NPAIRS = {easy:4,normal:6,hard:8};
const NDIFF = {easy:3,normal:4,hard:6};
const EMOJI = ['🐱','🐶','🐼','🦊','🐸','🐰','🐨','🦁','🐙','🐧','🦋','🦄','🌈','🚀','🍙','🍓','🐢','🐬','🪁','🎸'];
const STORE='saiko-kids-arcade-v1';
const initial=()=>({memory:0,spot:0,puzzle:0});
let stats=initial();
try{const loaded=JSON.parse(localStorage.getItem(STORE)||'null');if(loaded&&typeof loaded==='object'){for(const k of Object.keys(stats))stats[k]=Number.isInteger(loaded[k])&&loaded[k]>=0?Math.min(9999,loaded[k]):0;}}catch(e){}
let difficulty='easy',mode=null,session=0,game=null,recorded=false;
let speakButton=null;
const pickRandom=array=>{const a=array.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function persist(){try{localStorage.setItem(STORE,JSON.stringify(stats));}catch(e){}}
function showStats(){$('stats').innerHTML='<strong>🌟 あそんだ記録</strong>　🃏カード '+stats.memory+'回　／　🔍ちがい探し '+stats.spot+'回　／　🧩ひらめき '+stats.puzzle+'回<br>※ 名前や点数は送信されません。この端末だけの記録です。';}
showStats();
function feedback(text,type){const el=$('feedback');el.textContent=text;el.className='feedback'+(type?' '+type:'');el.hidden=!text;}
function hint(text){const el=$('extraHint');el.textContent=text||'';el.hidden=!text;}
function setTitle(title,sub){$('gameTitle').textContent=title;$('gameSubtitle').textContent=sub;}
function goHome(){session++;mode=null;game=null;window.speechSynthesis?.cancel?.();$('home').hidden=false;$('gamePanel').hidden=true;feedback('');hint('');showStats();window.scrollTo?.({top:0,behavior:'smooth'});}
function start(which){session++;mode=which;recorded=false;$('home').hidden=true;$('gamePanel').hidden=false;feedback('');hint('');
 if(which==='memory'){initMemory();}
 else if(which==='spot'){initSpot();}
 else{initPuzzle();}
 window.scrollTo?.({top:0,behavior:'smooth'});
}
function finish(msg){if(!recorded){stats[mode]++;recorded=true;persist();}hint('');feedback('');
 const body=$('gameBody');body.innerHTML='<section class="endState"><div style="font-size:76px">🏆</div><h3>クリア！ おめでとう！</h3><p>'+msg+'</p><button type="button" class="go" id="again">🔁 もう一度あそぶ</button></section>';
 $('again').onclick=()=>start(mode);$('hintBtn').disabled=true;
}
for(const btn of document.querySelectorAll('.diff'))btn.addEventListener('click',()=>{
 difficulty=btn.dataset.level;
 for(const item of document.querySelectorAll('.diff')){const active=item===btn;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));}
});
for(const btn of document.querySelectorAll('[data-open]'))btn.addEventListener('click',()=>start(btn.dataset.open));
$('backHome').onclick=goHome;
$('restart').onclick=()=>{if(mode)start(mode);};
$('resetStats').onclick=()=>{if(!window.confirm('この端末の「あそんだ記録」をゼロにしますか？'))return;stats=initial();persist();showStats();};
$('hintBtn').onclick=()=>{if(!game)return;if(mode==='memory')hintMemory();else if(mode==='spot')hintSpot();else hintPuzzle();};
function speak(text){if(!('speechSynthesis'in window)){feedback('読み上げに対応していない端末です。');return;}
 window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='ja-JP';utterance.rate=.88;window.speechSynthesis.speak(utterance);
}
speakButton=document.createElement('button');speakButton.type='button';speakButton.className='pillBtn';speakButton.textContent='🔊 説明を読む';$('backHome').parentElement.prepend(speakButton);
speakButton.onclick=()=>{if(mode==='memory')speak('同じ絵柄のカードを2枚見つけよう。');else if(mode==='spot')speak('2つの絵を見比べて、右側の違うところをタップしてね。');else if(mode==='puzzle'){const q=game?.questions?.[game?.idx];if(q)speak(q.title+'。'+q.question);}};
// 1. Memory
function initMemory(){
 const n=NPAIRS[difficulty],symbols=pickRandom(EMOJI).slice(0,n);
 const deck=pickRandom(symbols.concat(symbols)).map((v,i)=>({id:i,value:v,up:false,matched:false}));
 game={kind:'memory',deck,first:null,lock:false,moves:0,matches:0};
 setTitle('🃏 おぼえてカードめくり',LABELS[difficulty]+'｜'+n+'組のカードを見つけよう！');
 $('hintBtn').disabled=false;
 renderMemory();
}
function renderMemory(){
 const n=game.deck.length/2;
 const info='<div class="gameInfo"><span>✅ '+game.matches+' / '+n+' 組みつけた</span><span>🃏 めくった回数：'+game.moves+'</span></div>';
 const cards=game.deck.map((c,i)=>{
  const visible=c.up||c.matched;
  return '<button type="button" data-card="'+i+'" class="memoryCard'+(visible?' faceUp':'')+(c.matched?' matched':'')+'" aria-label="'+(visible?c.value:'裏向きのカード')+'" aria-pressed="'+visible+'" '+(c.matched?'disabled':'')+'>'+(visible?c.value:'？')+'</button>';
 }).join('');
 $('gameBody').innerHTML=info+'<div class="memoryGrid'+(difficulty==='hard'?' hard':'')+'">'+cards+'</div>';
}
$('gameBody').addEventListener('click',event=>{
 if(mode!=='memory'||!game||game.lock)return;
 const button=event.target.closest('[data-card]');if(!button)return;
 const index=Number(button.dataset.card),card=game.deck[index];if(!card||card.up||card.matched)return;
 card.up=true;
 if(game.first===null){game.first=index;renderMemory();return;}
 game.moves++;
 const first=game.deck[game.first];
 if(first.value===card.value){
   first.matched=true;card.matched=true;game.first=null;game.matches++;
   renderMemory();feedback('ぴったり！ 同じカードが見つかったね！','success');
   if(game.matches===game.deck.length/2)finish('すべてのペアを見つけたね！ '+game.moves+'回でクリア！');
 }else{
   game.lock=true;const currentSession=session;renderMemory();feedback('絵柄が違うみたい。場所を覚えておこう！','retry');
   window.setTimeout(()=>{
     if(mode!=='memory'||session!==currentSession||!game||game.kind!=='memory')return;
     card.up=false;first.up=false;game.first=null;game.lock=false;renderMemory();
   },900);
 }
});
function hintMemory(){
 if(game.lock){hint('カードが戻ったら、もう一度考えてみよう！');return;}
 const unmatched=game.deck.filter(c=>!c.matched);
 if(!unmatched.length)return;
 const card=unmatched[0];
 hint('💡 ヒント：まだ見つけていない絵柄は「'+card.value+'」だよ。どこにあったかな？');
}
// 2. Spot-the-difference
const DIFFS=[
 {id:'sun',name:'太陽の色',x:507,y:70,loc:'右上の空'},
 {id:'balloon',name:'風船の色',x:125,y:145,loc:'左の風船'},
 {id:'apple',name:'木の実',x:416,y:227,loc:'右の大きな木'},
 {id:'cloud',name:'白い雲',x:254,y:79,loc:'空の真ん中'},
 {id:'flower',name:'お花の真ん中',x:509,y:314,loc:'右下のお花'},
 {id:'duck',name:'アヒルの向き',x:268,y:309,loc:'池の上'}
];
const SCENE_START='<svg viewBox="0 0 600 370" xmlns="http://www.w3.org/2000/svg" aria-label="公園のイラスト">';
function sceneSvg(changed,found){
 const has=id=>changed.includes(id),right=!!found;
 const cloud=has('cloud')?'':'<g fill="#fff"><ellipse cx="252" cy="77" rx="44" ry="19"/><circle cx="229" cy="66" r="22"/><circle cx="257" cy="58" r="25"/></g>';
 const sun='<g><circle cx="507" cy="70" r="35" fill="'+(has('sun')?'#ff9279':'#ffd75b')+'" stroke="#e8ab34" stroke-width="5"/><g stroke="#f1b443" stroke-width="5" stroke-linecap="round"><path d="M507 19v-11 M507 119v11 M455 70h-11 M559 70h11 M470 34l-10-10 M544 109l10 10 M545 33l9-9 M469 109l-9 10"/></g></g>';
 const flowers='<g><path d="M510 333v20" stroke="#459a65" stroke-width="5"/><g fill="#ff9eb9"><circle cx="510" cy="300" r="14"/><circle cx="493" cy="313" r="14"/><circle cx="527" cy="313" r="14"/><circle cx="499" cy="330" r="14"/><circle cx="520" cy="330" r="14"/></g><circle cx="509" cy="315" r="10" fill="'+(has('flower')?'#38c2c5':'#f6ce3d')+'"/></g>';
 const duck='<g transform="'+(has('duck')?'translate(540 0) scale(-1 1)':'')+'"><ellipse cx="262" cy="306" rx="30" ry="17" fill="#ffe3a2" stroke="#d38f47" stroke-width="3"/><circle cx="278" cy="288" r="16" fill="#ffe3a2" stroke="#d38f47" stroke-width="3"/><path d="M293 292l15 6-15 5z" fill="#ff993c"/><circle cx="282" cy="286" r="3.4" fill="#29354c"/><ellipse cx="255" cy="309" rx="12" ry="8" fill="#ffd071"/></g>';
 const apple=has('apple')?'':'<circle cx="416" cy="227" r="12" fill="#f65050" stroke="#c62e35" stroke-width="2"/>';
 let extra='';
 if(right){
  const overlay=DIFFS.filter(d=>game.active.some(a=>a.id===d.id)).map(d=>{
    return '<circle data-diff="'+d.id+'" tabindex="0" role="button" aria-label="ちがいを選ぶ：'+d.name+'" class="spotTarget" cx="'+d.x+'" cy="'+d.y+'" r="37"/>'+(game.found.has(d.id)?'<circle class="spotRing" cx="'+d.x+'" cy="'+d.y+'" r="38"/>':'');
  }).join('');
  extra='<g>'+overlay+'</g>';
 }
 return SCENE_START+
 '<rect width="600" height="370" fill="#bbebfc"/>'+
 '<path d="M0 267 Q170 217 301 271 T600 264 V370 H0Z" fill="#8ed2a1"/>'+
 '<path d="M0 321 Q210 289 360 323 T600 320 V370 H0Z" fill="#58b982"/>'+
 '<ellipse cx="273" cy="319" rx="118" ry="41" fill="#76cbe0" stroke="#64b0c4" stroke-width="3"/>'+
 '<g fill="#fff"><ellipse cx="75" cy="76" rx="52" ry="16"/><circle cx="58" cy="65" r="20"/><circle cx="82" cy="59" r="24"/></g>'+
 cloud+sun+
 '<path d="M396 287 V177" stroke="#94673e" stroke-width="28" stroke-linecap="round"/>'+
 '<ellipse cx="400" cy="174" rx="86" ry="94" fill="#47a96c" stroke="#2c925c" stroke-width="5"/>'+
 '<ellipse cx="363" cy="135" rx="46" ry="42" fill="#5dc27b"/><ellipse cx="436" cy="139" rx="48" ry="43" fill="#5dc27b"/>'+
 apple+
 '<path d="M125 174v110" stroke="#8a5c63" stroke-width="3"/>'+
 '<ellipse cx="125" cy="141" rx="32" ry="43" fill="'+(has('balloon')?'#b486fa':'#ff6e85')+'" stroke="#c15876" stroke-width="4"/>'+
 '<path d="M118 184l7 9 7-9" fill="none" stroke="#ad5379" stroke-width="3"/>'+
 '<path d="M65 342h94" stroke="#92673c" stroke-width="8" stroke-linecap="round"/>'+
 '<rect x="76" y="285" width="72" height="14" rx="4" fill="#ce975a"/>'+
 '<rect x="83" y="303" width="10" height="39" fill="#a37342"/><rect x="130" y="303" width="10" height="39" fill="#a37342"/>'+
 duck+flowers+
 '<g fill="#fff6dc"><circle cx="37" cy="280" r="8"/><circle cx="561" cy="265" r="9"/><circle cx="51" cy="310" r="6"/></g>'+
 extra+'</svg>';
}
function initSpot(){
 game={kind:'spot',active:DIFFS.slice(0,NDIFF[difficulty]),found:new Set(),hintIdx:0};
 setTitle('🔍 ちがいを見つけよう',LABELS[difficulty]+'｜右の絵をタップ！ '+game.active.length+'か所のちがいを探そう。');
 $('hintBtn').disabled=false;renderSpot();
}
function renderSpot(){
 $('gameBody').innerHTML='<div class="gameInfo"><span>🔍 見つけた：'+game.found.size+' / '+game.active.length+' か所</span><span>☝️ 右側のイラストをタップしてね</span></div>'+
 '<div class="scenePair"><div class="sceneBlock"><h3>🌳 左の絵（お手本）</h3><div class="sceneBox">'+sceneSvg([],false)+'</div></div>'+
 '<div class="sceneBlock"><h3>🔍 右の絵（ちがいを探そう）</h3><div class="sceneBox" id="rightScene">'+sceneSvg(game.active.map(d=>d.id),true)+'</div></div></div>'+
 '<div class="spotNote">スマホでは2枚が上下に並ぶよ。違うところは右の絵をタップ！</div>';
}
function selectSpot(id){
 if(!game||mode!=='spot'||game.found.has(id)||!game.active.some(d=>d.id===id))return;
 game.found.add(id);feedback('見つけた！ やったね！','success');hint('');renderSpot();
 if(game.found.size===game.active.length)finish(game.active.length+'か所、全部見つけられたね！ 観察力ばつぐん！');
}
$('gameBody').addEventListener('click',event=>{if(mode!=='spot')return;const target=event.target.closest('[data-diff]');if(target)selectSpot(target.getAttribute('data-diff'));});
$('gameBody').addEventListener('keydown',event=>{if(mode!=='spot'||!['Enter',' '].includes(event.key))return;const target=event.target.closest('[data-diff]');if(target){event.preventDefault();selectSpot(target.getAttribute('data-diff'));}});
function hintSpot(){const rest=game.active.filter(d=>!game.found.has(d.id));if(!rest.length)return;hint('💡 ヒント：次は「'+rest[0].loc+'」をじっくり見比べてみよう。');}
// 3. Insight puzzles
const PUZZLES={"easy":[{"title":"文字をならべよう","question":"「ご・ん・り」\n3文字をならびかえると、何の食べものになる？","choices":["りんご","みかん","ぶどう","もも"],"answer":"りんご","hint":"赤や緑の、まるい果物だよ。","explain":"「ご・ん・り」を並べ替えると「り・ん・ご」！"},{"title":"道のりのなぞ","question":"右に2歩、上に1歩、左に1歩。\nスタートと比べて、最後はどこにいる？","choices":["右に1歩・上に1歩","右に3歩・上に1歩","左に1歩","同じ場所"],"answer":"右に1歩・上に1歩","hint":"右2歩と左1歩は、合わせると右1歩。","explain":"右へ2歩進み、左に1歩戻るから右へ1歩。さらに上へ1歩！"},{"title":"きまりを発見！","question":"赤・青・赤・青・赤・？\n次にくる色はどれ？","choices":["黄色","青","緑","赤"],"answer":"青","hint":"2つの色が交代で並んでいるよ。","explain":"赤と青が交互に繰り返されるので、次は青。"},{"title":"しりとりの橋","question":"ねこ → こま → まり → ？\nしりとりを続けられる言葉は？","choices":["りんご","かさ","ねこ","まめ"],"answer":"りんご","hint":"「まり」の最後は「り」だよ。","explain":"最後の「り」から始まる「りんご」がつながるよ。"},{"title":"2つずつ増える数","question":"1、3、5、7、？\n次はどの数字？","choices":["8","9","10","11"],"answer":"9","hint":"前の数にいつも2を足しているよ。","explain":"1から2ずつ増えているので7＋2＝9。"},{"title":"くるくる言葉","question":"「ひ・あ・さ」の3文字を並べ替えて、朝の空にあるものを作ろう。","choices":["あさひ","あひる","さかな","ひまわり"],"answer":"あさひ","hint":"朝にのぼる太陽のことだよ。","explain":"ひ・あ・さ → あ・さ・ひ（朝日）。"},{"title":"暗号メモ","question":"🍓＝「さ」　🍀＝「い」\n⭐＝「こ」　☁️＝「う」\n🍓🍀⭐☁️ は何と読む？","choices":["さいこう","こうさい","さこうい","いさこう"],"answer":"さいこう","hint":"左から順に、絵をひらがなに置き換えよう。","explain":"さ・い・こ・う → さいこう！"},{"title":"どっちの方向？","question":"スタートから「上・上・右・下」と進んだよ。\n最初の場所から見て、最後はどの方向？","choices":["右に1・上に1","左に1・上に1","上に2","同じ場所"],"answer":"右に1・上に1","hint":"上に2つ進んで下に1つ戻ると？","explain":"上に1、右に1進んだ場所にいるよ。"},{"title":"かくれている動物","question":"「さかな　ねこ　いぬ　りんご」\nこの中で、食べものではない動物の名前は？","choices":["ねこ と いぬ","さかな と りんご","りんご と ねこ","さかな だけ"],"answer":"ねこ と いぬ","hint":"食べものとしてではなく、家で飼う動物を考えてね。","explain":"この問題では、ペットとして親しまれる「ねこ」と「いぬ」が正解。"},{"title":"色の繰り返し","question":"🟥 🟥 🟦 🟥 🟥 🟦 🟥 🟥 ？\n次に来る色は？","choices":["🟥 赤","🟨 黄","🟦 青","🟩 緑"],"answer":"🟦 青","hint":"『赤・赤・青』の3つで1組になっているよ。","explain":"赤・赤・青を繰り返すので、最後は青。"}],"normal":[{"title":"数字のならび","question":"2 → 6 → 12 → 20 → ？\n次に入る数は？","choices":["26","28","30","32"],"answer":"30","hint":"増える数は、4・6・8… 次にいくつ増える？","explain":"差が4、6、8、10と増えるから20＋10＝30。"},{"title":"アルファベット暗号","question":"A=1、B=2、C=3… Z=26\n3 - 1 - 20 を英単語に直すと？","choices":["DOG","CAT","BAG","SUN"],"answer":"CAT","hint":"3番目のアルファベットはC。1番目はA。","explain":"3=C、1=A、20=T。つなげるとCAT！"},{"title":"3つの箱","question":"宝物は赤・青・緑の箱のどれか1つ。\n「赤ではない」「青ではない」はどちらも正しい。どの箱？","choices":["赤","青","緑","決められない"],"answer":"緑","hint":"使えない色を1つずつ消していこう。","explain":"赤でも青でもないので、残る箱は緑だけ。"},{"title":"差が増える数列","question":"5 → 11 → 19 → 29 → ？\n次の数字は？","choices":["38","39","41","43"],"answer":"41","hint":"増え方は6、8、10。次の増え方は？","explain":"差は6・8・10・12。29＋12＝41。"},{"title":"9日後は何曜日？","question":"今日は月曜日。今日を0日目として、9日後は何曜日？","choices":["火曜日","水曜日","木曜日","金曜日"],"answer":"水曜日","hint":"7日後は同じ月曜日。そこからあと2日だよ。","explain":"7日後は月曜日、8日後は火曜日、9日後は水曜日。"},{"title":"4人の席の謎","question":"ケイ・マイ・タク・リンが左から4席に座る。\nタクはいちばん左、リンはいちばん右。\nマイはケイのすぐ右。\n左から3番目は？","choices":["タク","ケイ","マイ","リン"],"answer":"マイ","hint":"左端と右端が決まるので、真ん中の2席を考えよう。","explain":"左から タク→ケイ→マイ→リン になる。3番目はマイ。"},{"title":"フルーツの数字","question":"🍓＋🍓＝10\n🍓＋🍋＝8\n🍋 はいくつ？","choices":["2","3","4","5"],"answer":"3","hint":"いちごが2つで10だから、いちごは5。","explain":"いちごは5。5＋レモン＝8だからレモンは3。"},{"title":"矢印のまわり方","question":"矢印が毎回、時計回りに90度ずつ回る。\n↑ → ↓ → ？","choices":["↑","→","↓","←"],"answer":"←","hint":"上・右・下の次はどの向き？","explain":"時計回りに上→右→下→左となる。"},{"title":"階段の数字","question":"ある階段には1段目に1個、2段目に2個、3段目に3個…と星を置く。\n1〜5段目の星は全部でいくつ？","choices":["10","12","15","20"],"answer":"15","hint":"1＋2＋3＋4＋5 を計算してみよう。","explain":"1＋2＋3＋4＋5＝15個。"},{"title":"二つの条件","question":"赤・青・緑の箱がある。宝物の箱には「赤ではない」「緑でもない」という2つの条件がある。\nどの箱？","choices":["赤","青","緑","決められない"],"answer":"青","hint":"赤と緑を選択肢から消そう。","explain":"赤でも緑でもないので、青だけが残る。"}],"hard":[{"title":"3桁の金庫","question":"3桁の番号は同じ数字を使わない。\n814：正しい数字1つ・位置は違う\n413：正しい数字1つ・位置も正しい\n086：正しい数字2つ・うち1つ位置も正しい\n938：正しい数字は0\n番号は？","choices":["406","460","640","046"],"answer":"406","hint":"938から9・3・8は入らない。正しい個数は「ちょうど」の数だよ。","explain":"406なら814は4だけ位置違い、413は4だけ位置一致、086は0と6のうち6が位置一致、938は全て不使用。"},{"title":"光る4マス","question":"2×2のランプはすべて消灯。\nボタン1〜4を押すと「自分のマス＋上下左右の隣」が反転する。\n左上と右下だけを点灯させたい。押すのは？\n\n  ① ②\n  ③ ④","choices":["①と④","①と②","②と③","③と④"],"answer":"①と④","hint":"①を押すと①②③が点灯。次に④を押すと②③④が反転するよ。","explain":"①で①②③がON、④で②③がOFFに戻り④がON。①と④だけ点灯。"},{"title":"5人の席順","question":"アオ・イオ・ウタ・エマ・オトが左から一列。\nイオは左端。\nウタはエマのすぐ左。\nオトはアオのすぐ右。\nエマは真ん中ではない。\n中央（3番目）はだれ？","choices":["アオ","イオ","ウタ","オト"],"answer":"オト","hint":"イオを左端にして、2人組「アオ→オト」「ウタ→エマ」を置こう。","explain":"左から イオ・アオ・オト・ウタ・エマ の順。中央はオト。"},{"title":"4桁の金庫","question":"暗証番号は4桁で、数字の重複なし。\n8943：数字が1個、位置まで正しい\n8029：数字が2個、うち1個は位置正解\n9517：数字が1個、位置は違う\n7190：数字が2個、うち1個は位置正解\n3925：数字が1個、位置は違う\nどの番号？","choices":["7042","7402","4072","7024"],"answer":"7042","hint":"8943のうち位置まで正しい数字はちょうど1個。938からではなく、すべての行を順に照らし合わせてね。","explain":"7042は5つの条件をすべて満たす唯一の暗証番号。"},{"title":"6人の記念写真","question":"カナ・アオ・エマ・ウタ・イオ・オトの6人。\nイオはオトより左。\nアオとイオの間に2人。\nアオとオトは隣り合わない。\nウタはイオより左。\nイオとカナは隣り合わない。\nエマとオトの間に2人。\nカナはウタより左。\n左から4番目は？","choices":["エマ","ウタ","イオ","オト"],"answer":"ウタ","hint":"『間に2人』とは位置の差が3ということ。","explain":"全条件を満たす並びは カナ→アオ→エマ→ウタ→イオ→オト。4番目はウタ。"},{"title":"黒丸のXOR暗号","question":"左と右の丸を比べ、同じ色なら○、違う色なら●。\n●○● と ○●● → ●●○\n●●○ と ●○○ → ○●○\nでは ○●● と ●●○ → ？","choices":["●○●","○●●","●●○","○○●"],"answer":"●○●","hint":"1文字ずつ比較。2つとも●、または2つとも○なら○。","explain":"○対●→●、●対●→○、●対○→●。だから●○●。"},{"title":"正しい札は2枚","question":"鍵はA・B・C・Dのどれか1箱。\n札A『鍵はBかCにある』\n札B『鍵はAにはない』\n札C『鍵はDにはない』\n札D『鍵はAにある』\n正しい札がちょうど2枚。鍵は？","choices":["A","B","C","D"],"answer":"A","hint":"鍵がAの場合、AとBは誤り、CとDは正しい。","explain":"Aは2枚が正しい。BとCなら3枚、Dなら1枚なので、答えはA。"},{"title":"3人の数字を解け","question":"A・B・Cはそれぞれ1〜9の数字。\nA＋B＝9\nB＋C＝8\nA＋C＝7\nA・B・Cの順に並べた3桁は？","choices":["453","435","345","543"],"answer":"453","hint":"最初と最後の式を足して、真ん中の式を引くとAが2つ分になる。","explain":"A=(9+7-8)÷2=4、B=5、C=3。だから453。"},{"title":"9つのスイッチ","question":"3×3のランプはすべて消灯。\n①②③\n④⑤⑥\n⑦⑧⑨\nボタンを押すとその位置と上下左右が反転する。\n④・⑦・⑨だけを点灯させる押し方は？","choices":["①④⑤⑨","①③⑤⑨","②④⑥⑧","③⑤⑥⑧"],"answer":"①④⑤⑨","hint":"①を押すと①②④、④を押すと①④⑤⑦が反転。重なりは消えるよ。","explain":"①④⑤⑨を押すと、反転を重ねた結果④⑦⑨だけがONになる。"},{"title":"魔方陣の最後のマス","question":"たて・よこ・斜めの合計が、どれも15になる3×3の表。\n8　1　6\n3　5　7\n4　9　？\n？に入る数字は？","choices":["1","2","3","4"],"answer":"2","hint":"下の横1列の合計を15にしよう。","explain":"4＋9＋2＝15。ほかの列や斜めも15になる。"}]};
const PUZZLE_CYCLES_KEY='saiko-kids-puzzle-cycles-v2';
let puzzleCycles={};
try{puzzleCycles=JSON.parse(localStorage.getItem(PUZZLE_CYCLES_KEY)||'{}')||{}}catch(e){puzzleCycles={}}
function drawPuzzleBatch(level){
 const pool=PUZZLES[level],ids=pool.map((_,i)=>i);
 let cycle=puzzleCycles[level];
 const valid=cycle&&Array.isArray(cycle.order)&&cycle.order.length===ids.length
  &&new Set(cycle.order).size===ids.length&&cycle.order.every(id=>Number.isInteger(id)&&id>=0&&id<ids.length)
  &&Number.isInteger(cycle.pos)&&cycle.pos>=0&&cycle.pos<=ids.length;
 if(!valid||cycle.pos===ids.length)cycle={order:pickRandom(ids),pos:0};
 const picked=cycle.order.slice(cycle.pos,Math.min(cycle.pos+3,ids.length)).map(i=>pool[i]);
 cycle.pos+=picked.length;puzzleCycles[level]=cycle;
 try{localStorage.setItem(PUZZLE_CYCLES_KEY,JSON.stringify(puzzleCycles))}catch(e){}
 return picked;
}
function initPuzzle(){
 game={kind:'puzzle',questions:drawPuzzleBatch(difficulty),idx:0,correct:false,wrong:0};
 const count=game.questions.length;
 setTitle('🧩 ひらめきパズル',LABELS[difficulty]+'｜今回'+count+'問。各難易度の10問が全部出るまで重複なし！');
 $('hintBtn').disabled=false;renderPuzzle();
}
function renderPuzzle(){
 const q=game.questions[game.idx];
 const options=q.choices.map((c,i)=>'<button type="button" class="choice" data-choice="'+i+'" '+(game.correct?'disabled':'')+'>'+c+'</button>').join('');
 $('gameBody').innerHTML='<div class="gameInfo"><span>🧩 第'+(game.idx+1)+'問 / '+game.questions.length+'</span><span>🔎 '+LABELS[difficulty]+'</span></div>'+
 '<div class="puzzleBox"><h3 class="puzzleHeading">'+q.title+'</h3><p class="puzzleQuestion">'+q.question+'</p><div class="choices">'+options+'</div>'+
 (game.correct?'<div style="margin-top:18px"><button class="go" id="nextPuzzle" type="button">'+(game.idx===game.questions.length-1?'🏆 結果を見る':'➡ 次の問題')+'</button></div>':'')+'</div>';
 if(game.correct){feedback('🎉 正解！ '+q.explain,'success');}
}
$('gameBody').addEventListener('click',event=>{
 if(mode!=='puzzle'||!game||game.correct)return;
 const btn=event.target.closest('[data-choice]');if(!btn)return;
 const q=game.questions[game.idx],answer=q.choices[Number(btn.dataset.choice)];
 if(answer===q.answer){game.correct=true;hint('');renderPuzzle();btn?.classList.add('correct');}
 else{game.wrong++;feedback('おしい！ もう一度考えてみよう。ヒントも使えるよ。','retry');btn.classList.add('wrong');}
});
$('gameBody').addEventListener('click',event=>{
 if(mode!=='puzzle')return;
 if(!event.target.closest('#nextPuzzle'))return;
 game.idx++;game.correct=false;game.wrong=0;feedback('');hint('');
 if(game.idx>=game.questions.length)finish(game.questions.length+'問すべてクリア！ ひらめき名人だね！');else{renderPuzzle();$('hintBtn').disabled=false;}
});
function hintPuzzle(){const q=game.questions[game.idx];hint('💡 ヒント：'+q.hint);}
})();