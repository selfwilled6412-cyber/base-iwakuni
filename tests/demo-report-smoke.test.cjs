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
  assert.match(html,/const safe=\/\^\[\\s\]\*\[=\+@\\-\\t\\r\]\//);
  assert.match(html,/safe\.replaceAll\('\"','\"\"'\)/);
});
