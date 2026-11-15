#!/usr/bin/env python3
"""Narrated, captioned 1080x1920 BASE security mini-lessons."""
import asyncio
import datetime as dt
import json
import math
import os
from pathlib import Path
import subprocess
import time
import urllib.request
from PIL import Image, ImageDraw, ImageFont
from scs_draft_factory import TIPS, SECTORS, tracked, IPA

W,H=1080,1920
FONT='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
def font(n): return ImageFont.truetype(FONT,n)
def run(*args): return subprocess.check_output(args).decode().strip()
def duration(path): return float(run('ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(path)))
def wrap(text,size,width):
    lines=['']
    f=font(size)
    for ch in text:
        if ch=='\n': lines.append('');continue
        if ch in '、。？！）」』' and lines[-1]:
            lines[-1]+=ch;continue
        if f.getlength(lines[-1]+ch)>width: lines.append('')
        lines[-1]+=ch
    return lines

def make_plan(day):
    date=dt.date.fromisoformat(day)
    seq=(date-dt.date(2026,11,15)).days % (len(TIPS)*len(SECTORS))
    topic,risk,action=TIPS[seq%len(TIPS)]
    sector,asset=SECTORS[seq//len(TIPS)]
    scenes=[
      {'label':'その設定、大丈夫？','headline':topic+'を\n見直そう','voice':f'{sector}の皆さん。今日は、{topic}のチェックです。','kind':'shield'},
      {'label':'見落としがちなリスク','headline':risk,'voice':f'{risk}。思い当たることはありませんか。','kind':'risk'},
      {'label':'今日のアクション','headline':action,'voice':f'まずは、{action}。','kind':'check'},
      {'label':'小さな確認が、大きな備えに','headline':'担当を決める。\n実施を確かめる。','voice':'担当者と確認する日を決めて、実施できたかも確かめましょう。','kind':'check'},
      {'label':'岩国市の法人・店舗の皆さまへ','headline':'会社の情報を守る\n最初の一歩を。','voice':'岩国市の株式会社ベースが、サイバー対策の現状整理をお手伝いします。ご相談は公式LINEから。','kind':'shield'}]
    marker='#BASE対策'+day.replace('-','')
    caption=f'【{sector}の{topic}】\n{action}。\n株式会社BASE（岩国市）｜法人・店舗のサイバー対策の現状整理を支援します。\nご相談は公式LINEから：https://lin.ee/z5T92Yn\nAI音声・図解を使用。音声：VOICEVOX 四国めたん。\n#岩国市 #中小企業 #情報セキュリティ {marker}'
    return {'date':day,'id':'base-security-'+day,'marker':marker,'title':f'{topic}、見直していますか？｜株式会社BASE #Shorts',
            'caption':caption,'youtube_caption':caption+'\nご相談：'+tracked('youtube')+'\n参考：IPA '+IPA,
            'scenes':scenes,'brand':'株式会社BASE'}

def draw(scene,index,path):
    img=Image.new('RGB',(W,H));d=ImageDraw.Draw(img)
    for y in range(H):
        t=y/H; d.line((0,y,W,y),fill=(int(7+6*t),int(17+14*t),int(35+24*t)))
    for x in range(-300,1600,90): d.line((x,0,x-600,H),fill=(14,36,56),width=1)
    accent=(249,172,80) if scene['kind']=='risk' else (80,231,213)
    d.ellipse((620,-230,1370,520),outline=(25,66,83),width=2)
    d.text((86,103),'BASE',font=font(70),fill='white')
    d.text((302,123),'SECURITY NOTE',font=font(30),fill=accent)
    d.rounded_rectangle((86,224,994,294),radius=20,fill=(19,53,68))
    d.text((112,239),scene['label'],font=font(31),fill=accent)
    # A large original vector-style visual, no stock or third-party imagery.
    cx,cy=540,555
    d.ellipse((342,357,738,753),fill=(15,42,59),outline=(28,84,99),width=3)
    if scene['kind']=='risk':
        d.polygon([(cx,cy-128),(cx-140,cy+112),(cx+140,cy+112)],outline=accent,width=10)
        d.rounded_rectangle((cx-9,cy-55,cx+9,cy+37),radius=8,fill=accent);d.ellipse((cx-10,cy+64,cx+10,cy+84),fill=accent)
    elif scene['kind']=='check':
        d.rounded_rectangle((cx-100,cy-115,cx+100,cy+115),radius=24,outline=accent,width=9)
        d.line([(cx-60,cy),(cx-13,cy+45),(cx+67,cy-45)],fill=accent,width=17)
    else:
        d.polygon([(cx,cy-142),(cx+120,cy-95),(cx+100,cy+65),(cx,cy+140),(cx-100,cy+65),(cx-120,cy-95)],outline=accent,width=9)
        d.arc((cx-35,cy-59,cx+35,cy+23),180,360,fill='white',width=9)
        d.rounded_rectangle((cx-48,cy-15,cx+48,cy+65),radius=12,fill=accent)
    lines=wrap(scene['headline'],73,900)
    if len(lines)>4: lines=wrap(scene['headline'],62,900);size=62
    else: size=73
    y=830
    for line in lines:
        d.text((90,y),line,font=font(size),fill=(246,250,255));y+=size+24
    # Full spoken captions, in the social safe zone above platform controls.
    d.rounded_rectangle((70,1320,1010,1625),radius=30,fill=(14,40,57),outline=(39,83,101),width=2)
    captions=wrap(scene['voice'],39,860)
    assert len(captions)<=5, captions
    for i,line in enumerate(captions): d.text((110,1350+i*49),line,font=font(39),fill=(221,240,247))
    d.text((90,1660),'株式会社BASE  /  岩国市',font=font(32),fill=(146,185,204))
    d.text((90,1710),'音声：VOICEVOX 四国めたん',font=font(22),fill=(146,185,204))
    if index==4: d.text((90,1160),'公式LINE  lin.ee/z5T92Yn',font=font(43),fill=accent)
    for n in range(5): d.rounded_rectangle((90+n*180,1760,245+n*180,1767),radius=3,fill=accent if n<=index else (35,58,74))
    img.save(path)

def voice(text,path):
    # Official local VOICEVOX engine: no paid key or external speech endpoint.
    from urllib.parse import urlencode
    endpoint='http://127.0.0.1:50021'
    for attempt in range(3):
        try:
            query_url=endpoint+'/audio_query?'+urlencode({'text':text,'speaker':2})
            with urllib.request.urlopen(urllib.request.Request(query_url,data=b'',method='POST'),timeout=45) as r:
                query=json.load(r)
            query['speedScale']=1.08
            query['intonationScale']=1.0
            req=urllib.request.Request(endpoint+'/synthesis?speaker=2',data=json.dumps(query).encode(),headers={'Content-Type':'application/json'})
            with urllib.request.urlopen(req,timeout=90) as r: path.write_bytes(r.read())
            assert path.stat().st_size>2000 and duration(path)>1
            return
        except Exception:
            if attempt==2: raise RuntimeError('Japanese narration unavailable; refusing an unvoiced video') from None
            time.sleep(3*(attempt+1))

def ensure_voice_engine():
    try:
        urllib.request.urlopen('http://127.0.0.1:50021/version',timeout=3)
        return
    except Exception:
        subprocess.run(['docker','run','-d','--name','base-voice','-p','127.0.0.1:50021:50021','voicevox/voicevox_engine@sha256:46fe4ddaef27e8bfc2ff4f9709d27f3e38e295d405c5f9351d7c62056e0b4ca7'],check=True,timeout=420)
    for attempt in range(60):
        try:
            urllib.request.urlopen('http://127.0.0.1:50021/version',timeout=3)
            return
        except Exception: time.sleep(2)
    raise RuntimeError('Local Japanese speech engine failed to start')

def produce(plan,out,voice_fn=voice):
    if voice_fn is voice: ensure_voice_engine()
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    (out/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2))
    parts=[];total=0
    for i,scene in enumerate(plan['scenes']):
        image=out/f'scene-{i}.png';audio=out/f'voice-{i}.wav';part=out/f'part-{i}.mp4'
        draw(scene,i,image);voice_fn(scene['voice'],audio)
        seconds=duration(audio)+.45;total+=seconds
        subprocess.run(['ffmpeg','-v','error','-y','-loop','1','-i',str(image),'-i',str(audio),'-t',str(seconds),
          '-vf',"scale=1120:1992,crop=1080:1920:x='20+12*sin(t*0.6)':y='36+18*sin(t*0.4)',fps=30,format=yuv420p",
          '-af','apad=pad_dur=0.45,loudnorm=I=-16:TP=-1.5:LRA=9','-c:v','libx264','-preset','veryfast','-crf','21',
          '-c:a','aac','-ar','48000','-ac','2','-b:a','160k','-movflags','+faststart',str(part)],check=True,timeout=180)
        parts.append(part.resolve())
    assert 15<total<90, total
    listing=out/'parts.txt';listing.write_text(''.join(f"file '{p}'\n" for p in parts))
    from render_shorts import audio_wave
    bed=out/'original_ambient.wav';audio_wave(bed,seconds=math.ceil(total)+1)
    dest=out/(plan['id']+'.mp4')
    subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(listing),'-i',str(bed),'-filter_complex','[0:a][1:a]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.94[a]','-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','160k','-movflags','+faststart',str(dest)],check=True,timeout=60)
    probe=json.loads(run('ffprobe','-v','error','-show_streams','-show_format','-of','json',str(dest)))
    video=next(s for s in probe['streams'] if s['codec_type']=='video');audio=next(s for s in probe['streams'] if s['codec_type']=='audio')
    assert (video['width'],video['height'])==(W,H) and audio['codec_name']=='aac'
    assert abs(float(probe['format']['duration'])-total)<1 and dest.stat().st_size>100000
    (out/'quality.json').write_text(json.dumps({'width':W,'height':H,'seconds':total,'narrated':True,'bytes':dest.stat().st_size},indent=2))
    return dest

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--date',default=dt.date.today().isoformat());p.add_argument('--out',default='/tmp/base-preview');args=p.parse_args()
    print(produce(make_plan(args.date),args.out))
