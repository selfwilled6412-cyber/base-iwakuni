#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=fs.readFileSync('saiko-apps/index.html','utf8');
const items=[...html.matchAll(/<article class="tile" data-app-id="(\d+)" data-view="([^"]+)" data-tags="([^"]+)">([\s\S]*?)<\/article>/g)];
assert.equal(items.length,15,'Ready-to-play main catalog should have 15 compact apps');
assert.equal(new Set(items.map(x=>x[1])).size,15,'App IDs are unique');
const hrefs=items.map(x=>(x[4].match(/<a class="tileLink" href="([^"]+)"/)||[])[1]);
assert(hrefs.every(Boolean));
assert.equal(new Set(hrefs).size,15,'No duplicates in main catalog');
assert(items.every(x=>x[2].includes('all')),'All apps visible in all tab');
for(const name of ['group','solo','creative']){
 assert(items.some(x=>x[2].split(' ').includes(name)),'Missing category '+name);
 assert(html.includes('data-view-filter="'+name+'"'),'Missing nav control '+name);
}
for(const href of ['../saiko-premium-spot/','../saiko-party-games/','../saiko-rhythm/']){
 assert(hrefs.includes(href),'Missing featured app from catalog '+href);
 assert(html.split('href="'+href+'"').length>=3,'Featured navigation not present '+href);
}
assert(html.includes('href="../saiko-spot-difference/"'),'Old game must remain accessible');
assert(html.includes('href="../saiko-rhythm/youtube.html"'),'Experimental YouTube app must remain accessible');
assert(html.includes('YouTube実験版はURLだけで自動採譜できない'),'Do not advertise incomplete autochart');
assert(html.includes('AI画像伝言ゲーム'),'Development app still appears');
assert(html.includes('src="../assets/lumi-approved.webp"'),'Keep previously approved guide character');
assert(!html.includes('ルミ'),'Old character name must not be shown in UI');
assert(!html.includes('イラスト90問</h3>'),'Old simple game is not promoted');
assert(html.includes('href="guide.html"'),'Staff guide retained');
assert(html.includes('data-view-filter="favorites"'),'Favorites still available');
assert(html.includes("saiko-apps-favorites-v1"),'Previously stored favorites remain compatible');
assert(html.includes('max-width:650px'), 'Mobile layout should be single column');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,1);
new vm.Script(scripts[0][1],{filename:'saiko-hub.js'});
console.log('PASS: 15 ready/usable apps, 3 separated experiments/old/coming apps, 3 featured quick links');
console.log('PASS: old URLs, favorites storage, guide character, staff guide and responsive filters preserved');
