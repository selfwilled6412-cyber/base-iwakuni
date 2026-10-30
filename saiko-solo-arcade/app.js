(()=>{'use strict';
const $=id=>document.getElementById(id),NAMES={reaction:'⚡ 反射神経チャレンジ',mole:'🐹 もぐらタッチ',simon:'🌈 カラー記憶ゲーム',order:'🔢 数字を順番に',math:'🧮 計算スピード対決',odd:'🔍 1つだけ違うもの',word:'🔤 ことば並べ替え',merge:'🧠 2048数字パズル',rps:'✊ じゃんけんバトル',slide:'🧩 スライドパズル'};
const STORE='saiko-solo-games-v1';let records={};try{const d=JSON.parse(localStorage.getItem(STORE)||'{}');if(d&&typeof d==='object')records=d;}catch(e){}
let mode=null,state=null,token=0,timeouts=[],intervals=[];
const pick=a=>a[Math.floor(Math.random()*a.length)],shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const show=(s,level='')=>{$('gameFeedback').textContent=s;$('gameFeedback').style.color=level==='bad'?'#b35a3c':'#258066'};
const later=(fn,ms)=>{const t=token;timeouts.push(setTimeout(()=>{if(token===t)fn();},ms));};
const every=(fn,ms)=>{const t=token;intervals.push(setInterval(()=>{if(token===t)fn();},ms));};
const cleanup=()=>{token++;for(const t of timeouts)clearTimeout(t);for(const t of intervals)clearInterval(t);timeouts=[];intervals=[];};
const info=text=>$('gameInfo').textContent=text;
const board=html=>$('gameBoard').innerHTML=html;
function record(key,value,lower=false){
 const old=Number(records[key]);
 if(!Number.isFinite(old)||!records[key]||(lower?value<old:value>old)){records[key]=value;try{localStorage.setItem(STORE,JSON.stringify(records))}catch(e){}}
}
function home(){cleanup();mode=null;state=null;$('panel').hidden=true;$('home').hidden=false;show('');}
function start(m){if(!NAMES[m])return;cleanup();mode=m;state={};$('panel').dataset.mode=m;$('home').hidden=true;$('panel').hidden=false;$('gameTitle').textContent=NAMES[m];show('');
 ({reaction:initReaction,mole:initMole,simon:initSimon,order:initOrder,math:initMath,odd:initOdd,word:initWord,merge:initMerge,rps:initRps,slide:initSlide})[m]();
 window.scrollTo?.({top:0,behavior:'smooth'});
}
const done=(message,again='もう一度遊ぶ')=>{const m=mode;cleanup();info('🎉 チャレンジ終了！');board('<div class="gameDone"><div style="font-size:69px">🎉🏆✨</div><strong>おつかれさま！</strong><p>'+message+'</p><button id="again" class="action good" type="button">'+again+'</button></div>');$('again').onclick=()=>start(m);};
document.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>start(b.dataset.game));
$('back').onclick=home;$('restart').onclick=()=>{if(mode)start(mode)};
function initReaction(){state={phase:'idle',start:0};info('黄色になったら待とう。緑に変わった瞬間にタップ！');drawReaction();}
function drawReaction(){
 const phase=state.phase,labels={idle:'タップして開始！',waiting:'まだ押さないで…',ready:'いまだ！ タップ！',false:'フライング！ もう一度',result:'もう一度チャレンジ'};
 board('<button type="button" id="reactionButton" class="bigBtn '+(phase==='waiting'?'ready':phase==='ready'?'go':phase==='false'?'false':'')+'">'+labels[phase]+'</button>');
 $('reactionButton').onclick=()=>{
  if(state.phase==='idle'||state.phase==='false'||state.phase==='result'){
   cleanup();state={phase:'waiting',start:0};drawReaction();show('緑になるまで待とう！');
   later(()=>{state.phase='ready';state.start=performance.now();drawReaction()},1000+Math.floor(Math.random()*2300));
  }else if(state.phase==='waiting'){state.phase='false';cleanup();drawReaction();show('フライング！ 緑になるまで待ってね。','bad');}
  else if(state.phase==='ready'){const ms=Math.round(performance.now()-state.start);state.phase='result';record('reaction',ms,true);drawReaction();show(ms+' ミリ秒！ '+(ms<300?'すごい反射神経！':'次はもっと速くできるかな？')+'　自己ベスト：'+records.reaction+' ms');}
 };
}
function initMole(){state={sec:20,score:0,target:-1,live:true};info('20秒間で何匹タップできるかな？');drawMole();moveMole();every(()=>{state.sec--;if(state.sec<=0){state.live=false;record('mole',state.score);done('もぐらを'+state.score+'匹タップ！ ベスト：'+records.mole+'匹');}else updateMoleInfo()},1000);}
function updateMoleInfo(){info('⏱ 残り'+state.sec+'秒　｜　🐹 タップした数：'+state.score+'匹　｜　最高記録：'+(records.mole||0));}
function drawMole(){board('<div class="tiles">'+Array.from({length:12},(_,i)=>'<button class="tile" type="button" data-hole="'+i+'" aria-label="穴'+(i+1)+'">🕳️</button>').join('')+'</div>');for(const b of $('gameBoard').querySelectorAll('[data-hole]'))b.onclick=()=>{if(!state.live)return;const i=Number(b.dataset.hole);if(i===state.target){state.score++;moveMole();show('やった！ '+state.score+'匹！');}else show('おしい！ 次を狙おう！','bad');};updateMoleInfo();}
function moveMole(){if(!state||!state.live||mode!=='mole')return;state.target=Math.floor(Math.random()*12);for(const b of $('gameBoard').querySelectorAll('[data-hole]'))b.textContent=Number(b.dataset.hole)===state.target?'🐹':'🕳️';}
const SIMON_COLORS=['#f25c64','#4bb9ed','#fbd24f','#59ca79'];
function initSimon(){state={sequence:[],entry:0,playing:false,round:0};board('<div class="simon">'+SIMON_COLORS.map((c,i)=>'<button type="button" data-simon="'+i+'" style="background:'+c+'" aria-label="色'+(i+1)+'"></button>').join('')+'</div>');for(const b of $('gameBoard').querySelectorAll('[data-simon]'))b.onclick=()=>tapSimon(Number(b.dataset.simon));nextSimon();}
function flashSimon(i){const b=$('gameBoard').querySelector('[data-simon="'+i+'"]');if(!b)return;b.classList.add('flash');later(()=>b.classList.remove('flash'),450);}
function nextSimon(){state.round++;state.sequence.push(Math.floor(Math.random()*4));state.entry=0;state.playing=true;info('第'+state.round+'ラウンド｜光った順番を覚えよう！');show('よく見て覚えてね。');state.sequence.forEach((v,i)=>later(()=>flashSimon(v),900+i*760));later(()=>{state.playing=false;show('さあ、同じ順番に押してね！');},1100+state.sequence.length*760);}
function tapSimon(i){if(state.playing)return;flashSimon(i);if(i!==state.sequence[state.entry]){const best=state.round-1;record('simon',best);done('色を'+best+'ラウンド覚えられたね！ 最高記録：'+(records.simon||0)+'ラウンド');return;}state.entry++;if(state.entry===state.sequence.length){show('正解！ すごい記憶力！');if(state.round>=7){record('simon',7);done('7ラウンド完全クリア！ 記憶力マスター！');}else{state.playing=true;later(nextSimon,650);}}}
function initOrder(){state={next:1,start:performance.now()};const order=shuffle([...Array(16)].map((_,i)=>i+1));board('<div class="tiles">'+order.map(n=>'<button class="tile" type="button" data-n="'+n+'">'+n+'</button>').join('')+'</div>');info('1 → 2 → 3… 16まで順番にタップ！');for(const b of $('gameBoard').querySelectorAll('[data-n]'))b.onclick=()=>{const n=Number(b.dataset.n);if(n!==state.next){b.classList.add('error');later(()=>b.classList.remove('error'),280);show('次は'+state.next+'だよ！','bad');return;}b.disabled=true;b.classList.add('found');b.textContent='✓';state.next++;if(state.next===17){const sec=(performance.now()-state.start)/1000;record('order',Number(sec.toFixed(2)),true);done('16個を '+sec.toFixed(1)+' 秒で完了！ 自己ベスト：'+records.order+'秒');}else info('次は「'+state.next+'」を押してね！');};}
function mathQuestion(){
 const a=2+Math.floor(Math.random()*17),b=2+Math.floor(Math.random()*14),op=pick(['+','−','×']),val=op==='+'?a+b:op==='−'?Math.max(a,b)-Math.min(a,b):a*b;
 const expression=op==='−'?Math.max(a,b)+' − '+Math.min(a,b):a+' '+op+' '+b;
 const opts=new Set([val]);for(let i=0;opts.size<4&&i<40;i++){const next=val+pick([-10,-6,-4,-3,-2,-1,1,2,3,4,6,10]);if(next>=0)opts.add(next);}while(opts.size<4)opts.add(val+opts.size);
 return {expression,val,options:shuffle([...opts])};
}
function initMath(){state={num:0,correct:0};mathStep();}
function mathStep(){if(state.num>=10){record('math',state.correct);done('10問中'+state.correct+'問正解！ 最高記録：'+(records.math||0)+'問');return;}
 const q=mathQuestion();state.question=q;info('第'+(state.num+1)+'問 / 10　｜　正解 '+state.correct+'問');board('<div class="expression">'+q.expression+' ＝ ？</div><div class="answerChoices">'+q.options.map((v,i)=>'<button type="button" class="action" data-answer="'+v+'">'+v+'</button>').join('')+'</div>');
 for(const b of $('gameBoard').querySelectorAll('[data-answer]'))b.onclick=()=>{const ok=Number(b.dataset.answer)===q.val;if(ok)state.correct++;state.num++;show(ok?'⭕ 正解！':'正解は'+q.val+'だったよ。',ok?'':'bad');for(const x of $('gameBoard').querySelectorAll('[data-answer]'))x.disabled=true;later(mathStep,500);};
}
const pairs=[['🐱','🐶'],['🍎','🍅'],['⭐','🌟'],['🍀','🌿'],['🚲','🛴'],['🌙','☀️'],['🐸','🐢'],['🍓','🍒'],['🎸','🎻'],['🐼','🐨']];
function initOdd(){state={round:0,hits:0,picks:shuffle(pairs)};oddStep();}
function oddStep(){if(state.round>=10){record('odd',state.hits);done('10問中'+state.hits+'問正解！ 最高記録：'+(records.odd||0)+'問');return;}
 const [major,minor]=state.picks[state.round],index=Math.floor(Math.random()*16);state.answer=index;info('ちがう絵はどれ？　'+(state.round+1)+'/10問');board('<div class="tiles">'+Array.from({length:16},(_,i)=>'<button type="button" data-index="'+i+'" class="tile">'+(i===index?minor:major)+'</button>').join('')+'</div>');
 for(const b of $('gameBoard').querySelectorAll('[data-index]'))b.onclick=()=>{const good=Number(b.dataset.index)===index;if(good)state.hits++;state.round++;show(good?'⭕ 正解！':'おしい！ 正解は右の絵と違うものだよ。',good?'':'bad');for(const x of $('gameBoard').querySelectorAll('[data-index]'))x.disabled=true;later(oddStep,380);};
}
const WORDS=[['りんご','赤くて丸いくだもの'],['あさひ','朝の空にのぼる太陽'],['たから','宝箱の中にある大切なもの'],['さくら','春に咲くピンクの花'],['ひこうき','空を飛ぶ乗り物'],['うさぎ','長い耳の動物'],['すいか','夏に食べる緑の果物'],['くじら','海にいる大きな生き物'],['おにぎり','ごはんを三角に握った食べ物'],['えんぴつ','紙に字を書く道具'],['こいぬ','小さな犬'],['かめら','写真を撮る道具']];
function initWord(){state={questions:shuffle(WORDS).slice(0,10),round:0,correct:0,choice:[],picked:new Set()};wordStep();}
function wordStep(){if(state.round>=state.questions.length){record('word',state.correct);done('10問中'+state.correct+'問完成！ 自己ベスト：'+(records.word||0)+'問');return;}
 const [word,clue]=state.questions[state.round];state.letters=shuffle([...word]);state.choice=[];state.picked=new Set();
 info('第'+(state.round+1)+'問 / 10　｜　ヒント：'+clue);wordRender();}
function wordRender(){
 board('<div class="wordSlots">'+(state.choice.length?state.choice.join('　'):'ここに文字を並べよう')+'</div><div class="toolRow" style="justify-content:center;flex-wrap:wrap">'+state.letters.map((letter,i)=>'<button type="button" class="wordTile" data-letter="'+i+'" '+(state.picked.has(i)?'disabled':'')+'>'+letter+'</button>').join('')+'</div><button id="wordUndo" type="button" class="tool">↶ 1文字戻す</button>');
 for(const b of $('gameBoard').querySelectorAll('[data-letter]'))b.onclick=()=>{const i=Number(b.dataset.letter);if(state.picked.has(i))return;state.picked.add(i);state.choice.push({i,ch:state.letters[i]});wordCheck();};
 $('wordUndo').onclick=()=>{if(state.choice.length){const last=state.choice.pop();state.picked.delete(last.i);wordRender();}};
 // Show only characters, not internal objects.
 $('gameBoard').querySelector('.wordSlots').textContent=state.choice.length?state.choice.map(x=>x.ch).join('　'):'ここに文字を並べよう';
}
function wordCheck(){const [expected]=state.questions[state.round],guess=state.choice.map(x=>x.ch).join('');
 if(guess.length!==expected.length){wordRender();return;}
 if(guess===expected){state.correct++;show('🌟 大正解！ '+expected);state.round++;later(wordStep,600);}
 else{show('おしい！ 1文字ずつ戻して並べ直そう。','bad');wordRender();}
}
function initMerge(){state={cells:Array(16).fill(0),score:0,previous:null};spawn();spawn();drawMerge();}
function spawn(){const free=state.cells.map((v,i)=>v===0?i:-1).filter(i=>i>=0);if(!free.length)return;state.cells[pick(free)]=Math.random()<.9?2:4;}
function slideRow(line){const a=line.filter(v=>v!==0),out=[],merges=[];for(let i=0;i<a.length;i++){if(i+1<a.length&&a[i]===a[i+1]){out.push(a[i]*2);merges.push(a[i]*2);i++;}else out.push(a[i]);}while(out.length<4)out.push(0);return{out,points:merges.reduce((a,b)=>a+b,0)};}
function moveMerge(dir){if(mode!=='merge')return;const before=state.cells.slice(),previousScore=state.score;let gained=0;
 for(let j=0;j<4;j++){const ids=[];for(let i=0;i<4;i++){if(dir==='left')ids.push(j*4+i);else if(dir==='right')ids.push(j*4+(3-i));else if(dir==='up')ids.push(i*4+j);else ids.push((3-i)*4+j);}
 const values=ids.map(i=>state.cells[i]),result=slideRow(values);gained+=result.points;ids.forEach((k,i)=>state.cells[k]=result.out[i]);}
 if(state.cells.every((v,i)=>v===before[i])){show('動かせない方向だよ。');return}
 state.previous={cells:before,score:previousScore};state.score+=gained;spawn();record('merge',Math.max(...state.cells));drawMerge();
 if(state.cells.includes(2048)){done('2048を作れたよ！ おめでとう！');return;}
 const anyMove=state.cells.some(v=>v===0)||[0,1,2,3].some(d=>{const dx=d===0?1:d===1?-1:0,dy=d===2?1:d===3?-1:0;for(let y=0;y<4;y++)for(let x=0;x<4;x++){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<4&&ny>=0&&ny<4&&state.cells[y*4+x]===state.cells[ny*4+nx])return true}return false});
 if(!anyMove)done('盤面がいっぱい！ 最高タイル：'+Math.max(...state.cells)+'。もう一度挑戦しよう！');
}
function drawMerge(){
 info('得点：'+state.score+'　｜　最高タイル：'+Math.max(...state.cells)+'　｜　自己ベスト：'+(records.merge||0));
 board('<div class="mergeGrid">'+state.cells.map(v=>'<div class="mergeCell" data-v="'+v+'">'+(v||'')+'</div>').join('')+'</div><div class="dpad"><div></div><button type="button" data-dir="up" aria-label="上へ">▲</button><div></div><button type="button" data-dir="left" aria-label="左へ">◀</button><button type="button" data-dir="down" aria-label="下へ">▼</button><button type="button" data-dir="right" aria-label="右へ">▶</button></div><button id="mergeUndo" type="button" class="tool">↶ 1手戻す</button>');
 for(const b of $('gameBoard').querySelectorAll('[data-dir]'))b.onclick=()=>moveMerge(b.dataset.dir);
 $('mergeUndo').disabled=!state.previous;
 $('mergeUndo').onclick=()=>{if(!state.previous)return;state.cells=state.previous.cells;state.score=state.previous.score;state.previous=null;drawMerge();};
}
document.addEventListener('keydown',e=>{if(mode!=='merge'||['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;const d={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[e.key];if(d){e.preventDefault();moveMerge(d);}});
let swipe=null;$('gameBoard').addEventListener('touchstart',e=>{if(mode!=='merge')return;const t=e.touches[0];swipe={x:t.clientX,y:t.clientY}},{passive:true});
$('gameBoard').addEventListener('touchend',e=>{if(mode!=='merge'||!swipe)return;const t=e.changedTouches[0],dx=t.clientX-swipe.x,dy=t.clientY-swipe.y;swipe=null;if(Math.max(Math.abs(dx),Math.abs(dy))<25)return;moveMerge(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));},{passive:true});

/* じゃんけんバトル: 10 rounds vs fair random CPU */
const RPS=[['✊','グー'],['✌️','チョキ'],['✋','パー']];
function initRps(){state={round:0,win:0,draw:0,lose:0,result:null};drawRps();}
function drawRps(){
 const s=state;
 info('第'+Math.min(s.round+1,10)+' / 10回戦　｜　勝ち '+s.win+'　あいこ '+s.draw+'　負け '+s.lose+'　｜　最高記録 '+(records.rps||0)+'勝');
 const result=s.result?'<div class="rpsDuel"><div class="rpsFighter"><span>あなた</span><strong>'+RPS[s.result.user][0]+'</strong></div><span class="rpsVs">VS</span><div class="rpsFighter"><span>サイ校キャラ</span><strong>'+RPS[s.result.cpu][0]+'</strong></div></div><div class="rpsResult">'+s.result.message+'</div>':'<div class="rpsIntro"><span>🎮</span><strong>じゃーんけーん…</strong><p>サイ校キャラと真剣勝負！</p></div>';
 board(result);
 if(s.result){
  board(result+'<button id="rpsNext" type="button" class="action good">'+(s.round>=10?'結果を見る 🏆':'次の勝負へ ▶')+'</button>');
  $('rpsNext').onclick=()=>{if(s.round>=10){record('rps',s.win);done('10回中'+s.win+'勝！　あいこ'+s.draw+'回　負け'+s.lose+'回。最高記録 '+(records.rps||0)+'勝');return}s.result=null;drawRps();};
 }else{
  board(result+'<div class="rpsChoices">'+RPS.map(([emoji,label],i)=>'<button type="button" class="rpsHand" data-hand="'+i+'" aria-label="'+label+'を出す"><span>'+emoji+'</span><strong>'+label+'</strong></button>').join('')+'</div>');
  for(const b of $('gameBoard').querySelectorAll('[data-hand]'))b.onclick=()=>throwRps(Number(b.dataset.hand));
 }
}
function throwRps(hand){
 if(mode!=='rps'||state.result||hand<0||hand>2)return;
 const cpu=Math.floor(Math.random()*3),diff=(hand-cpu+3)%3;
 // 0=グー、1=チョキ、2=パー
 const win=diff===2,draw=diff===0;state.round++;
 if(win)state.win++;else if(draw)state.draw++;else state.lose++;
 state.result={user:hand,cpu,message:draw?'🤝 あいこ！':win?'🌟 あなたの勝ち！':'😆 サイ校キャラの勝ち！'};
 show(state.result.message,win||draw?'':'bad');drawRps();
}
/* スライドパズル: every layout is guaranteed solvable because it is scrambled via legal moves */
function slideNeighbours(empty,n){
 const y=Math.floor(empty/n),x=empty%n,positions=[];
 if(x>0)positions.push(empty-1);if(x<n-1)positions.push(empty+1);
 if(y>0)positions.push(empty-n);if(y<n-1)positions.push(empty+n);
 return positions;
}
function initSlide(size=3){
 const n=size===4?4:3,cells=Array.from({length:n*n},(_,i)=>(i+1)%(n*n));
 let empty=cells.indexOf(0),previous=-1;
 const steps=n===3?70:140;
 for(let step=0;step<steps;step++){
  let choices=slideNeighbours(empty,n).filter(x=>x!==previous);
  if(!choices.length)choices=slideNeighbours(empty,n);
  const index=pick(choices);
  [cells[empty],cells[index]]=[cells[index],cells[empty]];
  previous=empty;empty=index;
 }
 // Avoid presenting an already solved puzzle.
 if(cells.every((value,i)=>value===(i+1)%(n*n)))return initSlide(n);
 state={n,cells,moves:0,started:Date.now(),last:null};drawSlide();
}
function drawSlide(){
 const s=state,n=s.n,empty=s.cells.indexOf(0);
 const available=new Set(slideNeighbours(empty,n));
 info('🧩 '+n+'×'+n+' スライドパズル　｜　移動 '+s.moves+' 回　｜　'+(records['slide'+n]?'最高記録 '+records['slide'+n]+'回':'初クリアを目指そう！'));
 board('<div class="slideBoard" style="--n:'+n+'">'+s.cells.map((val,i)=>'<button type="button" class="slideTile'+(val===0?' empty':'')+(available.has(i)?' movable':'')+'" data-slide="'+i+'" '+(!val||!available.has(i)?'disabled':'')+' aria-label="'+(val?val+'を空きマスへ移動':'空きマス')+'">'+(val||'')+'</button>').join('')+'</div><p class="slideHelp">光っている数字をタップして空白に移動。左上から1,2,3…と並べてみよう！</p><div class="toolRow" style="justify-content:center"><button class="tool" id="slideHint">💡 動かせる数字</button><button class="tool" id="slideUndo" '+(s.last?'':'disabled')+'>↶ 1手戻す</button></div><div class="toolRow" style="justify-content:center"><button class="tool" id="size3">🌱 3×3</button><button class="tool" id="size4">👑 4×4</button></div>');
 for(const b of $('gameBoard').querySelectorAll('[data-slide]'))b.onclick=()=>slideMove(Number(b.dataset.slide));
 $('slideHint').onclick=()=>show('動かせる数字：'+[...available].map(i=>s.cells[i]).join('・')+'。近くの数字をタップしよう！');
 $('slideUndo').onclick=()=>{if(!s.last)return;s.cells=s.last;s.last=null;s.moves=Math.max(0,s.moves-1);drawSlide()};
 $('size3').onclick=()=>initSlide(3);$('size4').onclick=()=>initSlide(4);
}
function slideMove(index){
 if(mode!=='slide'||!state||!Number.isInteger(index))return;
 const s=state,n=s.n,empty=s.cells.indexOf(0);
 if(!slideNeighbours(empty,n).includes(index))return;
 s.last=s.cells.slice();
 [s.cells[empty],s.cells[index]]=[s.cells[index],s.cells[empty]];
 s.moves++;
 if(s.cells.every((v,i)=>v===(i+1)%(n*n))){
  record('slide'+n,s.moves,true);
  done(n+'×'+n+'を '+s.moves+'手で完成！ ベスト：'+records['slide'+n]+'手　🎉');
 }else drawSlide();
}

})();