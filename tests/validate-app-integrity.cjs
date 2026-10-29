#!/usr/bin/env node
'use strict';
/* Static page integrity sweep for all SAIKO game/creative apps.
 * No network, browser permissions, or external dependencies. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const pages=[
 'saiko-apps/index.html','saiko-apps/guide.html',
 'saiko-rhythm/index.html','saiko-rhythm/studio.html','saiko-rhythm/youtube.html',
 'saiko-adventure/index.html','saiko-kids/index.html','saiko-draw/index.html',
 'saiko-solo-arcade/index.html','saiko-party-games/index.html','saiko-card-games/index.html',
 'lumi-nazotoki/index.html','lumi-nazotoki/staff.html',
 'lumi-escape/index.html','lumi-escape/staff.html',
 'lumi-escape-2/index.html','lumi-escape-2/staff.html'
];
const soundApps=[
 'saiko-adventure/index.html','saiko-kids/index.html','saiko-solo-arcade/index.html',
 'saiko-party-games/index.html','saiko-card-games/index.html','lumi-nazotoki/index.html',
 'lumi-escape/index.html','lumi-escape-2/index.html'
];
let local=0;
for(const file of pages){
 const full=path.join(root,file);
 assert(fs.existsSync(full),'Missing page '+file);
 const html=fs.readFileSync(full,'utf8');
 assert(html.length>1000,'Truncated page: '+file);
 assert(/<meta[^>]+name="viewport"/i.test(html),'Missing smartphone viewport: '+file);
 // Ignore markup written inside JS strings, but inspect actual links/assets.
 const content=html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi,'');
 for(const match of content.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g)){
  const url=match[1].trim();
  if(/^(?:https?:|mailto:|tel:|data:|blob:|#|javascript:|\/\/)/i.test(url)||/[{}$]/.test(url))continue;
  const pathname=url.split('#')[0].split('?')[0];
  if(!pathname)continue;
  const localPath=pathname.startsWith('/')?pathname.replace(/^\/base-iwakuni\//,'').replace(/^\//,''):path.posix.normalize(path.posix.join(path.posix.dirname(file),pathname));
  assert(!localPath.startsWith('../'),'Local link escaped repository: '+file+' -> '+url);
  assert(fs.existsSync(path.join(root,localPath)),'Broken link: '+file+' -> '+url+' ('+localPath+')');
  local++;
 }
}
for(const file of soundApps){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 assert(html.includes('../saiko-apps/sound-feedback.js'),'Missing sound engine: '+file);
}
const sound=fs.readFileSync(path.join(root,'saiko-apps/sound-feedback.js'),'utf8');
assert(sound.includes('saikoSoundTest')&&sound.includes("audio.state!=='running'"),'Sound test must report browser blockage accurately');
const bingo=fs.readFileSync(path.join(root,'saiko-party-games/index.html'),'utf8');
assert(bingo.includes('bingo-voice.js'),'Bingo voice asset missing');
const games=fs.readFileSync(path.join(root,'saiko-apps/index.html'),'utf8');
for(const file of pages.filter(x=>x.endsWith('/index.html')&&x!=='saiko-apps/index.html')){
 const dir=file.slice(0,-'index.html'.length);
 assert(games.includes('href="../'+dir+'"')||games.includes('href="../'+file+'"')||dir==='saiko-rhythm/'||dir==='lumi-nazotoki/'||dir==='lumi-escape/'||dir==='lumi-escape-2/',
 'Game hub missing '+file);
}
console.log('PASS: '+pages.length+' smartphone-friendly pages, '+local+' local links/assets and '+soundApps.length+' game sound engines');
console.log('PASS: sound test blocking detection, bingo Japanese speech module and portal integrity');
