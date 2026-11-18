#!/usr/bin/env python3
"""BASE-only cinematic ad editor: moving B-roll + Japanese narration + contact CTA.

Requires properly licensed footage. Produces a local MP4, never publishes or
connects to Buffer. Existing daily publisher remains unchanged until reviewed.
"""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFont

BRAND = '株式会社BASE'
LANDING = 'https://selfwilled6412-cyber.github.io/base-iwakuni/security/scs/'
FONTS = [
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc',
]


def font(size):
    for name in FONTS:
        if Path(name).is_file():
            return ImageFont.truetype(name, size)
    return ImageFont.truetype('DejaVuSans-Bold.ttf', size)


def run(args):
    return subprocess.run(args, capture_output=True, text=True,
                          check=True, timeout=360)


def probe(file):
    data = run(['ffprobe', '-v', 'error', '-show_format', '-show_streams',
                '-of', 'json', str(file)]).stdout
    return json.loads(data)


def wrapped(draw, content, f, width):
    result = []
    for paragraph in content.split('\n'):
        line = ''
        for character in paragraph:
            test = line + character
            if line and draw.textbbox((0, 0), test, font=f)[2] > width:
                result.append(line)
                line = character
            else:
                line = test
        if line:
            result.append(line)
    return result


def make_overlay(dest, size, heading, index, count, cta=False):
    w, h = size
    im = Image.new('RGBA', size)
    pix = im.load()
    # Transparent filmic vignette, live action stays visible in the center.
    for y in range(h):
        a = int(165 * max(0, 1-y/(h*.35), (y/h-.7)/.3))
        if a:
            for x in range(w):
                pix[x, y] = (0, 8, 20, a)
    draw = ImageDraw.Draw(im)
    left = int(w*.075)
    cyan = (90, 235, 247, 255)
    white = (244, 249, 255, 255)
    draw.rounded_rectangle((left, int(h*.065), left+int(w*.24),
                            int(h*.112)), radius=5, fill=(50, 194, 211, 250))
    draw.text((left+9, int(h*.067)), 'BASE', font=font(int(w*.062)),
              fill=(4, 25, 34, 255))
    draw.text((left, int(h*.13)), 'BUSINESS SECURITY / IWAKUNI',
              font=font(int(w*.034)), fill=cyan)
    title_font = font(int(w*.080))
    y = int(h*(.59 if cta else .69))
    for line in wrapped(draw, heading, title_font, w-left*2)[:3]:
        draw.text((left, y), line, font=title_font, fill=white,
                  stroke_width=max(1,int(w*.003)), stroke_fill=(0, 13, 22))
        y += int(w*.109)
    if cta:
        draw.text((left,int(h*.785)), '法人のセキュリティ相談',
                  font=font(int(w*.038)),fill=cyan)
        draw.text((left,int(h*.83)), 'BASE 公式サイトへ',
                  font=font(int(w*.045)),fill=white)
    draw.line((left,int(h*.944),left+(w-left*2)*(index+1)/count,
               int(h*.944)),width=max(3,int(w*.009)),fill=cyan)
    im.save(dest)


