// Sales demo regression checks: no external packages or network calls.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../services/demo-report/index.html'),'utf8');

test('demo is clearly labelled and avoids collecting production data',()=>{
  assert.match(html,/体験版/);
  assert.match(html,/個人情報を入力しないでください/);
  assert.match(html,/クラウド保存・複数端末共有・ログイン機能はありません/);
  assert.match(html,/<meta name="robots" content="noindex">/);
});
test('form validates required fields and numeric duration',()=>{
  assert.match(html,/id="entry"/);
  assert.match(html,/name="date" type="date" required/);
  assert.match(html,/name="note" maxlength="300" required/);
  assert.match(html,/name="minutes" type="number" min="1" max="1440"/);
  assert.match(html,/form\.reportValidity\(\)/);
  assert.match(html,/String\(d\.get\('note'\)\)\.trim\(\)/);
});
test('records render using textContent rather than unsafe HTML',()=>{
  assert.match(html,/title\.textContent=/);
  assert.match(html,/body\.textContent=r\.note/);
  assert.match(html,/list\.replaceChildren\(\)/);
  assert.doesNotMatch(html,/\.innerHTML\s*=/);
});
test('search, totals, reset and CSV download are wired',()=>{
  assert.match(html,/search\.addEventListener\('input',render\)/);
  assert.match(html,/shown\.reduce\(\(n,r\)=>n\+r\.minutes,0\)/);
  assert.match(html,/querySelector\('#reset'\)\.addEventListener/);
  assert.match(html,/querySelector\('#csv'\)\.addEventListener/);
  assert.match(html,/replaceAll\('"','""'\)/);
  assert.match(html,/text\/csv;charset=utf-8/);
  assert.match(html,/base-demo-reports\.csv/);
});
test('sales navigation stays separate from any marketplace checkout',()=>{
  assert.match(html,/href="\.\.\/"[^>]*>← 制作サービスへ戻る/);
  assert.match(html,/https:\/\/lin\.ee\/z5T92Yn/);
  assert.doesNotMatch(html,/kardivex/i);
});

test('CSV neutralizes spreadsheet formula prefixes in user-entered cells',()=>{
  assert.ok(html.includes('const safe=/^[\\s]*[=+@\\-\\t\\r]/'));
  assert.ok(html.includes('safe.replaceAll'));
});

test('individual demo entries can be removed without deleting all records',()=>{
  assert.match(html,/remove\.textContent='この記録を削除'/);
  assert.match(html,/remove\.addEventListener\('click'/);
  assert.match(html,/rows=rows\.filter\(x=>x!==r\)/);
  assert.match(html,/remove\.setAttribute\('aria-label'/);
  assert.match(html,/div\.append\(title,body,remove\)/);
});

const vm=require('node:vm');
test('inline demo script parses as valid JavaScript',()=>{
  const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inline,'demo script is missing');
  assert.doesNotThrow(()=>new vm.Script(inline,{filename:'demo-report-inline.js'}));
});
test('CSV escaping treats formula-like cells as literal text',()=>{
  const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  const source=inline.match(/const escape=v=>\{[\s\S]*?\};const data=/)?.[0];
  assert.ok(source,'CSV escaping implementation not found');
  const expr=source.slice('const escape='.length,-';const data='.length);
  const escape=vm.runInNewContext('('+expr+')');
  for(const value of ['=1+1','+SUM(1,2)','-1+2','@SUM(A1)','  =HYPERLINK("x")','\t=1+1']){
    const output=escape(value);
    assert.ok(output.startsWith("\"'"),'formula prefix not neutralized: '+JSON.stringify(value));
    assert.ok(output.endsWith('"'));
  }
  assert.equal(escape('ordinary'),'"ordinary"');
  assert.equal(escape('a"b'),'"a""b"');
});

test('search can be cleared without resetting demo records',()=>{
  assert.match(html,/id="clearSearch"/);
  assert.match(html,/querySelector\('#clearSearch'\)\.addEventListener\('click'/);
  assert.match(html,/search\.value='';render\(\);search\.focus\(\)/);
});
