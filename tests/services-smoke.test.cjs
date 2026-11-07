// Run: node --test tests/services-smoke.test.cjs
// Offline checks for the sales page; not a substitute for mobile/LINE end-to-end tests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../services/index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
test('sales page has accessible contact path and responsive form', () => {
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /https:\/\/lin\.ee\/z5T92Yn/);
  assert.match(html, /id="intakeForm"/);
  assert.match(html, /name="request"[^>]*required/);
  assert.match(html, /id="copyFallback"/);
  assert.match(html, /id="copyAgain"/);
  assert.ok(script, 'inline form script missing');
});
function setup(clipboard) {
  const elements = Object.fromEntries(['intakeForm','intakeResult','copyText','copyFallback','copyAgain'].map(k=>[k,{value:'',hidden:true,textContent:'',listeners:{},addEventListener(type,fn){this.listeners[type]=fn},focus(){},select(){}}]));
  const values = {service:'ホームページ・LP制作',request:'  お店のサイトを作りたい  ',devices:'スマホ',deadline:'',budget:''};
  const sandbox = {document:{getElementById(id){return elements[id]}},navigator:{clipboard},FormData:class {get(k){return values[k]}}};
  vm.runInNewContext(script,sandbox);
  return {elements,values};
}
test('consultation creates a message and copies it when permitted', async () => {
  let copied;
  const {elements:e} = setup({writeText:async v=>{copied=v}});
  e.intakeForm.listeners.submit({preventDefault(){}});
  await new Promise(setImmediate);
  assert.match(copied,/相談内容：お店のサイトを作りたい/);
  assert.match(copied,/利用人数・端末：スマホ/);
  assert.equal(e.copyFallback.hidden,false);
  assert.match(e.intakeResult.textContent,/コピーしました/);
});
test('blocked clipboard retains a selectable fallback and retry', async () => {
  const {elements:e} = setup({writeText:async()=>{throw Error('denied')}});
  e.intakeForm.listeners.submit({preventDefault(){}});
  await new Promise(setImmediate);
  assert.equal(e.copyFallback.hidden,false);
  assert.equal(e.copyAgain.hidden,false);
  assert.match(e.intakeResult.textContent,/長押し/);
  assert.match(e.copyText.value,/【BASE 制作相談】/);
});
test('whitespace-only request is rejected', () => {
  const {elements:e,values} = setup(undefined);
  values.request='   ';
  e.intakeForm.listeners.submit({preventDefault(){}});
  assert.match(e.intakeResult.textContent,/入力してください/);
  assert.equal(e.copyText.value,'');
});
