#!/usr/bin/env python3
"""BASE-only publisher with durable write-ahead journal and remote reconciliation.

No create mutation is blindly retried after an ambiguous response. Failed Buffer
posts are retried by editing the SAME ID; never by creating a replacement.
"""
import argparse
import base64
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request,urlopen
from zoneinfo import ZoneInfo
from buffer_verify_channels import select_channels

REPO='selfwilled6412-cyber/base-iwakuni'
STATE_BRANCH='base-security-post-state'
STATE_PATH='marketing/scs/runtime/ledger.json'
CHANNELS={'youtube':'6a7d6d57b2d9d577436b9dd1','instagram':'6a7d4a0fb2d9d577436a99b0','tiktok':'6a7df1dab2d9d577436ec3f7'}
FIELDS='id text channelId status externalLink sentAt error { message }'
class Ambiguous(RuntimeError): pass
class Rejected(RuntimeError): pass

def now():return dt.datetime.now(dt.timezone.utc).isoformat()
def gql(query,variables=None,write=False):
    token=os.environ['BUFFER_API_TOKEN']
    for attempt in range(3 if not write else 1):
        req=Request('https://api.buffer.com',data=json.dumps({'query':query,'variables':variables or {}}).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
        try:
            with urlopen(req,timeout=60) as response: payload=json.load(response)
            if payload.get('errors'):
                # GraphQL messages only, no request/token echo.
                message='; '.join(str(e.get('message','GraphQL error'))[:500] for e in payload['errors'])
                raise Rejected(message)
            return payload.get('data') or {}
        except (HTTPError,URLError,TimeoutError,OSError):
            if write: raise Ambiguous('Mutation response unknown; reconcile before any further write') from None
            if attempt==2:raise RuntimeError('Buffer read failed after retries') from None
            time.sleep(3*(2**attempt))

def gh(args,input=None,check=True):
    p=subprocess.run(['gh',*args],input=json.dumps(input) if input is not None else None,text=True,capture_output=True)
    if check and p.returncode:raise RuntimeError('GitHub persistence/media operation failed: '+p.stderr[:250])
    return p

def api(path,body=None):
    args=['api',f'repos/{REPO}/{path}']
    if body is not None:args+=['--method','PUT','--input','-']
    p=gh(args,body);return json.loads(p.stdout)

class Journal:
    def __init__(self):
        ref=gh(['api',f'repos/{REPO}/git/ref/heads/{STATE_BRANCH}'],check=False)
        if ref.returncode:
            # Distinguish absence from auth/rate errors before attempting creation.
            if '404' not in ref.stderr:raise RuntimeError('Cannot read state branch')
            main=api('git/ref/heads/main')['object']['sha']
            gh(['api',f'repos/{REPO}/git/refs','--method','POST','--input','-'],{'ref':'refs/heads/'+STATE_BRANCH,'sha':main})
        existing=gh(['api',f'repos/{REPO}/contents/{STATE_PATH}?ref={STATE_BRANCH}'],check=False)
        self.sha=None;self.data={'version':1,'days':{}}
        if not existing.returncode:
            value=json.loads(existing.stdout);self.sha=value['sha'];self.data=json.loads(base64.b64decode(value['content']))
        elif '404' not in existing.stderr:raise RuntimeError('Cannot read journal')
    def save(self):
        self.data['updated_at']=now()
        body={'message':'Record BASE security publication state [skip ci]','branch':STATE_BRANCH,'content':base64.b64encode(json.dumps(self.data,ensure_ascii=False,indent=2).encode()).decode()}
        if self.sha:body['sha']=self.sha
        result=api('contents/'+STATE_PATH,body);self.sha=result['content']['sha']

def verify():
    account=gql('query { account { organizations { id } } }')
    channels=[]
    for org in account['account']['organizations']:
        channels+=gql('query { channels(input:{organizationId:'+json.dumps(org['id'])+'}) { id name displayName service organizationId isDisconnected isLocked isQueuePaused externalLink } }')['channels']
    selected=select_channels(channels)
    for service,c in selected.items():
        if c['id']!=CHANNELS[service]:raise RuntimeError('BASE channel ID mismatch: '+service)
        if c['isDisconnected'] or c['isLocked'] or c['isQueuePaused']:raise RuntimeError('BASE channel not ready: '+service)
    return selected

def posts_for(channel):
    result=[];cursor=None
    for page in range(100):
        query='query($input:PostsInput!,$after:String) { posts(first:100,after:$after,input:$input) { edges { node { '+FIELDS+' } } pageInfo { hasNextPage endCursor } } }'
        data=gql(query,{'input':{'organizationId':channel['organizationId'],'filter':{'channelIds':[channel['id']]}},'after':cursor})['posts']
        result += [edge['node'] for edge in data['edges'] or []]
        if not data['pageInfo']['hasNextPage']:return result
        cursor=data['pageInfo']['endCursor']
    raise RuntimeError('History pagination limit; cannot safely reconcile')

def matching(posts,marker):
    found=[p for p in posts if marker in p['text'].split()]
    if len(found)>1:raise RuntimeError('Duplicate marker detected; manual investigation required')
    return found[0] if found else None

def create_input(plan,service,url):
    meta={
      'youtube':{'title':plan['title'],'categoryId':'28','privacy':'public','madeForKids':False,'isAiGenerated':True},
      'instagram':{'type':'reel','shouldShareToFeed':True,'isAiGenerated':True},
      'tiktok':{'isAiGenerated':True}}[service]
    return {'text':plan['youtube_caption'] if service=='youtube' else plan['caption'],'channelId':CHANNELS[service],
       'schedulingType':'automatic','mode':'shareNow','needsApproval':False,'saveToDraft':False,'aiAssisted':True,
       'assets':[{'video':{'url':url}}],'metadata':{service:meta}}

def mutation(action,body):
    typ='CreatePostInput' if action=='createPost' else 'EditPostInput'
    query='mutation($input:'+typ+'!) { '+action+'(input:$input) { ... on PostActionSuccess { post { '+FIELDS+' } } ... on MutationError { message } } }'
    result=gql(query,{'input':body},write=True)[action]
    if not (result.get('post') or {}).get('id'):raise Rejected(result.get('message','Buffer rejected post'))
    return result['post']

def upload(plan,path):
    tag='base-security-'+plan['date']
    exists=gh(['release','view',tag,'--repo',REPO,'--json','assets'],check=False)
    if exists.returncode:
        gh(['release','create',tag,'--repo',REPO,'--target','main','--title','BASE Security '+plan['date'],'--notes','Public BASE PR video. Generated Japanese narration and original graphics.','--latest=false'])
        assets=[]
    else: assets=json.loads(exists.stdout)['assets']
    asset=next((a for a in assets if a['name']==path.name),None)
    if not asset:
        gh(['release','upload',tag,str(path),'--repo',REPO])
    release=json.loads(gh(['release','view',tag,'--repo',REPO,'--json','assets']).stdout)
    url=next(a['url'] for a in release['assets'] if a['name']==path.name)
    # Release JSON exposes the public browser_download_url as url.
    req=Request(url,headers={'Range':'bytes=0-1023'})
    with urlopen(req,timeout=60) as response:
        first=response.read(1024)
        if b'ftyp' not in first[:100]:raise RuntimeError('Hosted asset is not a reachable MP4')
    return url

def eligible_retry(entry,post):
    # Resubmit the same failed Buffer post at most 3 times, with 30 minute backoff.
    if post['status']!='error' or entry.get('retries',0)>=3:return False
    last=entry.get('last_attempt')
    return not last or (dt.datetime.now(dt.timezone.utc)-dt.datetime.fromisoformat(last)).total_seconds()>=1800

def ensure_review(journal, record, plan, path=None):
    from review_video import approved, review_video
    review=record.get('ai_review',{})
    if approved(review,record.get('sha256')):return True
    if review.get('status')=='rejected' or review.get('attempts',0)>=3:return False
    attempts=review.get('attempts',0)+1
    record['ai_review']={'status':'checking','attempts':attempts};journal.save()
    try:
        if path is None:
            # Older, already hosted but unfinished videos must also pass review.
            url=record.get('video_url','')
            prefix=f'https://github.com/{REPO}/releases/download/base-security-'
            if not url.startswith(prefix):raise RuntimeError('Untrusted review media URL')
            path=Path('marketing/scs/output/review')/plan['date']/(plan['id']+'.mp4')
            path.parent.mkdir(parents=True,exist_ok=True)
            with urlopen(url,timeout=90) as response:path.write_bytes(response.read(50_000_001))
            if path.stat().st_size>50_000_000:raise RuntimeError('Review video too large')
        sha=hashlib.sha256(path.read_bytes()).hexdigest()
        if record.get('sha256')!=sha:raise RuntimeError('Review video checksum mismatch')
        result=review_video(path,plan);result['attempts']=attempts
        record['ai_review']=result;journal.save()
        return approved(result,sha)
    except Exception as exc:
        # Never expose API request bodies or credentials in operational alerts.
        record['ai_review']={'status':'error','attempts':attempts,'error_type':type(exc).__name__}
        journal.save();return False

def process(journal,day,channels,allow_generate=True):
    from produce_video import make_plan,produce
    record=journal.data['days'].setdefault(day,{'plan':make_plan(day),'services':{}})
    plan=record['plan'];services=record['services'];failures=[]
    # Reconcile every channel before generation and before each mutation.
    for service,channel in channels.items():
        entry=services.setdefault(service,{})
        remote=matching(posts_for(channel),plan['marker'])
        if remote:
            entry['post']=remote;entry['state']=remote['status']
        elif entry.get('post') or entry.get('state')=='creating':
            entry['state']='uncertain';failures.append(service+': uncertain, will reconcile without duplicate create')
        journal.save()
    missing=[s for s,e in services.items() if not e.get('post') and e.get('state') not in ('creating','uncertain')]
    if missing and (record.get('ai_review',{}).get('status')=='rejected' or record.get('ai_review',{}).get('attempts',0)>=3):
        return ['AI quality review blocked publication; see ai_review in journal']
    if missing and allow_generate and not record.get('video_url'):
        path=produce(plan,Path('marketing/scs/output/published')/day)
        record['sha256']=hashlib.sha256(path.read_bytes()).hexdigest();journal.save()
        if not ensure_review(journal,record,plan,path):
            return ['AI quality review blocked publication; see ai_review in journal']
        record['video_url']=upload(plan,path);journal.save()
    needs_write=any(not e.get('post') or eligible_retry(e,e['post']) for e in services.values())
    if needs_write and not ensure_review(journal,record,plan):
        return ['AI quality review blocked publication; see ai_review in journal']
    for service,channel in channels.items():
        entry=services[service]
        try:
            post=entry.get('post')
            if post and eligible_retry(entry,post):
                entry['retries']=entry.get('retries',0)+1;entry['last_attempt']=now();journal.save()
                post=mutation('editPost',{'id':post['id'],'mode':'shareNow','schedulingType':'automatic','saveToDraft':False})
                entry['post']=post;entry['state']=post['status'];journal.save()
            elif not post and entry.get('state') not in ('creating','uncertain') and record.get('video_url'):
                # One final remote read followed by write-ahead intent persisted BEFORE create.
                remote=matching(posts_for(channel),plan['marker'])
                if remote:entry['post']=remote;entry['state']=remote['status'];journal.save();continue
                entry['state']='creating';entry['last_attempt']=now();journal.save()
                try:post=mutation('createPost',create_input(plan,service,record['video_url']))
                except Rejected as exc:
                    entry['state']='rejected';entry['error']=str(exc)[:500];journal.save();raise
                entry['post']=post;entry['state']=post['status'];journal.save()
        except (Ambiguous,Rejected) as exc:
            entry['error']=str(exc)[:500];journal.save();failures.append(service+': '+str(exc))
    # Poll boundedly; hourly monitor continues after this job.
    for attempt in range(int(os.getenv('BASE_POLL_ATTEMPTS','6'))):
        active=False
        for service,channel in channels.items():
            entry=services[service];remote=matching(posts_for(channel),plan['marker'])
            if remote:
                entry['post']=remote;entry['state']=remote['status']
                active |= remote['status'] in ('scheduled','sending')
        journal.save()
        if not active:break
        time.sleep(20)
    for s,e in services.items():
        p=e.get('post',{});print(day,s,e.get('state','missing'),p.get('externalLink') or '',flush=True)
        if p.get('status')!='sent':failures.append(s+': '+e.get('state','missing')+' '+str(p.get('error') or e.get('error') or ''))
    return failures

def report(journal,failures):
    lines=['# BASE Security automatic publishing',f'Checked: {now()}','', '| Date | Service | Status | Public link |','|---|---|---|---|']
    for day,rec in sorted(journal.data['days'].items(),reverse=True)[:14]:
        for s,e in rec['services'].items():
            p=e.get('post',{});url=p.get('externalLink') or ''
            lines.append(f"| {day} | {s} | {e.get('state','missing')} | {url} |")
    if failures: lines+=['','## Needs attention',*failures]
    text='\n'.join(lines)+'\n'
    Path('marketing/scs/output').mkdir(exist_ok=True,parents=True)
    Path('marketing/scs/output/publication-status.md').write_text(text)
    summary=os.getenv('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary,'a') as f:f.write(text)
    # One live issue serves as the persistent incident dashboard; no repeated issues.
    title='BASE security auto-publishing: operational alert'
    issues=json.loads(gh(['issue','list','--repo',REPO,'--state','open','--search',title+' in:title','--json','number,title']).stdout)
    issue=next((i for i in issues if i['title']==title),None)
    body='marketing/scs/output/publication-status.md'
    if failures:
        gh(['issue','edit',str(issue['number']),'--repo',REPO,'--body-file',body] if issue else ['issue','create','--repo',REPO,'--title',title,'--body-file',body])
    elif issue:gh(['issue','close',str(issue['number']),'--repo',REPO,'--reason','completed'])

def main():
    a=argparse.ArgumentParser();a.add_argument('--verify',action='store_true');a.add_argument('--force-today',action='store_true');args=a.parse_args()
    if os.getenv('GITHUB_REPOSITORY')!=REPO:raise SystemExit('Refusing outside BASE repository')
    channels=verify()
    if args.verify:
        print('Verified exact 3 BASE channel IDs and connection health');return
    journal=Journal();current=dt.datetime.now(ZoneInfo('Asia/Tokyo'));today=current.date().isoformat()
    failures=[]
    # Reconcile unfinished days; sent days remain in durable journal forever.
    for day,rec in list(journal.data['days'].items()):
        if day!=today and any(e.get('state')!='sent' for e in rec['services'].values()):
            failures+=process(journal,day,channels)
    if args.force_today or current.hour>=10 or today in journal.data['days']:
        failures+=process(journal,today,channels)
    journal.data['last_health_check']=now();journal.save();report(journal,failures)
    if failures:raise SystemExit('Some channels are not confirmed sent; see operational alert and journal')

if __name__=='__main__':main()
