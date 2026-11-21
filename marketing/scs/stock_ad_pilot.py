#!/usr/bin/env python3
"""BASE cinematic stock-video pilot: rights-cleared footage and safe 3-channel publishing."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from cinematic_cut import render, probe

DAY = '2026-11-19'
PILOT = 'base-cinematic-pilot-20261119'
MARKER = '#BASE対策CINEMA20261119'
URL = 'https://selfwilled6412-cyber.github.io/base-iwakuni/security/scs/'
STOCK = [
    ('https://videos.pexels.com/video-files/33315143/14188176_1440_2560_25fps.mp4',
     'https://www.pexels.com/video/modern-workspace-with-neon-coding-setup-33315143/', 'Jakub Zerdzicki'),
    ('https://videos.pexels.com/video-files/27385370/12131767_1440_2560_24fps.mp4',
     'https://www.pexels.com/video/a-person-typing-on-a-laptop-keyboard-27385370/', 'Diyorbek Mirzamakhmudov'),
    ('https://videos.pexels.com/video-files/7591938/7591938-hd_1080_1920_25fps.mp4',
     'https://www.pexels.com/video/a-woman-typing-on-her-computer-keyboard-7591938/', 'Pavel Danilyuk'),
]
NARRATION = ('取引先の情報を守る準備、できていますか。'
             '共有設定やバックアップは、後回しになりがちです。'
             'まずは現状を整理し、対策の優先順位を。'
             '専任の担当者がいなくても、できることから始められます。'
             '株式会社ベースが、お手伝いします。ご相談は公式サイトへ。')
caption = ('【法人向け｜情報セキュリティ】共有設定やバックアップ、最後に確認したのはいつですか？\n'
           '株式会社BASE（山口県岩国市）が現状整理と対策の優先順位づけをご支援します。\n'
           'ご相談：'+URL+'\n'
           '映像素材：Pexels（Jakub Zerdzicki / Diyorbek Mirzamakhmudov / Pavel Danilyuk）\n'
           '音声：VOICEVOX 四国めたん。出演者はBASE関係者ではありません。\n'
           '#情報セキュリティ #岩国市 #中小企業 '+MARKER)
PLAN = dict(date=DAY,id=PILOT,marker=MARKER,
            title='取引先情報を守る、最初の一歩｜株式会社BASE #Shorts',
            caption=caption,youtube_caption=caption+'\n'+URL)

def retrieve(url, target):
    if urlparse(url).scheme!='https' or urlparse(url).hostname!='videos.pexels.com':
        raise ValueError('Only approved Pexels downloads are permitted')
    with urlopen(Request(url,headers={'User-Agent':'BASE-marketing/1.0'}),timeout=90) as src:
        if urlparse(src.geturl()).hostname!='videos.pexels.com':
            raise RuntimeError('Unsafe redirect')
        total=0
        with target.open('wb') as dst:
            while chunk:=src.read(1024*1024):
                total+=len(chunk)
                if total>140_000_000:
                    raise RuntimeError('Oversized footage')
                dst.write(chunk)
    with target.open('rb') as src:
        if b'ftyp' not in src.read(64):
            raise RuntimeError('Not an MP4')
    if float(probe(target)['format']['duration'])<6.5:
        raise RuntimeError('Source clip too short')

def preview(folder):
    from produce_video import voice,ensure_voice_engine,duration
    from review_video import free_review_video
    folder=Path(folder)
    folder.mkdir(parents=True,exist_ok=True)
    clips=[]
    for i,(url,page,creator) in enumerate(STOCK):
        dest=folder/('shot-%d.mp4'%i)
        if not dest.exists():
            retrieve(url,dest)
        clips.append(str(dest))
    ensure_voice_engine()
    narration=folder/'voice.wav'
    voice(NARRATION,narration)
    seconds=duration(narration)
    if not 13<seconds<23:
        raise RuntimeError('Japanese narration length outside supported film timeline: '+str(seconds))
    mp4=folder/(PILOT+'.mp4')
    # Align the end of the film with the *measured* VOICEVOX narration.
    # A fixed 4.5s x 3 + 3s cut truncated the spoken closing CTA.
    cta_seconds=3.0
    scene_seconds=(seconds+0.65-cta_seconds)/len(clips)
    if not 2 <= scene_seconds <= 10:
        raise RuntimeError('Narration cannot fit cinematic scene limits: '+str(seconds))
    report=render(clips,str(narration),str(mp4),
                  seconds_per_clip=scene_seconds,cta_seconds=cta_seconds)
    review=free_review_video(mp4,PLAN)
    if review['decision']!='pass':
        raise RuntimeError('Media technical quality check failed')
    # A cinematic ad must end near the spoken CTA rather than linger in silence.
    trailing=report['duration']-seconds
    if trailing<0 or trailing>1.8:
        raise RuntimeError('Video ends too far from Japanese voiceover: '+str(trailing))
    report['trailing_silence_seconds']=round(trailing,2)
    report['review']=review
    report['sources']=[{'url':page,'creator':creator} for _,page,creator in STOCK]
    report['voice_duration']=seconds
    (folder/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    for n,t in enumerate((2,report['duration']*.33,report['duration']*.66,report['duration']-.65)):
        subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-ss',str(t),'-i',str(mp4),
                        '-frames:v','1',str(folder/f'frame-{n+1}.jpg')],check=True,timeout=60)
    print('Preview generated:',mp4, 'speech seconds', seconds)
    return mp4,review

def publish(folder):
    import buffer_publish_video as bp
    if os.environ.get('GITHUB_REPOSITORY')!=bp.REPO:
        raise RuntimeError('Refusing to publish outside BASE repository')
    channels=bp.verify()
    bp.STATE_PATH='marketing/scs/runtime/cinematic-pilot-ledger.json'
    ledger=bp.Journal()
    rec=ledger.data['days'].setdefault(PILOT,{'plan':PLAN,'services':{}})
    if rec['plan']['marker']!=MARKER:
        raise RuntimeError('Durable campaign marker mismatch')
    services=rec['services']
    issues=[]
    for name,channel in channels.items():
        entry=services.setdefault(name,{})
        found=bp.matching(bp.posts_for(channel),MARKER)
        if found:
            entry['post']=found;entry['state']=found['status']
        elif entry.get('post') or entry.get('state')=='creating':
            entry['state']='uncertain'
            issues.append(name+': ambiguous prior post; no duplicate creation')
        ledger.save()
    if all(services[n].get('post',{}).get('status')=='sent' for n in channels):
        print('Already published on all three BASE channels: no duplicates')
        return
    if not rec.get('video_url'):
        film,review=preview(folder)
        rec['sha256']=hashlib.sha256(film.read_bytes()).hexdigest()
        rec['technical_review']=review
        ledger.save()
        rec['video_url']=bp.upload(PLAN,film)
        ledger.save()
    for name,channel in channels.items():
        entry=services[name]
        if entry.get('post') or entry.get('state') in ('creating','uncertain'):
            continue
        remote=bp.matching(bp.posts_for(channel),MARKER)
        if remote:
            entry['post']=remote;entry['state']=remote['status'];ledger.save()
            continue
        entry['state']='creating';entry['last_attempt']=bp.now();ledger.save()
        try:
            post=bp.mutation('createPost',bp.create_input(PLAN,name,rec['video_url']))
        except bp.Rejected as e:
            entry['state']='rejected';entry['error']=str(e)[:200]
            ledger.save();issues.append(name+': Buffer rejected');continue
        except bp.Ambiguous:
            issues.append(name+': unknown outcome, requires remote reconciliation');continue
        entry['post']=post;entry['state']=post['status'];ledger.save()
    for attempt in range(5):
        active=False
        for name,channel in channels.items():
            remote=bp.matching(bp.posts_for(channel),MARKER)
            if remote:
                entry=services[name]
                entry['post']=remote;entry['state']=remote['status']
                active|=remote['status'] in ('scheduled','sending')
        ledger.save()
        if not active:break
        time.sleep(20)
    for name in channels:
        entry=services[name]
        post=entry.get('post') or {}
        print(name,entry.get('state','missing'),post.get('externalLink',''))
        if post.get('status')!='sent':
            issues.append(name+': not confirmed sent')
    if issues:
        raise RuntimeError('; '.join(issues))

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--preview',action='store_true')
    p.add_argument('--out',default='marketing/scs/output/cinematic-pilot')
    args=p.parse_args()
    if args.preview:preview(args.out)
    else:publish(args.out)
