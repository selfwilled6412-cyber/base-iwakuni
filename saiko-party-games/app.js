(()=>{'use strict';
const $=id=>document.getElementById(id),shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const GESTURES=["野球","サッカー","バスケットボール","テニス","ゴルフ","卓球","水泳","ボクシング","相撲","柔道","弓道","縄跳び","ダンス","スキー","スケート","釣り","パンをこねる","ラーメンをすする","アイスを食べる","歯磨き","洗顔","お風呂","掃除機","雑巾がけ","洗濯物を干す","服を着る","靴を履く","傘をさす","自転車","バイク","車の運転","電車の車掌","飛行機のパイロット","ロケット発射","宇宙遊泳","花火","風船","犬の散歩","猫の毛づくろい","ゴリラ","ペンギン","カエル","うさぎ","ヘビ","ワニ","象","キリン","ライオン","サル","魚","鳥が飛ぶ","ニワトリ","カメ","恐竜","幽霊","魔法使い","忍者","侍","ロボット","人魚","赤ちゃん","おじいちゃん","学校の先生","指揮者","ピアノ","ギター","ドラム","カメラマン","お医者さん","消防士","警察官","美容師","アイドル","映画監督","店員さん","荷物を運ぶ","宝箱を開ける","雪だるまを作る","ドアをノック","ケーキのろうそくを消す"],CLUES=[["りんご","果物","木になる","赤い丸い実"],["うさぎ","動物","ぴょんぴょん跳ぶ","耳が長い"],["電車","乗り物","線路の上を走る","駅に停まる"],["太陽","天体","光を出す","朝に東から昇る"],["月","天体","夜に見える","満月や三日月"],["雪","自然","冬に多い","白い結晶"],["カメラ","道具","思い出を残す","写真を撮る"],["時計","道具","針があるものも","時刻を知らせる"],["傘","持ち物","折りたたみ式も","雨の日"],["ピアノ","楽器","鍵盤","白と黒の鍵"],["ギター","楽器","弦がある","指で弾く"],["太鼓","楽器","リズムを刻む","叩いて鳴らす"],["さくら","植物","春に咲く","ピンクの花"],["ひまわり","植物","夏に咲く","大きな黄色い花"],["竹","植物","まっすぐ伸びる","パンダが好む"],["パンダ","動物","竹が好き","白と黒"],["ペンギン","鳥","泳ぎが得意","よちよち歩き"],["イルカ","動物","海で暮らす","ジャンプする哺乳類"],["ゾウ","動物","大きな体","長い鼻"],["キリン","動物","草を食べる","首が長い"],["カエル","生き物","水辺にいる","ケロケロ鳴く"],["パン","食べ物","小麦粉","トースト"],["おにぎり","食べ物","海苔","ごはんを握る"],["カレー","食べ物","香辛料","ご飯にかける"],["プリン","おやつ","卵や牛乳","カラメルソース"],["かき氷","おやつ","夏の定番","氷を削る"],["たい焼き","おやつ","中にあんこ","魚の形"],["スイカ","果物","夏に食べる","緑の皮"],["バナナ","果物","皮をむく","黄色く細長い"],["いちご","果物","ケーキにのる","小さな赤い実"],["図書館","施設","静かな場所","本を借りる"],["学校","施設","教室がある","先生と生徒"],["病院","施設","医師がいる","診察と治療"],["公園","場所","遊具がある","散歩や遊び"],["水族館","施設","水槽がある","魚を見る"],["動物園","施設","動物がたくさん","ライオンやゾウ"],["消しゴム","文房具","小さな四角","鉛筆の字を消す"],["鉛筆","文房具","木の軸","芯で字を書く"],["定規","文房具","目盛り","直線を引く"],["冷蔵庫","家電","台所","食品を冷やす"],["洗濯機","家電","水を使う","衣類を洗う"],["掃除機","家電","床に使う","ほこりを吸う"],["信号機","道路","色で知らせる","赤青黄"],["横断歩道","道路","人が通る","白いしま模様"],["自転車","乗り物","車輪が2つ","ペダルをこぐ"],["宝箱","物語","鍵で開ける","宝物が入る"],["鍵","道具","金属のものが多い","錠前を開ける"],["地図","情報","場所が分かる","道順を調べる"],["虹","自然","空に現れる","色の帯"],["星","天体","夜に見える","星座をつくる"]],FACTS=[["1週間は7日",true,"これは正しい説明だよ。"],["1時間は100分",false,"これは正しくないよ。"],["1分は60秒",true,"これは正しい説明だよ。"],["三角形の辺は3本",true,"これは正しい説明だよ。"],["四角形の角は5つ",false,"これは正しくないよ。"],["虹は白1色",false,"これは正しくないよ。"],["日本には500円硬貨がある",true,"これは正しい説明だよ。"],["四季は春夏秋冬",true,"これは正しい説明だよ。"],["キリンの首は短い",false,"これは正しくないよ。"],["魚は水中で暮らす",true,"これは正しい説明だよ。"],["ペンギンは飛べる",false,"これは正しくないよ。"],["タコの腕は8本",true,"これは正しい説明だよ。"],["クモの脚は6本",false,"これは正しくないよ。"],["普通のサイコロは6面",true,"これは正しい説明だよ。"],["夏の次は冬",false,"これは正しくないよ。"],["「あ」は母音の一つ",true,"これは正しい説明だよ。"],["地球はほぼ球体",true,"これは正しい説明だよ。"],["地球の周りを太陽が毎日一周する",false,"これは正しくないよ。"],["カメは哺乳類",false,"これは正しくないよ。"],["イルカは哺乳類",true,"これは正しい説明だよ。"],["水分子には酸素原子が含まれる",true,"これは正しい説明だよ。"],["1ダースは12個",true,"これは正しい説明だよ。"],["10円玉は紙幣",false,"これは正しくないよ。"],["正方形の辺は4本とも等しい",true,"これは正しい説明だよ。"],["1日は24時間",true,"これは正しい説明だよ。"],["4＋2＝6",true,"正しくは6だよ。"],["5＋3＝9",false,"正しくは8だよ。"],["6＋4＝10",true,"正しくは10だよ。"],["7＋5＝13",false,"正しくは12だよ。"],["8＋6＝14",true,"正しくは14だよ。"],["9＋7＝17",false,"正しくは16だよ。"],["10＋8＝18",true,"正しくは18だよ。"],["11＋9＝21",false,"正しくは20だよ。"],["12＋2＝14",true,"正しくは14だよ。"],["13＋3＝17",false,"正しくは16だよ。"],["14＋4＝18",true,"正しくは18だよ。"],["15＋5＝21",false,"正しくは20だよ。"],["16＋6＝22",true,"正しくは22だよ。"],["17＋7＝25",false,"正しくは24だよ。"],["18＋8＝26",true,"正しくは26だよ。"],["19＋9＝29",false,"正しくは28だよ。"],["20＋2＝22",true,"正しくは22だよ。"],["21＋3＝25",false,"正しくは24だよ。"],["22＋4＝26",true,"正しくは26だよ。"],["23＋5＝29",false,"正しくは28だよ。"],["24＋6＝30",true,"正しくは30だよ。"],["25＋7＝33",false,"正しくは32だよ。"],["26＋8＝34",true,"正しくは34だよ。"],["27＋9＝37",false,"正しくは36だよ。"],["28＋2＝30",true,"正しくは30だよ。"]];

const FUNNY_CLUES=[["月曜日の朝","毎週やってくる","休日のあとに現れる","布団が急に強力な磁石になる","布団「まだ行かせない」"],["充電残り1％","スマホの危機","赤い数字が表示される","外出先で電池がほぼ切れる","スマホ「ここまでが私の命」"],["エアコンのリモコン","家の中にある","夏と冬に大活躍","必要なときだけソファの下に消える","リモコン「探してみな」"],["靴下の片方","洗濯物の一員","2つで1組","なぜか洗うと片方だけ失踪する","靴下界の未解決事件"],["おかわり","食事で起こる","まだ食べられるとき","おいしくてもう一杯ほしくなる","満腹とは何だったのか"],["二度寝","朝に起こる","一度目は起きる","目覚ましを止めてもう一回寝る","5分のつもりが30分"],["寝ぐせ","頭に現れる","朝、鏡で発見する","髪の毛が勝手に芸術作品になる","美容師さんも困惑"],["冷蔵庫の開け直し","キッチンで起きる","何も新しい物は増えていない","さっき閉めたのにもう一度中を見る","希望だけが冷えている"],["スマホの画面割れ","手に持つ道具の事故","落とすと起きやすい","画面に蜘蛛の巣のような線が入る","修理代が一番怖い"],["テスト前の掃除","勉強するはずの時間","なぜか部屋が気になってくる","机の片付けだけが異常にはかどる","掃除の才能が覚醒"],["行列の先頭","人気店などで見かける","一番早く到着した人","ずっと待って最初に入れる場所","後ろからの圧がすごい"],["自動ドア","入口にある","近づくと反応する","手を触れずに勝手に開く","たまに開かず気まずい"],["ポケットのティッシュ","身に付けた物","洗濯前に確認したい","洗濯機で紙吹雪に変身する","服が白い雪国に"],["ゲームのセーブ忘れ","遊びに関係する","長く進めたあとが危険","保存せず電源を切って進行が消える","心のHPがゼロ"],["テレビの音量","家で調整する","数字で大きさを変える","小さすぎたので1上げたら急に大音量","1の差がデカすぎ"],["ラーメンの汁はね","食べるときに起きる","白い服の日に限って","麺をすすると服に点が付く","服が味見している"],["コンビニのレジ袋","買い物の道具","袋を開ける動作","指が乾いているとなぜか開かない","袋との真剣勝負"],["カラオケの十八番","歌う場所に関係","得意な曲を持っている","マイクを持った途端に自信が出る1曲","その曲だけプロ"],["返信を忘れたLINE","スマホの会話","あとで返そうと思う","既読のまま数日が経つ","時空のゆがみ発生"],["きゅうりの一本漬け","食べ物","夏祭りでも見かける","緑の野菜をまるごと漬けてかじる","見た目は小さな剣"],["最後の一個のお菓子","おやつの話","みんなで分けるとき","袋に一つだけ残り誰も手を出さない","遠慮という名の心理戦"],["写真の半目","カメラで起きる","シャッターの瞬間","集合写真で自分だけ目を閉じている","伝説の変顔完成"],["寝る前の動画","スマホで見る","一本だけのつもり","気づけば関連動画を次々見ている","朝「誰のせいだ」"],["お風呂の温度調整","お湯の話","ちょうどいい温度を狙う","少し回しただけで熱すぎたり冷たすぎたり","温度の天才になれない"],["ゴミ箱への遠投","家でもできる","紙くずを丸める","椅子から立たずにゴミ箱へ投げ入れる","外れたら自分で拾う"],["お腹の音","体から出る","静かな部屋で","空腹のときにぐ〜っと鳴ってしまう","自己紹介より大きい"],["おつりの小銭","買い物で受け取る","財布が重くなる","財布の中に1円玉が大量に増える","財布が筋トレ"],["くしゃみ寸前","体の反応","鼻がむずむずする","出そうで出ないまま変な顔になる","顔だけ完成した"],["忘れた傘","雨の日の道具","店や電車で","置いた場所にそのまま置き去り","傘の単独旅行"],["冷たい枕の裏側","寝るときに発見","表側が温かくなる","枕をひっくり返すと一瞬だけ幸せ","世界で最小の天国"],["リモコンの電池切れ","家電で起きる","ボタンが効かなくなる","角度を変えて何度も押す","リモコン「電池ちょうだい」"],["お弁当の片寄り","持ち運ぶ食事","カバンの中で揺れる","開けるとおかずが一か所に集まっている","おかず同士が仲良し"],["朝のアラーム5個","スマホに設定","起きられるか心配","5分おきに次々鳴る","目覚まし楽団"],["ボールペンの試し書き","文房具","インクが出ないとき","紙にぐるぐる線を書いて確かめる","紙が現代アートに"],["まちがえたエレベーター","建物の移動","ボタンを押す","違う階で降りてまた乗り直す","プチ冒険発生"],["お菓子の開封失敗","おやつの袋","力を入れすぎる","袋が勢いよく破れて中身が飛ぶ","おやつが離陸"],["バスの降車ボタン","乗り物で使う","降りたい停留所の前","押そうとした瞬間に他の人が先に押す","指の出番なし"],["トーストの焦げ","朝ごはん","焼き時間が長すぎる","パンが真っ黒になってしまう","炭ではありません"],["サイコロの1","ゲームの道具","1〜6の数字","あと少しでゴールなのに最小の目が出る","サイコロのツンデレ"],["電車の乗り過ごし","移動中に起こる","ぼんやりしていると","降りる駅を通り過ぎてしまう","旅が勝手に延長"]];
const CHAOS_CLUES=[["空飛ぶたこ焼き","食べ物の話かと思いきや","地面にはいない","羽が生えて空を飛ぶ大阪名物","ソースは空から降るのか"],["宇宙人の職員会議","会議の一種","参加者は地球出身ではない","UFOに乗る宇宙人が真面目に議題を話す","議事録は宇宙語"],["忍者のオンライン授業","学ぶ場面","姿を消す人が参加する","黒装束で画面越しに忍術を勉強する","ミュート中も気配ゼロ"],["冷蔵庫の筋トレ","家電と運動","台所がジムになる","食べ物を冷やす大きな家電がダンベルを持つ","プロテインも冷蔵"],["しゃべる消しゴム","文房具","文字を消すはず","答案を消しながらおしゃべりする","「その答え消していい？」"],["ラーメンでできた城","食べ物で建築","麺がたくさん必要","壁が麺、屋根がチャーシューの巨大なお城","汁が堀"],["パンダの社長","動物と仕事","竹が好きな上司","白黒のクマがスーツで会社を経営する","ボーナスは笹"],["ドラゴンの歯医者","架空の生き物","大きな口が必要","火を吹く竜の虫歯を治療する仕事","先生が先に燃えそう"],["おにぎりの大統領","食べ物と政治","ごはんを握った姿","三角のおにぎりが国のトップになる","政策は海苔増量"],["月でラジオ体操","宇宙の運動","重力が少ない場所","月面でジャンプしながら朝の体操","ジャンプが高すぎ"],["カレー味の歯みがき粉","日用品の味","歯を磨くための物","辛い料理の味がする歯みがき用品","磨いたあとお腹すく"],["雪だるまのサウナ","冬の生き物？","熱い場所が苦手","雪でできた人形が高温の部屋で汗をかく","3秒で消えそう"],["猫が校長先生","動物と学校","ニャーと挨拶","猫が校長室で学校を仕切っている","校則は昼寝必須"],["透明人間のかくれんぼ","遊びの話","姿が見えない","透明になれる人が鬼ごっこで隠れる","反則級の強さ"],["走るプリン","デザートと運動","ぷるぷる揺れる","甘いプリンに足が生えて全力疾走","カラメルがこぼれる"],["ロボットの寝坊","機械と生活","目覚ましが鳴らない","電池満タンの機械が会社に遅刻する","「再起動しました」"],["ゴリラのピアノ発表会","動物と音楽","力強い指が鍵盤へ","ゴリラが蝶ネクタイで演奏を披露","ピアノが心配"],["お寿司の運動会","食べ物と行事","回転することもある","お寿司のネタたちがリレー競争","マグロがアンカー"],["吸血鬼の日焼け止め","怪物と日光","太陽の光が苦手","ドラキュラが日差し対策でクリームを塗る","SPF1000が必要"],["Wi-Fiを探す仙人","山奥の達人","インターネットが必要","長いヒゲの仙人が電波マークを探して歩く","悟りより電波"]];
const KEY='saiko-party-games-v1';let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){}
let mode=null,state=null,timer=null,teams=[0,0];
function persist(){try{localStorage.setItem(KEY,JSON.stringify(saved))}catch(e){}}
function stop(){clearInterval(timer);clearTimeout(timer);timer=null}
function show(t){$('status').textContent=t}function panel(h){$('board').innerHTML=h}
function actions(arr){$('actions').innerHTML=arr.map(([id,v])=>'<button id="a_'+id+'" type="button">'+v+'</button>').join('')}
function scores(){if(mode==='bingo'){$('scores').replaceChildren();return}if(mode==='teamMemory'){$('scores').innerHTML=teams.map((n,i)=>'<div>'+(i?'🔵 青':'🔴 赤')+'チーム '+n+'組</div>').join('');return}$('scores').innerHTML=teams.map((n,i)=>'<div>'+(i?'🔵青':'🔴赤')+' '+n+'点 <button type="button" id="team'+i+'">＋1</button></div>').join('');[0,1].forEach(i=>$('team'+i).onclick=()=>{teams[i]++;scores()})}
function back(){stop();mode=null;state=null;$('home').hidden=false;$('game').hidden=true}
function start(m){stop();mode=m;teams=[0,0];$('game').dataset.mode=m;$('home').hidden=true;$('game').hidden=false;$('title').textContent={bingo:'🎱 ビンゴ大会',gesture:'🎭 ジェスチャー対決',association:'💭 ヒントで連想大会',ox:'⭕❌ ○×クイズ大会',teamMemory:'🃏 チーム神経衰弱'}[m];$('printCards').replaceChildren();scores();if(m==='teamMemory')startTeamMemory();else if(m==='bingo')bingo();else if(m==='gesture'){state={items:shuffle(GESTURES),pos:0,phase:0,seconds:60};gestureShow()}else if(m==='association'){beginAssociation('all')}else{state={items:shuffle(FACTS),pos:0,answer:false};oxShow()}}
document.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>start(b.dataset.game));$('back').onclick=back;$('restart').onclick=()=>{if(!mode||!confirm('最初からやり直す？'))return;if(mode==='bingo'){delete saved.bingo;persist()}start(mode)};
$('full').onclick=()=>document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.().catch(()=>{});
function bingo(){let d=saved.bingo;state=d&&Array.isArray(d.numbers)&&d.numbers.length===75&&new Set(d.numbers).size===75&&d.pos>=0&&d.pos<=75?d:{numbers:shuffle(Array.from({length:75},(_,i)=>i+1)),pos:0};saved.bingo=state;persist();bingoShow()}
function bingoName(n){return 'BINGO'[Math.floor((n-1)/15)]+'-'+n}
function card(){
 const cols=Array.from({length:5},(_,k)=>shuffle(Array.from({length:15},(_,i)=>k*15+i+1)).slice(0,5));
 const nums=Array.from({length:5},(_,r)=>Array.from({length:5},(_,c)=>r===2&&c===2?'FREE':cols[c][r]));
 return '<div class="cardPrint"><h3>サイ校 ビンゴ</h3><div class="bingo">'+[...'BINGO'].map(x=>'<div class="head">'+x+'</div>').join('')+nums.flat().map(n=>'<div>'+n+'</div>').join('')+'</div></div>';
}
function bingoShow(){let previous=state.numbers.slice(0,state.pos).reverse();show(state.pos+' / 75 出た数字は重複しないよ');panel('<div class="big">'+(previous.length?bingoName(previous[0]):'START')+'</div><div class="history">'+previous.slice(0,20).map(n=>'<span>'+bingoName(n)+'</span>').join('')+'</div>');actions([['draw','🎲 次の数字'],['undo','↶ 1つ戻す'],['print','🖨 ビンゴカードを4枚印刷']]);$('a_draw').disabled=state.pos>=75;$('a_undo').disabled=state.pos===0;$('a_draw').onclick=()=>{if(state.pos<75){state.pos++;persist();bingoShow()}};$('a_undo').onclick=()=>{if(state.pos){state.pos--;persist();bingoShow()}};$('a_print').onclick=()=>{$('printCards').innerHTML=Array.from({length:4},card).join('');window.print()}}
function gestureShow(){if(state.pos>=state.items.length){show('80問完走！');panel('<div class="answer">おめでとう！</div>');actions([['next','最初から']]);$('a_next').onclick=()=>start('gesture');return}
 const word=state.items[state.pos];show((state.pos+1)+' / 80 問　お題を見る人以外は目を閉じてね');
 panel(state.phase===0?'<div class="prompt">🙈 ほかの人は目を閉じてね</div>':state.phase===1?'<div class="prompt">'+word+'</div>':state.phase===2?'<div class="big" id="seconds">'+state.seconds+'秒</div>':'<div class="answer">'+word+'</div>');
 if(state.phase===0){actions([['peek','👀 お題を5秒表示']]);$('a_peek').onclick=()=>{state.phase=1;gestureShow();timer=setTimeout(()=>{if(mode==='gesture'&&state.phase===1){state.phase=2;gestureShow();countdown()}},5000)}}
 else if(state.phase===1){actions([['hide','🙈 お題を隠す']]);$('a_hide').onclick=()=>{stop();state.phase=2;gestureShow();countdown()}}
 else if(state.phase===2){actions([['reveal','✅ 正解発表'],['skip','⏭ スキップ']]);$('a_reveal').onclick=()=>{stop();state.phase=3;gestureShow()};$('a_skip').onclick=()=>{stop();state.pos++;state.phase=0;gestureShow()}}
 else {actions([['next','➡ 次のお題']]);$('a_next').onclick=()=>{state.pos++;state.phase=0;gestureShow()}}
}
function countdown(){stop();timer=setInterval(()=>{if(mode!=='gesture'||state.phase!==2){stop();return}state.seconds--;if(state.seconds<=0){stop();state.phase=3;gestureShow()}else if($('seconds'))$('seconds').textContent=state.seconds+'秒'},1000)}
function beginAssociation(kind='all'){
 const pools={all:[...CLUES,...FUNNY_CLUES,...CHAOS_CLUES],normal:CLUES,funny:FUNNY_CLUES,chaos:CHAOS_CLUES};
 const pool=pools[kind]||pools.all;
 state={items:shuffle(pool),pos:0,hint:0,answer:false,category:kind};
 clueShow();
}
const ASSOC_MODES=[['all','🎲 ごちゃまぜ'],['funny','😂 爆笑'],['chaos','🌀 カオス'],['normal','🌱 ふつう']];
function assocOptions(){
 return '<div class="assocModes" role="group" aria-label="連想ゲームのお題ジャンル">'+ASSOC_MODES.map(([key,label])=>'<button type="button" class="assocMode'+(state.category===key?' active':'')+'" data-assoc="'+key+'" aria-pressed="'+(state.category===key)+'">'+label+'</button>').join('')+'</div>';
}
function wireAssocOptions(){
 for(const b of $('board').querySelectorAll('[data-assoc]'))b.onclick=()=>{
  const next=b.dataset.assoc;
  if(next===state.category)return;
  if(state.pos>0&&!confirm('お題を新しくシャッフルして最初から始める？'))return;
  beginAssociation(next);
 };
}
function clueShow(){
 const categoryName={all:'🎲 ごちゃまぜ',funny:'😂 爆笑',chaos:'🌀 カオス',normal:'🌱 ふつう'}[state.category];
 const total=state.items.length;
 if(state.pos>=total){
  show('🎉 '+total+'問コンプリート！ '+categoryName);
  panel(assocOptions()+'<div class="answer">✨ ぜんぶクリア！ おめでとう！</div>');
  actions([['next','🔄 もう一度シャッフル']]);
  $('a_next').onclick=()=>beginAssociation(state.category);
  wireAssocOptions();return;
 }
 const q=state.items[state.pos],isFunny=FUNNY_CLUES.includes(q),isChaos=CHAOS_CLUES.includes(q);
 const type=isChaos?'🌀 カオス':isFunny?'😂 爆笑':'🌱 ふつう';
 show('第'+(state.pos+1)+' / '+total+'問　｜　'+categoryName+'　｜　今回：'+type);
 const hintCards=q.slice(1,1+state.hint).map((h,i)=>'<div class="hint assocHint" style="--hint-step:'+i+'"><span class="hintNum">HINT '+(i+1)+'</span>'+h+'</div>').join('');
 const reveal=state.answer?'<div class="assocReveal" role="status"><div class="revealLabel">🎉 正解はこちら！</div><div class="answer assocAnswer">'+q[0]+'</div>'+(q[4]?'<div class="punchline">💬 '+q[4]+'</div>':'')+'</div>':'';
 panel(assocOptions()+'<div class="assocStage"><div class="assocTopic">'+(isChaos?'🤯':'💭')+' これ、な〜んだ？</div><div class="assocHints">'+(hintCards||'<div class="assocWaiting">ヒントを出してみよう！<span>✨ 💫 ✨</span></div>')+'</div>'+reveal+'</div>');
 actions(state.answer?[['next','➡ 次の問題']]:state.hint>=3?[['reveal','🎉 正解を発表']]:[['hint','💡 ヒントを公開'],['reveal','🎉 正解を発表']]);
 if($('a_hint'))$('a_hint').onclick=()=>{state.hint++;clueShow()};
 if($('a_reveal'))$('a_reveal').onclick=()=>{state.answer=true;clueShow()};
 if($('a_next'))$('a_next').onclick=()=>{state.pos++;state.hint=0;state.answer=false;clueShow()};
 wireAssocOptions();
}
function oxShow(){if(state.pos>=50){show('50問完走！');panel('<div class="answer">おめでとう！</div>');actions([['next','最初から']]);$('a_next').onclick=()=>start('ox');return}
 const [q,correct,explanation]=state.items[state.pos];show('第'+(state.pos+1)+'/50問　○か×で答えよう');
 panel('<div class="prompt">'+q+'</div>'+(state.answer?'<div class="answer">'+(correct?'⭕ 正しい':'❌ まちがい')+'</div><div class="hint">'+explanation+'</div>':'<div class="hint">みんなで○か×か考えよう</div>'));
 actions(state.answer?[['next','➡ 次の問題']]:[['reveal','🎉 正解を発表']]);if($('a_reveal'))$('a_reveal').onclick=()=>{state.answer=true;oxShow()};if($('a_next'))$('a_next').onclick=()=>{state.pos++;state.answer=false;oxShow()}
}

