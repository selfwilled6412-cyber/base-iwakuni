/* Selection-based guide; no AI request, tracking request, storage or automatic message sending. */
(function(){
 'use strict';
 const form=document.getElementById('base-guide-form');if(!form)return;
 const byId=id=>document.getElementById(id);
 const routes={
  pbx:{name:'電話・クラウドPBX',title:'会社の電話の、今の使い方から。',copy:'使っている番号と回線、電話に出る人数、外出中の受け方を確認します。番号の引き継ぎや費用は、個別の条件を確認してご案内します。',href:'services/phone/'},
  scs:{name:'SCS評価制度・情報セキュリティ',title:'対策の現状と、求められていることを整理。',copy:'取引先から聞かれたこと、現在の対策、まだ確認できていないことを分けて整理します。BASEの窓口は相談・準備支援で、評価取得を保証するものではありません。',href:'security/scs/'},
  camera:{name:'防犯カメラ',title:'何を、どこで確認したいですか？',copy:'撮影の目的、設置場所、録画の希望期間、確認する担当者から整理します。機器や工事の条件は現地の状況に合わせて確認します。',href:'services/security/'},
  network:{name:'Wi-Fi・ネットワーク',title:'つながりにくい場所と時間を確認。',copy:'回線・Wi-Fi・利用端末・混雑する時間を分けて、困っている状況を確認します。現時点で分かる範囲だけで大丈夫です。',href:'services/network/'},
  web:{name:'Web・LINE・販促',title:'見てもらった、その先まで。',copy:'誰に何を伝え、問い合わせや予約など、どんな行動につなげたいかを整理します。今のWeb・LINE・チラシについてお知らせください。',href:'services/web-line/'},
  ai:{name:'AI・アプリ・業務改善',title:'繰り返している作業を、一つ選びましょう。',copy:'誰が、どんな情報を、どう処理しているか。今の仕事の流れから、AIの活用やアプリ制作で改善できる範囲を相談できます。',href:'services/ai/'},
  opening:{name:'開業・設備・POS・OA',title:'開業日と、まだ決まっていないことから。',copy:'電話・ネット・防犯・POS・照明・OAなど、必要な設備と手配の順番を整理します。必要に応じてメーカーや専門事業者と連携します。',href:'opening/'}
 };
 const params=new URLSearchParams(location.search);const service=params.get('service');
 if(Object.hasOwn(routes,service))byId('base-guide-service').value=service;
 const media=['youtube','instagram','tiktok','facebook','x','threads'];
 const source=media.includes(params.get('utm_source'))?params.get('utm_source'):'BASE公式HP';
 const topic=/^base-business-\d{2}$/.test(params.get('utm_content')||'')?params.get('utm_content'):'未指定';
 let draft='';
 function show(){
  const route=routes[byId('base-guide-service').value];
  byId('base-guide-title').textContent=route.title;byId('base-guide-description').textContent=route.copy;
  const link=byId('base-guide-detail');link.href=route.href;link.textContent=route.name+'の詳しい内容を見る →';
  const intent=byId('base-guide-service').value;byId('base-guide-line').dataset.lead=intent;
  draft='株式会社BASEへ相談したいです。\n\n相談内容：'+route.name+'\n検討状況：'+byId('base-guide-stage').value+'\n希望時期：'+byId('base-guide-timing').value+'\n困っていること：'+(byId('base-guide-issue').value.trim()||'相談しながら整理したい')+'\n流入元：'+source+'\n見た企画：'+topic;
  byId('base-guide-result').hidden=false;byId('base-guide-copy').hidden=true;byId('base-guide-status').textContent='';
 }
 form.addEventListener('submit',event=>{event.preventDefault();show();});
 form.addEventListener('input',()=>{if(!byId('base-guide-result').hidden)show();});
 byId('base-guide-copy-button').addEventListener('click',async()=>{
  show();try{if(!navigator.clipboard?.writeText)throw new Error('unavailable');await navigator.clipboard.writeText(draft);byId('base-guide-status').textContent='コピーしました。公式LINEに貼り付けて送信してください。';}
  catch{const copy=byId('base-guide-copy');copy.hidden=false;copy.value=draft;copy.focus();copy.select();byId('base-guide-status').textContent='相談文を選択しました。コピーして、公式LINEに貼り付けてください。';}
 });
})();