def render(clips, narration, output, size=(1080,1920),
           seconds_per_clip=5.0, cta_seconds=3.0):
    if len(clips)<3:
        raise ValueError('At least three distinct moving video shots are required')
    if not 2<=seconds_per_clip<=10 or not 2<=cta_seconds<=5:
        raise ValueError('Invalid scene duration')
    for clip in clips:
        if not Path(clip).is_file():
            raise FileNotFoundError(clip)
        if not any(s['codec_type']=='video' for s in probe(clip)['streams']):
            raise ValueError('Video stream missing')
    if not Path(narration).is_file():
        raise FileNotFoundError('Narration must exist')
    if not any(s['codec_type']=='audio' for s in probe(narration)['streams']):
        raise ValueError('Narration audio stream missing')
    w,h = size
    output=Path(output)
    output.parent.mkdir(parents=True,exist_ok=True)
    headlines=['その共有設定、\n大丈夫ですか？',
               '大切な取引先情報を、\n守るために。',
               'まずは現状を確認。\n対策の優先順位を。']
    with tempfile.TemporaryDirectory(prefix='base-cinematic-') as t:
        temp=Path(t)
        parts=[]
        for idx,clip in enumerate(list(clips)+[clips[-1]]):
            last=idx==len(clips)
            name=temp/('cta.png' if last else f'heading-{idx}.png')
            make_overlay(name,size,'株式会社BASE\nまずは無料相談' if last
                         else headlines[idx%len(headlines)],
                         idx,len(clips)+1,cta=last)
            dest=temp/f'part-{idx}.mp4'
            seconds=cta_seconds if last else seconds_per_clip
            filt=(f'[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,'
                  f'crop={w}:{h},eq=contrast=1.05:saturation=.93,'
                  'format=rgba[shot];'
                  '[shot][1:v]overlay=0:0:format=auto,'
                  'format=yuv420p[out]')
            run(['ffmpeg','-nostdin','-v','error','-y',
                 '-stream_loop','-1','-i',str(clip),
                 '-loop','1','-i',str(name),
                 '-filter_complex',filt,'-map','[out]','-t',str(seconds),
                 '-an','-r','24','-c:v','libx264','-preset','veryfast',
                 '-crf','22','-pix_fmt','yuv420p',str(dest)])
            parts.append(dest)
        concat=temp/'parts.txt'
        concat.write_text(''.join("file '"+str(p)+"'\n" for p in parts))
        total=len(clips)*seconds_per_clip+cta_seconds
        # Original royalty-free ambient underscoring: do not leave a silent tail.
        from render_shorts import audio_wave
        bed = temp / 'original-ambient.wav'
        audio_wave(bed, seconds=int(total)+1)
        run(['ffmpeg','-nostdin','-v','error','-y',
             '-f','concat','-safe','0','-i',str(concat),
             '-i',str(narration),'-i',str(bed),
             '-filter_complex',(
                 f'[1:a]apad,atrim=0:{total},loudnorm=I=-16:TP=-1.5:LRA=9[n];'
                 f'[2:a]atrim=0:{total},volume=0.45,'
                 f'afade=t=out:st={max(0,total-1.5)}:d=1.5[b];'
                 '[n][b]amix=inputs=2:duration=first:normalize=0,'
                 'alimiter=limit=0.94[a]'),
             '-map','0:v','-map','[a]','-c:v','copy','-c:a','aac',
             '-b:a','160k','-movflags','+faststart',str(output)])
    info=probe(output)
    video=next(s for s in info['streams'] if s['codec_type']=='video')
    audio=next(s for s in info['streams'] if s['codec_type']=='audio')
    assert (video['width'],video['height'])==size
    assert audio['codec_name']=='aac'
    assert abs(float(info['format']['duration'])-total)<.7
    assert output.stat().st_size>10000
    return {'output':str(output),'duration':total,'brand':BRAND,
            'lead_page':LANDING,'video_shots':len(clips),
            'narrated':True,'prototype_only':True}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--clip',action='append',required=True,
                        help='Use 3+ rights-cleared moving video shots')
    parser.add_argument('--narration',required=True)
    parser.add_argument('--output',required=True)
    parser.add_argument('--size',default='1080x1920')
    parser.add_argument('--seconds-per-clip',type=float,default=5)
    parser.add_argument('--cta-seconds',type=float,default=3)
    args=parser.parse_args()
    size=tuple(int(part) for part in args.size.split('x'))
    if len(size)!=2 or min(size)<180:
        parser.error('Invalid output resolution')
    print(json.dumps(render(args.clip,args.narration,args.output,size,
                            args.seconds_per_clip,args.cta_seconds),
                     ensure_ascii=False,indent=2))


if __name__=='__main__':
    main()
