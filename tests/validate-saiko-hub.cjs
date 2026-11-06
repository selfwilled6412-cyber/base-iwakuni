#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=fs.readFileSync('saiko-apps/index.html','utf8');
const items=[...html.matchAll(/<article class="tile" data-app-id="(\d+)" data-view="([^"]+)" data-kind="([^"]+)" data-tags="([^"]+)">([\s\S]*?)<\/article>/g)];
assert.equal(items.length,40,'Ready-to-play main catalog should have 40 individual entries');
assert.equal(new Set(items.map(x=>x[1])).size,40,'App IDs are unique');
const hrefs=items.map(x=>(x[5].match(/<a class="tileLink" href="([^"]+)"/)||[])[1]);
assert(hrefs.every(Boolean));
assert.equal(new Set(hrefs).size,40,'No duplicates in main catalog');
assert(items.every(x=>x[2].includes('all')),'All apps visible in all tab');
const distribution={};
for(const x of items)distribution[x[3]]=(distribution[x[3]]||0)+1;
assert.deepEqual(distribution,{game:35,creative:4,utility:1},'All playable puzzles and escape rooms belong to Games');
for(const url of ['../saiko-nazotoki/','../saiko-escape/','../saiko-escape-2/']){
 const match=items.find(x=>x[5].includes('href="'+url+'"'));
 assert(match&&match[3]==='game','Puzzle or escape incorrectly excluded from Games: '+url);
}
assert(html.includes("let view='game',players='all'"),'Game category with all play modes must be the default');
assert(html.includes("view==='all'||card.dataset.kind===view"),'Filter must use main category');
assert(html.includes("view!=='game'||players==='all'"),'All games visible independent of team/solo by default');
for(const name of ['game','creative','utility','all','favorites']){
 assert(html.includes('data-view-filter="'+name+'"'),'Missing main category '+name);
}
for(const mode of ['all','group','solo'])assert(html.includes('data-players-filter="'+mode+'"'),'Missing optional play mode '+mode);
for(const href of ['../saiko-premium-spot/','../saiko-party-games/?game=bingo','../saiko-rhythm/']){
 assert(hrefs.includes(href),'Missing featured app from catalog '+href);
 assert(html.split('href="'+href+'"').length>=3,'Featured navigation not present '+href);
}
assert(!html.includes('未制作')&&!html.includes('準備中'),'No development status in public catalog');
for(const folder of ['saiko-party-games','saiko-solo-arcade','saiko-card-games']){
 const page=fs.readFileSync(folder+'/index.html','utf8');
 const modes=[...page.matchAll(/data-game="([^"]+)"/g)].map(m=>m[1]);
 for(const mode of new Set(modes))assert(hrefs.includes('../'+folder+'/?game='+mode),'Hidden game: '+folder+'/'+mode);
}
for(const mode of ['memory','spot','puzzle'])assert(hrefs.includes('../saiko-kids/?game='+mode));
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
const make=dataset=>({dataset,style:{},hidden:false,value:'',textContent:'',attrs:{},events:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){this.events[k]=fn}});
const cards=items.map(m=>{const c=make({view:m[2],kind:m[3],tags:m[4]});c.textContent=m[5].replace(/<[^>]+>/g,'');const fav=make({}),link={href:(m[5].match(/class="tileLink" href="([^"]+)"/)||[])[1]};c.querySelector=q=>q==='.favToggle'?fav:link;return c});
const buttons=(attr,key)=>[...html.matchAll(new RegExp(attr+'="([^"]+)"','g'))].map(m=>make({[key]:m[1]}));
const views=buttons('data-view-filter','viewFilter'),players=buttons('data-players-filter','playersFilter'),genres=buttons('data-genre','genre');
const nodes=new Map();const get=id=>nodes.get(id)||(nodes.set(id,make({})),nodes.get(id));const saved=new Map(),w={};
vm.runInNewContext(scripts[0][1],{window:w,document:{getElementById:get,querySelectorAll:q=>q==='.tile'?cards:q==='[data-view-filter]'?views:q==='[data-players-filter]'?players:q==='[data-genre]'?genres:[]},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)}});
const choose=(list,key,value)=>list.find(x=>x.dataset[key]===value).events.click();
assert.equal(w.SaikoHub.getVisibleCount(),35);
choose(genres,'genre','cards');assert.equal(w.SaikoHub.getVisibleCount(),7);
choose(players,'playersFilter','group');assert.equal(w.SaikoHub.getVisibleCount(),3);
choose(players,'playersFilter','all');get('appSearch').value='神経衰弱';get('appSearch').events.input();assert.equal(w.SaikoHub.getVisibleCount(),2);
cards.find(c=>!c.hidden).querySelector('.favToggle').events.click();
get('appSearch').value='';get('appSearch').events.input();choose(views,'viewFilter','favorites');assert.equal(w.SaikoHub.getVisibleCount(),1);
choose(views,'viewFilter','creative');assert.equal(w.SaikoHub.getVisibleCount(),4);
choose(views,'viewFilter','all');assert.equal(w.SaikoHub.getVisibleCount(),40);
assert(saved.has('saiko-apps-favorites-v1'));
console.log('PASS: genre, group/solo, search, favorites and main category filters combine correctly');
console.log('PASS: 35 directly selectable games and 5 creative/utility apps, with complete subgame coverage');
console.log('PASS: old URLs, favorites storage, guide character, staff guide and responsive filters preserved');