/* みんなで神経衰弱・2チーム対戦 */
const MEMORY_ICONS=['🍎','🌈','🐱','🐼','⭐','🎸','🚀','💎','🎂','🍀','🐬','👑','⚽','🌷','🎮','🍮'];
function startTeamMemory(){
 const values=shuffle(MEMORY_ICONS).slice(0,6);
 state={faces:shuffle(values.flatMap(v=>[v,v])),flipped:[],matched:new Set(),turn:0,locked:false,round:0,completed:false};
 teams=[0,0];scores();show('🔴 赤チームの番！ 2枚めくってペアを探そう。');teamMemoryShow();
}
function teamMemoryShow(){
 const s=state;
 panel('<div class="teamMemoryBoard">'+s.faces.map((v,i)=>{
  const open=s.flipped.includes(i)||s.matched.has(i),matched=s.matched.has(i);
  return '<button type="button" class="memTile" data-mem="'+i+'" '+(s.locked||matched||s.completed?'disabled':'')+' aria-label="カード '+(i+1)+(open?'：'+v+' 表向き':'：裏向き')+'"><span class="face'+(open?' open':'')+(matched?' matched':'')+'">'+(open?v:'')+'</span></button>';
 }).join('')+'</div>');
 for(const b of $('board').querySelectorAll('[data-mem]'))b.onclick=()=>tapTeamMemory(Number(b.dataset.mem));
 if(s.completed){const winner=teams[0]===teams[1]?'引き分け！':teams[0]>teams[1]?'🔴 赤チームの勝ち！':'🔵 青チームの勝ち！';
 show('🎉 全6ペア完成！ '+winner+'　赤'+teams[0]+'組・青'+teams[1]+'組');
 actions([['again','✨ もう一度対戦する']]);$('a_again').onclick=startTeamMemory;
 }else{
  actions([['new','↻ カードを最初から並べ直す']]);$('a_new').onclick=()=>{if(confirm('カードを新しく並べ直す？'))startTeamMemory()};
 }
}
function tapTeamMemory(i){
 const s=state;if(mode!=='teamMemory'||s.completed||s.locked||s.flipped.includes(i)||s.matched.has(i)||!s.faces[i])return;
 s.flipped.push(i);
 if(s.flipped.length===2){
  s.round++;
  const[a,b]=s.flipped;
  if(s.faces[a]===s.faces[b]){
   s.matched.add(a);s.matched.add(b);s.flipped=[];
   teams[s.turn]++;scores();
   if(s.matched.size===s.faces.length){s.completed=true;teamMemoryShow();return}
   show('🌟 ペア成立！ '+(s.turn?'🔵 青':'🔴 赤')+'チームに1点！ もう1回どうぞ。');
  }else{
   s.locked=true;
   show('おしい！ カードの位置を覚えよう。次は'+(s.turn?'🔴 赤':'🔵 青')+'チーム！');
   timer=setTimeout(()=>{if(mode!=='teamMemory'||state!==s)return;s.flipped=[];s.locked=false;s.turn=1-s.turn;show((s.turn?'🔵 青':'🔴 赤')+'チームの番！');teamMemoryShow()},1200);
  }
 }
 teamMemoryShow();
}

})();