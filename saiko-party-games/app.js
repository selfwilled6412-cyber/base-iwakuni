(()=>{'use strict';
const $=id=>document.getElementById(id),shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const GESTURES=["野球","サッカー","バスケットボール","テニス","ゴルフ","卓球","水泳","ボクシング","相撲","柔道","弓道","縄跳び","ダンス","スキー","スケート","釣り","パンをこねる","ラーメンをすする","アイスを食べる","歯磨き","洗顔","お風呂","掃除機","雑巾がけ","洗濯物を干す","服を着る","靴を履く","傘をさす","自転車","バイク","車の運転","電車の車掌","飛行機のパイロット","ロケット発射","宇宙遊泳","花火","風船","犬の散歩","猫の毛づくろい","ゴリラ","ペンギン","カエル","うさぎ","ヘビ","ワニ","象","キリン","ライオン","サル","魚","鳥が飛ぶ","ニワトリ","カメ","恐竜","幽霊","魔法使い","忍者","侍","ロボット","人魚","赤ちゃん","おじいちゃん","学校の先生","指揮者","ピアノ","ギター","ドラム","カメラマン","お医者さん","消防士","警察官","美容師","アイドル","映画監督","店員さん","荷物を運ぶ","宝箱を開ける","雪だるまを作る","ドアをノック","ケーキのろうそくを消す"],CLUES=[["りんご","果物","木になる","赤い丸い実"],["うさぎ","動物","ぴょんぴょん跳ぶ","耳が長い"],["電車","乗り物","線路の上を走る","駅に停まる"],["太陽","天体","光を出す","朝に東から昇る"],["月","天体","夜に見える","満月や三日月"],["雪","自然","冬に多い","白い結晶"],["カメラ","道具","思い出を残す","写真を撮る"],["時計","道具","針があるものも","時刻を知らせる"],["傘","持ち物","折りたたみ式も","雨の日"],["ピアノ","楽器","鍵盤","白と黒の鍵"],["ギター","楽器","弦がある","指で弾く"],["太鼓","楽器","リズムを刻む","叩いて鳴らす"],["さくら","植物","春に咲く","ピンクの花"],["ひまわり","植物","夏に咲く","大きな黄色い花"],["竹","植物","まっすぐ伸びる","パンダが好む"],["パンダ","動物","竹が好き","白と黒"],["ペンギン","鳥","泳ぎが得意","よちよち歩き"],["イルカ","動物","海で暮らす","ジャンプする哺乳類"],["ゾウ","動物","大きな体","長い鼻"],["キリン","動物","草を食べる","首が長い"],["カエル","生き物","水辺にいる","ケロケロ鳴く"],["パン","食べ物","小麦粉","トースト"],["おにぎり","食べ物","海苔","ごはんを握る"],["カレー","食べ物","香辛料","ご飯にかける"],["プリン","おやつ","卵や牛乳","カラメルソース"],["かき氷","おやつ","夏の定番","氷を削る"],["たい焼き","おやつ","中にあんこ","魚の形"],["スイカ","果物","夏に食べる","緑の皮"],["バナナ","果物","皮をむく","黄色く細長い"],["いちご","果物","ケーキにのる","小さな赤い実"],["図書館","施設","静かな場所","本を借りる"],["学校","施設","教室がある","先生と生徒"],["病院","施設","医師がいる","診察と治療"],["公園","場所","遊具がある","散歩や遊び"],["水族館","施設","水槽がある","魚を見る"],["動物園","施設","動物がたくさん","ライオンやゾウ"],["消しゴム","文房具","小さな四角","鉛筆の字を消す"],["鉛筆","文房具","木の軸","芯で字を書く"],["定規","文房具","目盛り","直線を引く"],["冷蔵庫","家電","台所","食品を冷やす"],["洗濯機","家電","水を使う","衣類を洗う"],["掃除機","家電","床に使う","ほこりを吸う"],["信号機","道路","色で知らせる","赤青黄"],["横断歩道","道路","人が通る","白いしま模様"],["自転車","乗り物","車輪が2つ","ペダルをこぐ"],["宝箱","物語","鍵で開ける","宝物が入る"],["鍵","道具","金属のものが多い","錠前を開ける"],["地図","情報","場所が分かる","道順を調べる"],["虹","自然","空に現れる","色の帯"],["星","天体","夜に見える","星座をつくる"]],FACTS=[["1週間は7日",true,"これは正しい説明だよ。"],["1時間は100分",false,"これは正しくないよ。"],["1分は60秒",true,"これは正しい説明だよ。"],["三角形の辺は3本",true,"これは正しい説明だよ。"],["四角形の角は5つ",false,"これは正しくないよ。"],["虹は白1色",false,"これは正しくないよ。"],["日本には500円硬貨がある",true,"これは正しい説明だよ。"],["四季は春夏秋冬",true,"これは正しい説明だよ。"],["キリンの首は短い",false,"これは正しくないよ。"],["魚は水中で暮らす",true,"これは正しい説明だよ。"],["ペンギンは飛べる",false,"これは正しくないよ。"],["タコの腕は8本",true,"これは正しい説明だよ。"],["クモの脚は6本",false,"これは正しくないよ。"],["普通のサイコロは6面",true,"これは正しい説明だよ。"],["夏の次は冬",false,"これは正しくないよ。"],["「あ」は母音の一つ",true,"これは正しい説明だよ。"],["地球はほぼ球体",true,"これは正しい説明だよ。"],["地球の周りを太陽が毎日一周する",false,"これは正しくないよ。"],["カメは哺乳類",false,"これは正しくないよ。"],["イルカは哺乳類",true,"これは正しい説明だよ。"],["水分子には酸素原子が含まれる",true,"これは正しい説明だよ。"],["1ダースは12個",true,"これは正しい説明だよ。"],["10円玉は紙幣",false,"これは正しくないよ。"],["正方形の辺は4本とも等しい",true,"これは正しい説明だよ。"],["1日は24時間",true,"これは正しい説明だよ。"],["4＋2＝6",true,"正しくは6だよ。"],["5＋3＝9",false,"正しくは8だよ。"],["6＋4＝10",true,"正しくは10だよ。"],["7＋5＝13",false,"正しくは12だよ。"],["8＋6＝14",true,"正しくは14だよ。"],["9＋7＝17",false,"正しくは16だよ。"],["10＋8＝18",true,"正しくは18だよ。"],["11＋9＝21",false,"正しくは20だよ。"],["12＋2＝14",true,"正しくは14だよ。"],["13＋3＝17",false,"正しくは16だよ。"],["14＋4＝18",true,"正しくは18だよ。"],["15＋5＝21",false,"正しくは20だよ。"],["16＋6＝22",true,"正しくは22だよ。"],["17＋7＝25",false,"正しくは24だよ。"],["18＋8＝26",true,"正しくは26だよ。"],["19＋9＝29",false,"正しくは28だよ。"],["20＋2＝22",true,"正しくは22だよ。"],["21＋3＝25",false,"正しくは24だよ。"],["22＋4＝26",true,"正しくは26だよ。"],["23＋5＝29",false,"正しくは28だよ。"],["24＋6＝30",true,"正しくは30だよ。"],["25＋7＝33",false,"正しくは32だよ。"],["26＋8＝34",true,"正しくは34だよ。"],["27＋9＝37",false,"正しくは36だよ。"],["28＋2＝30",true,"正しくは30だよ。"]];

const FUNNY_CLUES=[["月曜日の朝","毎週やってくる","休日のあとに現れる","布団が急に強力な磁石になる","布団「まだ行かせない」"],["充電残り1％","スマホの危機","赤い数字が表示される","外出先で電池がほぼ切れる","スマホ「ここまでが私の命」"],["エアコンのリモコン","家の中にある","夏と冬に大活躍","必要なときだけソファの下に消える","リモコン「探してみな」"],["靴下の片方","洗濯物の一員","2つで1組","なぜか洗うと片方だけ失踪する","靴下界の未解決事件"],["おかわり","食事で起こる","まだ食べられるとき","おいしくてもう一杯ほしくなる","満腹とは何だったのか"],["二度寝","朝に起こる","一度目は起きる","目覚ましを止めてもう一回寝る","5分のつもりが30分"],["寝ぐせ","頭に現れる","朝、鏡で発見する","髪の毛が勝手に芸術作品になる","美容師さんも困惑"],["冷蔵庫の開け直し","キッチンで起きる","何も新しい物は増えていない","さっき閉めたのにもう一度中を見る","希望だけが冷えている"],["スマホの画面割れ","手に持つ道具の事故","落とすと起きやすい","画面に蜘蛛の巣のような線が入る","修理代が一番怖い"],["テスト前の掃除","勉強するはずの時間","なぜか部屋が気になってくる","机の片付けだけが異常にはかどる","掃除の才能が覚醒"],["行列の先頭","人気店などで見かける","一番早く到着した人","ずっと待って最初に入れる場所","後ろからの圧がすごい"],["自動ドア","入口にある","近づくと反応する","手を触れずに勝手に開く","たまに開かず気まずい"],["ポケットのティッシュ","身に付けた物","洗濯前に確認したい","洗濯機で紙吹雪に変身する","服が白い雪国に"],["ゲームのセーブ忘れ","遊びに関係する","長く進めたあとが危険","保存せず電源を切って進行が消える","心のHPがゼロ"],["テレビの音量","家で調整する","数字で大きさを変える","小さすぎたので1上げたら急に大音量","1の差がデカすぎ"],["ラーメンの汁はね","食べるときに起きる","白い服の日に限って","麺をすすると服に点が付く","服が味見している"],["コンビニのレジ袋","買い物の道具","袋を開ける動作","指が乾いているとなぜか開かない","袋との真剣勝負"],["カラオケの十八番","歌う場所に関係","得意な曲を持っている","マイクを持った途端に自信が出る1曲","その曲だけプロ"],["返信を忘れたLINE","スマホの会話","あとで返そうと思う","既読のまま数日が経つ","時空のゆがみ発生"],["きゅうりの一本漬け","食べ物","夏祭りでも見かける","緑の野菜をまるごと漬けてかじる","見た目は小さな剣"],["最後の一個のお菓子","おやつの話","みんなで分けるとき","袋に一つだけ残り誰も手を出さない","遠慮という名の心理戦"],["写真の半目","カメラで起きる","シャッターの瞬間","集合写真で自分だけ目を閉じている","伝説の変顔完成"],["寝る前の動画","スマホで見る","一本だけのつもり","気づけば関連動画を次々見ている","朝「誰のせいだ」"],["お風呂の温度調整","お湯の話","ちょうどいい温度を狙う","少し回しただけで熱すぎたり冷たすぎたり","温度の天才になれない"],["ゴミ箱への遠投","家でもできる","紙くずを丸める","椅子から立たずにゴミ箱へ投げ入れる","外れたら自分で拾う"],["お腹の音","体から出る","静かな部屋で","空腹のときにぐ〜っと鳴ってしまう","自己紹介より大きい"],["おつりの小銭","買い物で受け取る","財布が重くなる","財布の中に1円玉が大量に増える","財布が筋トレ"],["くしゃみ寸前","体の反応","鼻がむずむずする","出そうで出ないまま変な顔になる","顔だけ完成した"],["忘れた傘","雨の日の道具","店や電車で","置いた場所にそのまま置き去り","傘の単独旅行"],["冷たい枕の裏側","寝るときに発見","表側が温かくなる","枕をひっくり返すと一瞬だけ幸せ","世界で最小の天国"],["リモコンの電池切れ","家電で起きる","ボタンが効かなくなる","角度を変えて何度も押す","リモコン「電池ちょうだい」"],["お弁当の片寄り","持ち運ぶ食事","カバンの中で揺れる","開けるとおかずが一か所に集まっている","おかず同士が仲良し"],["朝のアラーム5個","スマホに設定","起きられるか心配","5分おきに次々鳴る","目覚まし楽団"],["ボールペンの試し書き","文房具","インクが出ないとき","紙にぐるぐる線を書いて確かめる","紙が現代アートに"],["まちがえたエレベーター","建物の移動","ボタンを押す","違う階で降りてまた乗り直す","プチ冒険発生"],["お菓子の開封失敗","おやつの袋","力を入れすぎる","袋が勢いよく破れて中身が飛ぶ","おやつが離陸"],["バスの降車ボタン","乗り物で使う","降りたい停留所の前","押そうとした瞬間に他の人が先に押す","指の出番なし"],["トーストの焦げ","朝ごはん","焼き時間が長すぎる","パンが真っ黒になってしまう","炭ではありません"],["サイコロの1","ゲームの道具","1〜6の数字","あと少しでゴールなのに最小の目が出る","サイコロのツンデレ"],["電車の乗り過ごし","移動中に起こる","ぼんやりしていると","降りる駅を通り過ぎてしまう","旅が勝手に延長"]];
const CHAOS_CLUES=[["空飛ぶたこ焼き","食べ物の話かと思いきや","地面にはいない","羽が生えて空を飛ぶ大阪名物","ソースは空から降るのか"],["宇宙人の職員会議","会議の一種","参加者は地球出身ではない","UFOに乗る宇宙人が真面目に議題を話す","議事録は宇宙語"],["忍者のオンライン授業","学ぶ場面","姿を消す人が参加する","黒装束で画面越しに忍術を勉強する","ミュート中も気配ゼロ"],["冷蔵庫の筋トレ","家電と運動","台所がジムになる","食べ物を冷やす大きな家電がダンベルを持つ","プロテインも冷蔵"],["しゃべる消しゴム","文房具","文字を消すはず","答案を消しながらおしゃべりする","「その答え消していい？」"],["ラーメンでできた城","食べ物で建築","麺がたくさん必要","壁が麺、屋根がチャーシューの巨大なお城","汁が堀"],["パンダの社長","動物と仕事","竹が好きな上司","白黒のクマがスーツで会社を経営する","ボーナスは笹"],["ドラゴンの歯医者","架空の生き物","大きな口が必要","火を吹く竜の虫歯を治療する仕事","先生が先に燃えそう"],["おにぎりの大統領","食べ物と政治","ごはんを握った姿","三角のおにぎりが国のトップになる","政策は海苔増量"],["月でラジオ体操","宇宙の運動","重力が少ない場所","月面でジャンプしながら朝の体操","ジャンプが高すぎ"],["カレー味の歯みがき粉","日用品の味","歯を磨くための物","辛い料理の味がする歯みがき用品","磨いたあとお腹すく"],["雪だるまのサウナ","冬の生き物？","熱い場所が苦手","雪でできた人形が高温の部屋で汗をかく","3秒で消えそう"],["猫が校長先生","動物と学校","ニャーと挨拶","猫が校長室で学校を仕切っている","校則は昼寝必須"],["透明人間のかくれんぼ","遊びの話","姿が見えない","透明になれる人が鬼ごっこで隠れる","反則級の強さ"],["走るプリン","デザートと運動","ぷるぷる揺れる","甘いプリンに足が生えて全力疾走","カラメルがこぼれる"],["ロボットの寝坊","機械と生活","目覚ましが鳴らない","電池満タンの機械が会社に遅刻する","「再起動しました」"],["ゴリラのピアノ発表会","動物と音楽","力強い指が鍵盤へ","ゴリラが蝶ネクタイで演奏を披露","ピアノが心配"],["お寿司の運動会","食べ物と行事","回転することもある","お寿司のネタたちがリレー競争","マグロがアンカー"],["吸血鬼の日焼け止め","怪物と日光","太陽の光が苦手","ドラキュラが日差し対策でクリームを塗る","SPF1000が必要"],["Wi-Fiを探す仙人","山奥の達人","インターネットが必要","長いヒゲの仙人が電波マークを探して歩く","悟りより電波"]];
const TWO_CHOICES=[["毎日どちらかしか食べられないなら？","カレー","ラーメン"],["学校の先生が動物になるなら？","パンダ先生","ペンギン先生"],["一日だけ使える超能力は？","瞬間移動","空を飛ぶ"],["家の中でしゃべり出すなら？","冷蔵庫","洗濯機"],["毎朝起こしに来るなら？","ドラゴン","忍者"],["一生どちらかの音だけがするなら？","くしゃみ音","拍手音"],["どちらかの帽子を毎日かぶるなら？","王冠","宇宙ヘルメット"],["おにぎりの具になるなら？","鮭","梅"],["ペットにするなら？","小さな恐竜","しゃべる猫"],["自分の登場BGMは？","映画のラスボス曲","運動会の曲"],["一日だけ体が変わるなら？","身長3メートル","体重3キロ"],["魔法のドアを開けるなら？","100年後","100年前"],["夢の旅行先は？","お菓子の国","宇宙ステーション"],["勉強の相棒にするなら？","天才ロボット","物知りなカラス"],["乗って登校するなら？","空飛ぶほうき","巨大な亀"],["一週間禁止されると困るのは？","スマホ","おやつ"],["どっちの町に住みたい？","毎日お祭りの町","毎日雪合戦の町"],["カラオケで歌うなら？","全部早口の曲","全部ささやきの曲"],["自宅の玄関にいるなら？","礼儀正しいゴリラ","ダンスするロボット"],["ずっと続くなら？","夏休み初日","誕生日の前日"],["宝箱に入っているなら？","1万円","どこでもドア"],["運動会の競技になるなら？","全力けんけん","巨大スプーンリレー"],["時間を戻せるなら？","昨日に1回","5分前に毎日"],["お弁当を作ってもらうなら？","宇宙人","侍"],["自分の影が変わるなら？","ドラゴンの影","ハートの影"],["買い物の支払い方法が一つなら？","全部じゃんけん","全部ダジャレ"],["一日だけ変身するなら？","イルカ","ワシ"],["どちらのスイッチを押す？","部屋が自動掃除","宿題が自動完成"],["初対面の挨拶が選べないなら？","一礼して空中回転","大声で歌う"],["世界に一つ増やせるなら？","休みの日","無料のアイス"],["どちらの秘密基地？","雲の上の家","海の中の家"],["一度だけ願いが叶うなら？","明日が休日","今日がもう一回"],["どちらの家電がしゃべる？","エアコン","電子レンジ"],["一週間だけ仕事するなら？","パン屋の店長","テーマパークの案内人"],["ロボットに任せるなら？","洗濯全部","皿洗い全部"],["空から降ってくるなら？","マシュマロ","カラフルな風船"],["動物の特技をもらうなら？","チーターの速さ","フクロウの視力"],["自分がゲームのボスになるなら？","伝説の魔王","巨大プリン"],["地面が一日だけ変わるなら？","ふかふかクッション","トランポリン"],["友達にプレゼントするなら？","空飛ぶ自転車","透明マント"]];
const TSUKKOMI=[["校長先生が朝礼で突然「今日から全員ペンギン歩きです！」","ここは南極か！"],["エレベーターの中で「上に参ります」の声が「気合で参ります」に変わった","精神論で動くんかい！"],["ラーメン屋に入ったらメニューが「麺なしラーメン」だけだった","それもうスープ！"],["猫がスマホを見ながら「今日の飼い主は遅刻です」と言った","立場が逆！"],["冷蔵庫を開けたら中に小さな冷蔵庫が入っていた","マトリョーシカか！"],["忍者が隠れ身の術で透明になったのに靴だけ残っていた","足元バレバレ！"],["宇宙人が地球に来て最初に覚えた言葉が「ポイントカードありますか？」だった","馴染むの早っ！"],["恐竜が面接で「長所は手が短いことです」と言った","それ長所か！"],["自販機で水を買ったら「今日はお湯の気分です」と返事した","気分で決めるな！"],["魔法使いが「空を飛べ！」と言ったら掃除機だけ飛んだ","そっちが飛ぶんかい！"],["プリンがマラソンに参加して毎回ぷるぷる震えていた","走る前に固まれ！"],["スマートウォッチが「今日の運動は瞬き32回です」と褒めてきた","ハードル低すぎ！"],["タコがじゃんけん大会で8本全部チョキを出した","ルールが大混乱！"],["月に行ったらコンビニの看板が「24時間営業・地球時間」だった","時差でややこしい！"],["パン屋でクロワッサンが「僕は三日月です」と自己紹介した","形だけな！"],["風船をふくらませたら「やめてください、くすぐったい」と言われた","こっちも困るわ！"],["学校のチャイムが毎回「もう帰ろう」と言ってきた","授業始めさせて！"],["桃太郎が犬・猿・キジの代わりにプリン・メロンパン・大福を連れてきた","全員食べ物！"],["カメが競走で「今日は本気」と言ったらスケートボードに乗った","足で走らんのかい！"],["アイス屋さんで一番人気が「あつあつアイス」だった","溶けるやろ！"],["先生の黒板に「本日の宿題：先生を応援する」が書いてあった","何があった先生！"],["パソコンが「アップデートにあと500年」と表示した","次の文明に任せよう！"],["ロボット掃除機が家具に「ちょっとそこどいて」とお願いしていた","掃除が丁寧！"],["お寿司が電車に乗って「回転するのはもう疲れた」とつぶやいた","回らない寿司デビュー！"],["ドラゴンが火を吐こうとして「のど飴ありますか？」と聞いてきた","先に喉を守れ！"],["忍者がコンビニで「気配を消してレジを通ります」と宣言した","宣言するな！"],["じゃんけんでグーを出したら相手が巨大な岩を出してきた","サイズのルールないんか！"],["かき氷が「今日は寒いからホットで」と注文された","もう別の食べ物！"],["ペンギンが海で「水泳は苦手だけど滑りはプロ」と言った","本業どっち！"],["トイレのスリッパが「この先、靴を脱いでください」と看板を出していた","もう脱いでるわ！"],["靴下が片方だけ「自分探しの旅に出ます」と置き手紙を書いた","洗濯ネットに帰れ！"],["おにぎりが「今日はちょっと中身を見せられません」とモジモジしていた","具を隠すな！"],["時計が12時になると「ここから先は自由時間！」と叫んだ","時刻の仕事して！"],["サンタが「今年からプレゼントは電子データです」と言ってUSBを置いていった","サンタもDX！"],["給食のメニューが「カレー、カレー、気合のカレー」だった","献立考えるの放棄！"],["宇宙人が「地球征服の前にWi-Fiパスワード教えて」と言った","征服より電波！"],["帽子が「今日は髪型で勝負したい」と言って勝手に脱げた","帽子のプライド！"],["忍者の分身の術で増えた3人が全員休憩を始めた","働く分身を作れ！"],["イルカが「水泳の授業は見学します」と言い出した","泳ぎの先生やろ！"],["ゲームのラスボスが「セーブしてから来てください」と親切に案内してくれた","やさしいラスボス！"]];
const KEY='saiko-party-games-v1';let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){}
let mode=null,state=null,timer=null,teams=[0,0];
function persist(){try{localStorage.setItem(KEY,JSON.stringify(saved))}catch(e){}}
function stop(){clearInterval(timer);clearTimeout(timer);timer=null}
function show(t){$('status').textContent=t}function panel(h){$('board').innerHTML=h}
function actions(arr){$('actions').innerHTML=arr.map(([id,v])=>'<button id="a_'+id+'" type="button">'+v+'</button>').join('')}
function scores(){if(mode==='bingo'||mode==='two'){$('scores').replaceChildren();return}if(['teamMemory','teamHighLow','team21','symbolSpeed'].includes(mode)){if(!state||state.phase==='setup'){$('scores').replaceChildren();return}$('scores').innerHTML=teams.map((n,i)=>'<div class="teamStanding'+((mode==='teamMemory'||mode==='team21')&&state.turn===i?' current':'')+'">'+TEAM_BADGES[i]+' '+TEAM_COLORS[i]+' '+(n||0)+(mode==='teamMemory'?'組':'点')+'</div>').join('');return}$('scores').innerHTML=teams.map((n,i)=>'<div>'+(i?'🔵青':'🔴赤')+' '+n+'点 <button type="button" id="team'+i+'">＋1</button></div>').join('');[0,1].forEach(i=>$('team'+i).onclick=()=>{teams[i]++;scores()})}
function back(){stop();mode=null;state=null;$('home').hidden=false;$('game').hidden=true}
function start(m){stop();mode=m;state=null;teams=[0,0];$('game').dataset.mode=m;$('home').hidden=true;$('game').hidden=false;$('title').textContent={bingo:'🎱 ビンゴ大会',gesture:'🎭 ジェスチャー対決',association:'💭 ヒントで連想大会',ox:'⭕❌ ○×クイズ大会',teamMemory:'🃏 みんなで神経衰弱',teamHighLow:'🃏 みんなでハイ＆ロー',team21:'🎯 ぴったり21カード',symbolSpeed:'⚡ 同じ絵スピード',two:'🤔 究極の二択',tsukkomi:'🎤 ツッコミ選手権'}[m];$('printCards').replaceChildren();scores();if(m==='two')startTwo();else if(m==='tsukkomi')startTsukkomi();else if(m==='teamMemory')startTeamMemory();else if(m==='teamHighLow')startTeamHighLow();else if(m==='team21')startTeam21();else if(m==='symbolSpeed')startSymbolSpeed();else if(m==='bingo')bingo();else if(m==='gesture'){state={items:shuffle(GESTURES),pos:0,phase:0,seconds:60};gestureShow()}else if(m==='association'){beginAssociation('all')}else{state={items:shuffle(FACTS),pos:0,answer:false};oxShow()}}
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
 let items=shuffle(pool);
 if(kind==='all'){
  const normal=shuffle(CLUES),funny=shuffle(FUNNY_CLUES),chaos=shuffle(CHAOS_CLUES);
  items=[];while(normal.length||funny.length||chaos.length){if(funny.length)items.push(funny.pop());if(normal.length)items.push(normal.pop());if(chaos.length)items.push(chaos.pop());}
 }
 state={items,pos:0,hint:0,answer:false,category:kind};
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


/* 大型モニター用カードゲーム：2〜6人／チーム。手札の秘密が必要ない種目を採用 */
const TEAM_BADGES=['🔴','🔵','🟡','🟢','🟣','🟠'];
const TEAM_COLORS=['赤','青','黄','緑','紫','オレンジ'];
const MEMORY_ICONS=['🍎','🌈','🐱','🐼','⭐','🎸','🚀','💎','🎂','🍀','🐬','👑','⚽','🌷','🎮','🍮'];
function memberSelect(value,id){
 return '<label class="partySelectLabel" for="'+id+'">参加する人数・チーム数</label><select id="'+id+'" class="partySelect">'+
 [2,3,4,5,6].map(n=>'<option value="'+n+'" '+(value===n?'selected':'')+'>'+n+'人／'+n+'チーム</option>').join('')+'</select>';
}
function teamSetupView(title,summary,extra,id,launch){
 const n=state.members;
 panel('<div class="teamSetup"><div class="setupEmoji">🃏✨</div><h3>'+title+'</h3><p>'+summary+'</p><div class="teamSetupFields">'+memberSelect(n,id)+extra+'</div><div class="teamPreview">'+TEAM_BADGES.slice(0,n).map((v,i)=>'<div>'+v+' '+TEAM_COLORS[i]+'</div>').join('')+'</div><button id="'+launch+'" class="setupLaunch" type="button">🎉 '+n+'人でスタート！</button></div>');
 actions([['home','← ほかのゲーム']]);$('a_home').onclick=back;
}
function startTeamMemory(){
 state={phase:'setup',members:4,pairs:10};
 teamMemorySetup();
}
function teamMemorySetup(){
 const s=state;teams=Array(s.members).fill(0);scores();
 const select='<label class="partySelectLabel" for="memoryPairs">カードの枚数（難しさ）</label>'+
 '<select id="memoryPairs" class="partySelect">'+[[6,'🌱 12枚・かんたん'],[10,'🌟 20枚・ふつう'],[15,'👑 30枚・むずかしい']].map(([p,label])=>'<option value="'+p+'" '+(s.pairs===p?'selected':'')+'>'+label+'</option>').join('')+'</select>';
 teamSetupView('みんなで神経衰弱','ペアを当てた人／チームに1点！ 当てたら続けて挑戦、はずれたら次の人へ。',select,'memoryMembers','memoryLaunch');
 $('memoryMembers').onchange=()=>{s.members=Number($('memoryMembers').value);teamMemorySetup()};
 $('memoryPairs').onchange=()=>{s.pairs=Number($('memoryPairs').value);teamMemorySetup()};
 $('memoryLaunch').onclick=()=>beginTeamMemory(s.members,s.pairs);
}
function beginTeamMemory(members=4,pairs=10){
 if(mode!=='teamMemory')return;
 if(!Number.isInteger(members)||members<2||members>6||![6,10,15].includes(pairs))return;
 stop();const icons=shuffle(MEMORY_ICONS).slice(0,pairs);
 teams=Array(members).fill(0);
 state={phase:'play',members,pairs,faces:shuffle(icons.flatMap(v=>[v,v])),flipped:[],matched:new Set(),turn:0,locked:false,round:0,completed:false};
 show(TEAM_BADGES[0]+' '+TEAM_COLORS[0]+'の番！ カードを2枚めくってね。');
 teamMemoryShow();
}
function teamMemoryShow(){
 const s=state;if(!s||s.phase!=='play')return;
 scores();const columns=s.pairs===6?4:s.pairs===10?5:6;
 panel('<div class="turnBanner">'+TEAM_BADGES[s.turn]+' '+TEAM_COLORS[s.turn]+' の番 <span>✨ 当てたらもう一回！</span></div><div class="teamMemoryBoard" style="--memory-cols:'+columns+'">'+s.faces.map((v,i)=>{
 const opened=s.flipped.includes(i)||s.matched.has(i),matched=s.matched.has(i);
 return '<button type="button" class="memTile" data-mem="'+i+'" '+(s.locked||matched||s.completed?'disabled':'')+' aria-label="カード '+(i+1)+(opened?'：'+v:'：裏向き')+'"><span class="face'+(opened?' open':'')+(matched?' matched':'')+'">'+(opened?v:'')+'</span></button>';
 }).join('')+'</div>');
 for(const b of $('board').querySelectorAll('[data-mem]'))b.onclick=()=>tapTeamMemory(Number(b.dataset.mem));
 if(s.completed){
 const highest=Math.max(...teams),winners=teams.map((v,i)=>v===highest?TEAM_BADGES[i]+' '+TEAM_COLORS[i]:null).filter(Boolean);
 show('🏆 '+(winners.length===teams.length?'全員同点！':winners.join('・')+' の勝ち！')+'　全'+s.pairs+'組完成！');
 actions([['again','🔄 同じ人数で再戦'],['setup','⚙️ 人数・難易度を変更']]);
 $('a_again').onclick=()=>beginTeamMemory(s.members,s.pairs);
 $('a_setup').onclick=()=>{state={phase:'setup',members:s.members,pairs:s.pairs};teamMemorySetup();};
 }else{
 actions([['setup','⚙️ 人数・難易度を変更']]);
 $('a_setup').onclick=()=>{if(!confirm('対戦を中断して設定に戻る？'))return;stop();state={phase:'setup',members:s.members,pairs:s.pairs};teamMemorySetup();};
 }
}
function tapTeamMemory(i){
 const s=state;
 if(mode!=='teamMemory'||!s||s.phase!=='play'||s.completed||s.locked||s.flipped.includes(i)||s.matched.has(i)||!Number.isInteger(i)||i<0||i>=s.faces.length)return;
 s.flipped.push(i);
 if(s.flipped.length===2){
 s.round++;const[a,b]=s.flipped;
 if(s.faces[a]===s.faces[b]){
  s.matched.add(a);s.matched.add(b);s.flipped=[];teams[s.turn]++;
  if(s.matched.size===s.faces.length){s.completed=true;teamMemoryShow();return}
  show('🌟 ペア成立！ '+TEAM_BADGES[s.turn]+' '+TEAM_COLORS[s.turn]+'に1点！ 続けてもう1回！');
 }else{
  s.locked=true;const next=(s.turn+1)%s.members;
  show('おしい！ 場所を覚えてね。次は '+TEAM_BADGES[next]+' '+TEAM_COLORS[next]+'！');
  timer=setTimeout(()=>{if(mode!=='teamMemory'||state!==s)return;s.flipped=[];s.locked=false;s.turn=next;show(TEAM_BADGES[next]+' '+TEAM_COLORS[next]+'の番！');teamMemoryShow()},1300);
 }
 }
 teamMemoryShow();
}
/* みんなでハイ＆ロー：全員の予想を大画面で受け付けて同時判定 */
const SUIT_SIGNS=['♠','♥','♦','♣'];
const RANK_NAME=['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];
function groupDeck(){return shuffle(SUIT_SIGNS.flatMap(suit=>Array.from({length:13},(_,r)=>({rank:r+1,suit}))));}
function startTeamHighLow(){
 state={phase:'setup',members:4,roundLimit:15};highLowSetup();
}
function highLowSetup(){
 const s=state;teams=Array(s.members).fill(0);scores();
 teamSetupView('みんなでハイ＆ロー','今のカードを見て、次の数字が「上がる」か「下がる」か予想！ みんなの予想を入力して一斉発表。', '', 'highLowMembers','highLowLaunch');
 $('highLowMembers').onchange=()=>{s.members=Number($('highLowMembers').value);highLowSetup()};
 $('highLowLaunch').onclick=()=>beginTeamHighLow(s.members);
}
function beginTeamHighLow(members=4){
 if(mode!=='teamHighLow'||!Number.isInteger(members)||members<2||members>6)return;
 stop();const cards=groupDeck();teams=Array(members).fill(0);
 state={phase:'vote',members,roundLimit:15,cards,current:cards.shift(),next:null,round:0,predictions:Array(members).fill(null),outcome:0};
 highLowShow();
}
function highLowCard(c,hidden=false){
 if(hidden)return '<div class="hlCard cardBack" aria-label="裏向きのカード"><span>✦</span></div>';
 const red=c.suit==='♥'||c.suit==='♦';
 return '<div class="hlCard'+(red?' heart':'')+'" aria-label="'+c.suit+'の'+RANK_NAME[c.rank]+'"><span class="cornerMark">'+RANK_NAME[c.rank]+'<br>'+c.suit+'</span><strong>'+c.suit+'</strong><span class="cornerMark bottom">'+RANK_NAME[c.rank]+'<br>'+c.suit+'</span></div>';
}
function highLowShow(){
 const s=state;if(!s||!['vote','reveal'].includes(s.phase))return;
 scores();
 const currentCard=highLowCard(s.current),nextCard=highLowCard(s.next,s.phase==='vote');
 const voteRows=TEAM_BADGES.slice(0,s.members).map((emoji,i)=>{
  const v=s.predictions[i],out=s.phase==='reveal'?(s.outcome===0?'引き分け':v===s.outcome?'✅ 正解':'—'):'';
  return '<div class="voteTeamRow"><span class="voteTeamName">'+emoji+' '+TEAM_COLORS[i]+'</span><button type="button" class="votePick'+(v===1?' picked':'')+'" id="hi_'+i+'" '+(s.phase==='reveal'?'disabled':'')+'>⬆ 大きい</button><button type="button" class="votePick'+(v===-1?' picked':'')+'" id="lo_'+i+'" '+(s.phase==='reveal'?'disabled':'')+'>⬇ 小さい</button><span class="voteResult">'+out+'</span></div>';
 }).join('');
 panel('<div class="hlRound">第 '+(s.round+1)+' / '+s.roundLimit+' 問　<span>同じ数字なら引き分け・得点なし</span></div><div class="hlArena">'+currentCard+'<div class="hlArrow">➜</div>'+nextCard+'</div><div class="voteLegend">'+(s.phase==='vote'?'みんなの予想を選ぼう！ 早く押してもカードは開かないよ。':s.outcome===0?'🤝 同じ数字！ 全員引き分け':s.outcome===1?'⬆ 正解は「大きい」！':'⬇ 正解は「小さい」！')+'</div><div class="voteTeamGrid">'+voteRows+'</div>');
 if(s.phase==='vote')for(let i=0;i<s.members;i++){
  $('hi_'+i).onclick=()=>setHighLowVote(i,1);
  $('lo_'+i).onclick=()=>setHighLowVote(i,-1);
 }
 if(s.phase==='vote'){
 const filled=s.predictions.filter(v=>v!==null).length;
 show('予想済み '+filled+' / '+s.members+' 人（未選択の人は0点で発表も可能）');
 actions([['reveal','🎉 カードを開いて正解発表'],['setup','⚙️ 人数を変更']]);
 $('a_reveal').onclick=revealHighLow;
 $('a_setup').onclick=()=>{if(!confirm('対戦を中断して設定に戻る？'))return;state={phase:'setup',members:s.members,roundLimit:15};highLowSetup()};
 }else{
 show('結果発表！ 今のカードは '+RANK_NAME[s.current.rank]+'、次は '+RANK_NAME[s.next.rank]+'。 得点を更新したよ。');
 actions([['next',s.round+1===s.roundLimit?'🏆 最終結果へ':'➡ 次のカードへ']]);
 $('a_next').onclick=nextHighLowRound;
 }
}
function setHighLowVote(index,guess){
 const s=state;if(mode!=='teamHighLow'||s.phase!=='vote'||!Number.isInteger(index)||index<0||index>=s.members||![1,-1].includes(guess))return;
 s.predictions[index]=guess;highLowShow();
}
function revealHighLow(){
 const s=state;if(mode!=='teamHighLow'||s.phase!=='vote')return;
 s.next=s.cards.shift();s.outcome=Math.sign(s.next.rank-s.current.rank);s.phase='reveal';
 if(s.outcome!==0)s.predictions.forEach((v,i)=>{if(v===s.outcome)teams[i]++});
 highLowShow();
}
function nextHighLowRound(){
 const s=state;if(mode!=='teamHighLow'||s.phase!=='reveal')return;
 s.round++;
 if(s.round>=s.roundLimit){highLowFinish();return}
 s.current=s.next;s.next=null;s.predictions=Array(s.members).fill(null);s.outcome=0;s.phase='vote';highLowShow();
}
function highLowFinish(){
 const s=state;s.phase='finished';const top=Math.max(...teams);
 const winners=teams.map((score,i)=>score===top?TEAM_BADGES[i]+' '+TEAM_COLORS[i]:null).filter(Boolean);
 const title=winners.length===teams.length?'みんな同点！':winners.join('・')+' 優勝！';
 panel('<div class="hlWin"><div class="hlTrophy">🏆🎉✨</div><h3>'+title+'</h3><p>15問のハイ＆ロー、おつかれさま！</p><div class="hlFinalScores">'+teams.map((score,i)=>'<div>'+TEAM_BADGES[i]+' '+TEAM_COLORS[i]+'　<strong>'+score+'点</strong></div>').join('')+'</div></div>');
 show('🎉 15ラウンド終了！');
 actions([['again','🔄 同じ人数でもう一度'],['setup','⚙️ 人数を選び直す']]);
 $('a_again').onclick=()=>beginTeamHighLow(s.members);
 $('a_setup').onclick=()=>{state={phase:'setup',members:s.members,roundLimit:15};highLowSetup()};
}
/* 究極の二択：正解なし、スタッフが投票をカウント */
function startTwo(){state={items:shuffle(TWO_CHOICES),pos:0,votes:[0,0],showVotes:false};twoShow();}
function twoShow(){
 const s=state;
 if(s.pos>=s.items.length){show('🎉 全40問をみんなで議論できた！');panel('<div class="answer">40問クリア！ 🎉</div>');actions([['again','🔄 もう一度']]);$('a_again').onclick=startTwo;return}
 const [question,a,b]=s.items[s.pos];
 show('第'+(s.pos+1)+'/40問　｜　正解はないよ！ 好きな方に投票しよう。');
 panel('<div class="twoQuestion">🤔 '+question+'</div><div class="twoOptions"><button type="button" class="twoOption a" id="voteA"><small>🅰️ A</small><strong>'+a+'</strong><span>🖐 この方に1票</span></button><button type="button" class="twoOption b" id="voteB"><small>🅱️ B</small><strong>'+b+'</strong><span>🖐 この方に1票</span></button></div>'+(s.showVotes?'<div class="twoResult">投票結果　A：'+s.votes[0]+'票　／　B：'+s.votes[1]+'票</div>':''));
 $('voteA').onclick=()=>{s.votes[0]++;show('🅰️ Aに1票！　A '+s.votes[0]+'票 / B '+s.votes[1]+'票');};
 $('voteB').onclick=()=>{s.votes[1]++;show('🅱️ Bに1票！　A '+s.votes[0]+'票 / B '+s.votes[1]+'票');};
 actions(s.showVotes?[['next','➡ 次の二択']]:[['result','📊 投票結果を発表'],['clear','↺ この問題の票をリセット']]);
 if($('a_result'))$('a_result').onclick=()=>{s.showVotes=true;twoShow()};
 if($('a_clear'))$('a_clear').onclick=()=>{s.votes=[0,0];twoShow()};
 if($('a_next'))$('a_next').onclick=()=>{s.pos++;s.votes=[0,0];s.showVotes=false;twoShow()};
}
/* ツッコミ選手権：お題に対して自由に発言。お手本は一例。 */
function startTsukkomi(){state={items:shuffle(TSUKKOMI),pos:0,revealed:false};teams=[0,0];scores();tsukShow();}
function tsukShow(){
 const s=state;
 if(s.pos>=s.items.length){show('🎉 全40問クリア！　赤'+teams[0]+'点・青'+teams[1]+'点');panel('<div class="answer">優勝おめでとう！ 🏆</div>');actions([['again','🔄 もう一度']]);$('a_again').onclick=startTsukkomi;return}
 const [scene,model]=s.items[s.pos];
 show('第'+(s.pos+1)+'/40問　｜　正解は自由！ おもしろいツッコミを考えてね。');
 panel('<div class="tsukBox"><div class="tsukIcon">🎭💥</div><div class="tsukScene">'+scene+'</div><div class="tsukPrompt">さあ、どうツッコむ？</div>'+(s.revealed?'<div class="tsukReveal"><small>😂 お手本の一例</small><strong>'+model+'</strong></div>':'')+'</div>');
 actions(s.revealed?[['next','➡ 次のお題']]:[['reveal','🎉 お手本ツッコミを表示'],['skip','⏭ 次へ']]);
 if($('a_reveal'))$('a_reveal').onclick=()=>{s.revealed=true;tsukShow()};
 if($('a_skip'))$('a_skip').onclick=()=>{s.pos++;s.revealed=false;tsukShow()};
 if($('a_next'))$('a_next').onclick=()=>{s.pos++;s.revealed=false;tsukShow()};
}


/* 2〜6 人で21を目指すノーベット・カード大会。手札は全て大画面に公開。 */
const TWENTY_ONE_SUITS=['♠','♥','♦','♣'],TWENTY_ONE_RANKS=['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];
function deck21(){
 return shuffle(TWENTY_ONE_SUITS.flatMap(suit=>Array.from({length:13},(_,k)=>({
  suit,rank:k+1,value:Math.min(k+1,10)
 }))));
}
function startTeam21(){state={phase:'setup',members:4,totalRounds:3};setupTeam21()}
function setupTeam21(){
 const s=state;teams=Array(s.members).fill(0);scores();
 teamSetupView('ぴったり21カード','手持ちの数字の合計を21に近づけよう！ 21を超えたら失敗。お金や賭けは一切なし。みんなのカードは全員に見えるよ。','','team21Members','team21Launch');
 $('team21Members').onchange=()=>{s.members=Number($('team21Members').value);setupTeam21()};
 $('team21Launch').onclick=()=>beginTeam21(s.members);
}
function beginTeam21(members=4){
 if(mode!=='team21'||!Number.isInteger(members)||members<2||members>6)return;
 stop();teams=Array(members).fill(0);
 state={phase:'playing',members,round:0,totalRounds:3,turn:0,deck:[],hands:[],roundWinners:[]};
 deal21();
}
function deal21(){
 const s=state;if(!s||mode!=='team21')return;
 const deck=deck21();s.deck=deck;s.turn=0;s.phase='playing';
 s.hands=Array.from({length:s.members},()=>({cards:[deck.shift(),deck.shift()],stopped:false,bust:false}));
 // Ace counts as 1; face cards count as 10.
 show21();
}
function sum21(cards){return cards.reduce((total,c)=>total+c.value,0)}
function card21Visual(c){
 const red=c.suit==='♥'||c.suit==='♦';
 return '<div class="twentyCard'+(red?' red':'')+'"><span>'+TWENTY_ONE_RANKS[c.rank]+'<small>'+c.suit+'</small></span><strong>'+c.suit+'</strong></div>';
}
function show21(){
 const s=state;if(!s||!['playing','roundResult','finished'].includes(s.phase))return;
 scores();
 const hands=s.hands.map((hand,i)=>{
  const sum=sum21(hand.cards),active=s.phase==='playing'&&s.turn===i;
  return '<div class="twentyHand'+(active?' active':'')+(hand.bust?' busted':'')+'"><div class="twentyHead">'+TEAM_BADGES[i]+' '+TEAM_COLORS[i]+'　<strong>'+sum+' / 21</strong></div><div class="twentyCards">'+hand.cards.map(card21Visual).join('')+'</div><div class="twentyState">'+(hand.bust?'💥 21を超えた！':hand.stopped?'✅ ここでストップ':active?'🎯 いま挑戦中！':'⏳ 順番を待とう')+'</div></div>';
 }).join('');
 const lead='<div class="twentyTitle">第 '+(s.round+1)+' / '+s.totalRounds+' ラウンド　<span>🅰️ A＝1、J・Q・K＝10</span></div>';
 panel('<div class="twentyShow">'+lead+'<div class="twentyHands">'+hands+'</div></div>');
 if(s.phase==='playing'){
  const hand=s.hands[s.turn],sum=sum21(hand.cards);
  show(TEAM_BADGES[s.turn]+' '+TEAM_COLORS[s.turn]+'の番！ 21まであと '+Math.max(0,21-sum)+'。カードを引く？ 止める？');
  actions([['hit','🃏 もう1枚引く'],['stay','✋ ここで止める'],['setup','⚙️ 人数変更']]);
  $('a_hit').disabled=hand.cards.length>=7||sum>=21;
  $('a_hit').onclick=hit21;
  $('a_stay').onclick=stay21;
  $('a_setup').onclick=()=>{if(!confirm('現在の大会を終了して人数選択に戻る？'))return;state={phase:'setup',members:s.members,totalRounds:3};setupTeam21()};
 }else if(s.phase==='roundResult'){
  const names=s.roundWinners.map(i=>TEAM_BADGES[i]+' '+TEAM_COLORS[i]).join('・');
  show('🏆 第'+(s.round+1)+'ラウンド結果：'+(names||'全員21超え！')+'　各チーム合計 '+teams.join(' / ')+' 点');
  actions([['next',s.round+1===s.totalRounds?'🏆 最終結果を見る':'➡ 次のラウンド']]);
  $('a_next').onclick=next21;
 }
}
function hit21(){
 const s=state;if(mode!=='team21'||s.phase!=='playing')return;
 const h=s.hands[s.turn];if(h.stopped||h.bust||h.cards.length>=7||!s.deck.length)return;
 h.cards.push(s.deck.shift());
 const sum=sum21(h.cards);
 if(sum>21)h.bust=true;
 if(sum>=21||h.cards.length>=7)h.stopped=true;
 if(h.stopped||h.bust)advance21();else show21();
}
function stay21(){
 const s=state;if(mode!=='team21'||s.phase!=='playing')return;
 s.hands[s.turn].stopped=true;advance21();
}
function advance21(){
 const s=state;if(!s||s.phase!=='playing')return;
 for(let i=s.turn+1;i<s.members;i++){
  if(!s.hands[i].stopped&&!s.hands[i].bust){s.turn=i;show21();return}
 }
 finish21Round();
}
function finish21Round(){
 const s=state;if(!s||s.phase!=='playing')return;
 const valid=s.hands.map((h,i)=>({i,value:sum21(h.cards)})).filter(x=>x.value<=21);
 const top=valid.length?Math.max(...valid.map(x=>x.value)):0;
 s.roundWinners=valid.filter(x=>x.value===top).map(x=>x.i);
 for(const i of s.roundWinners)teams[i]+=top===21?2:1;
 s.phase='roundResult';show21();
}
function next21(){
 const s=state;if(mode!=='team21'||s.phase!=='roundResult')return;
 s.round++;
 if(s.round===s.totalRounds){finish21();return}
 deal21();
}
function finish21(){
 const s=state;if(!s)return;s.phase='finished';
 const max=Math.max(...teams),winners=teams.map((v,i)=>v===max?TEAM_BADGES[i]+' '+TEAM_COLORS[i]:null).filter(Boolean);
 const title=winners.length===teams.length?'全員同点！':winners.join('・')+' が優勝！';
 panel('<div class="hlWin"><div class="hlTrophy">🏆🎉✨</div><h3>'+title+'</h3><p>3ラウンドの数字カード大会終了！</p><div class="hlFinalScores">'+teams.map((v,i)=>'<div>'+TEAM_BADGES[i]+' '+TEAM_COLORS[i]+'　<strong>'+v+'点</strong></div>').join('')+'</div></div>');
 show('21ぴったりは2点、それ以外は最高得点者に1点。得点の高い人が優勝！');
 actions([['again','🔄 同じ人数で再戦'],['setup','⚙️ 人数を変更']]);
 $('a_again').onclick=()=>beginTeam21(s.members);
 $('a_setup').onclick=()=>{state={phase:'setup',members:s.members,totalRounds:3};setupTeam21()};
}
/* Exactly-one-common-symbol puzzle: projective plane of order three, 13 cards, 4 icons each */
const SPEED_ICONS=['🍎','🐼','🎸','🚀','🌈','💎','🌻','⚽','🐸','🍰','🎲','🦄','🔑'];
function buildSymbolDeck(){
 const lines=[];
 for(let slope=0;slope<3;slope++)for(let intercept=0;intercept<3;intercept++){
  const l=Array.from({length:3},(_,x)=>x*3+(slope*x+intercept)%3);
  l.push(9+slope);lines.push(l);
 }
 for(let x=0;x<3;x++)lines.push([x*3,x*3+1,x*3+2,12]);
 lines.push([9,10,11,12]);
 return lines;
}
const SPEED_DECK=buildSymbolDeck();
function symbolPairPool(){
 const pairs=[];for(let i=0;i<SPEED_DECK.length;i++)for(let j=i+1;j<SPEED_DECK.length;j++)pairs.push([i,j]);
 return shuffle(pairs);
}
function commonSymbol(a,b){
 const shared=SPEED_DECK[a].filter(n=>SPEED_DECK[b].includes(n));
 return shared.length===1?shared[0]:null;
}
function startSymbolSpeed(){state={phase:'setup',members:4,total:15};symbolSetup()}
function symbolSetup(){
 const s=state;teams=Array(s.members).fill(0);scores();
 teamSetupView('同じ絵スピード','2枚のカードに、まったく同じ絵が1つだけあるよ。いちばん先に見つけた人が1点！ 大きな画面で15問対決。','','speedMembers','speedLaunch');
 $('speedMembers').onchange=()=>{s.members=Number($('speedMembers').value);symbolSetup()};
 $('speedLaunch').onclick=()=>beginSymbolSpeed(s.members);
}
function beginSymbolSpeed(members=4){
 if(mode!=='symbolSpeed'||!Number.isInteger(members)||members<2||members>6)return;
 stop();teams=Array(members).fill(0);
 state={phase:'question',members,round:0,total:15,pairs:symbolPairPool().slice(0,15),awarded:null};
 showSymbolSpeed();
}
function showSymbolSpeed(){
 const s=state;if(!s||!['question','reveal'].includes(s.phase))return;
 scores();
 const [a,b]=s.pairs[s.round],shared=commonSymbol(a,b),cardView=(index,title)=>
 '<div class="symbolCard"><div class="symbolCardTitle">'+title+'</div><div class="symbolGrid">'+SPEED_DECK[index].map(id=>'<div class="symbolItem'+(s.phase==='reveal'&&id===shared?' highlighted':'')+'">'+SPEED_ICONS[id]+'</div>').join('')+'</div></div>';
 panel('<div class="symbolSpeedWrap"><div class="symbolRound">第 '+(s.round+1)+' / '+s.total+' 問</div><div class="symbolDuel">'+cardView(a,'🅰️ カードA')+'<div class="symbolVs">VS</div>'+cardView(b,'🅱️ カードB')+'</div>'+
 (s.phase==='reveal'?'<div class="symbolAnswer">正解：'+SPEED_ICONS[shared]+'　'+(s.awarded===null?'いちばん速かったのは誰？':'✨ '+TEAM_BADGES[s.awarded]+' '+TEAM_COLORS[s.awarded]+'に1点！')+'</div>':'<div class="symbolPrompt">👀 2枚に共通する絵を探そう！</div>')+'</div>');
 if(s.phase==='question'){
  show('最初に見つけた人が声で回答！ スタッフは「正解を公開」で確認してね。');
  actions([['reveal','🔎 正解の絵を公開'],['setup','⚙️ 人数を変更']]);
  $('a_reveal').onclick=()=>{s.phase='reveal';showSymbolSpeed()};
  $('a_setup').onclick=()=>{if(!confirm('対戦を中断して人数選択に戻る？'))return;state={phase:'setup',members:s.members,total:15};symbolSetup()};
 }else{
  show('正解は '+SPEED_ICONS[shared]+'！ 最初の正解者のチームに1点をつけてね。');
  const pts=s.awarded===null?TEAM_BADGES.slice(0,s.members).map((e,i)=>['award'+i,e+' '+TEAM_COLORS[i]+' ＋1点']):[];
  actions([...pts,['next',s.round+1===s.total?'🏆 最終結果へ':'➡ 次のカード']]);
  for(let i=0;i<s.members;i++)if($('a_award'+i))$('a_award'+i).onclick=()=>awardSymbol(i);
  $('a_next').onclick=nextSymbolRound;
 }
}
function awardSymbol(i){
 const s=state;if(mode!=='symbolSpeed'||s.phase!=='reveal'||s.awarded!==null||!Number.isInteger(i)||i<0||i>=s.members)return;
 s.awarded=i;teams[i]++;showSymbolSpeed();
}
function nextSymbolRound(){
 const s=state;if(mode!=='symbolSpeed'||s.phase!=='reveal')return;
 s.round++;
 if(s.round===s.total){finishSymbolSpeed();return}
 s.phase='question';s.awarded=null;showSymbolSpeed();
}
function finishSymbolSpeed(){
 const s=state;s.phase='finished';const top=Math.max(...teams);
 const winners=teams.map((v,i)=>v===top?TEAM_BADGES[i]+' '+TEAM_COLORS[i]:null).filter(Boolean);
 const title=winners.length===teams.length?'全員同点！':winners.join('・')+' 優勝！';
 panel('<div class="hlWin"><div class="hlTrophy">🏆✨⚡</div><h3>'+title+'</h3><p>15問のスピード絵合わせ大会終了！</p><div class="hlFinalScores">'+teams.map((v,i)=>'<div>'+TEAM_BADGES[i]+' '+TEAM_COLORS[i]+'　<strong>'+v+'点</strong></div>').join('')+'</div></div>');
 show('15問終了！ 共通の絵を探すゲームだったよ。');
 actions([['again','🔄 同じ人数で再戦'],['setup','⚙️ 人数を変更']]);
 $('a_again').onclick=()=>beginSymbolSpeed(s.members);
 $('a_setup').onclick=()=>{state={phase:'setup',members:s.members,total:15};symbolSetup()};
}

})();