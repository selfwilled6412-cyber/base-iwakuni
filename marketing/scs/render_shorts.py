#!/usr/bin/env python3
"""Create two 9:16 BASE-only text-motion Shorts drafts. No upload or posting."""
import argparse, json, math, subprocess, tempfile, wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 720, 1280
FONT_PATHS = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
]

def font(size):
    for f in FONT_PATHS:
        if Path(f).exists():
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()

def split_lines(text, max_chars=12):
    result=[]
    for paragraph in text.split("\n"):
        if not paragraph:
            continue
        while len(paragraph)>max_chars:
            result.append(paragraph[:max_chars]); paragraph=paragraph[max_chars:]
        result.append(paragraph)
    return result

def draw_scene(text, index, output):
    img=Image.new("RGB",(W,H))
    d=ImageDraw.Draw(img)
    for y in range(H):
        rate=y/H
        d.line([(0,y),(W,y)],fill=(int(3+8*rate),int(19+10*rate),int(36+26*rate)))
    d.ellipse((-220,140,550,910),outline=(17,88,122),width=2)
    d.ellipse((300,-90,1100,660),outline=(19,103,142),width=2)
    d.ellipse((80,400,820,1200),outline=(16,70,99),width=2)
    d.rounded_rectangle((40,48,680,145),radius=25,fill=(11,42,63),outline=(75,197,237),width=2)
    d.text((71,77),"BASE / SECURITY",font=font(34),fill=(195,248,255))
    d.rounded_rectangle((50,360,670,910),radius=32,fill=(8,33,51),outline=(46,178,218),width=3)
    d.rounded_rectangle((65,379,655,392),radius=5,fill=(74,217,238))
    lines=split_lines(text)
    size=66 if max(map(len,lines))<=12 and len(lines)<=3 else (52 if len(lines)<=5 else 44)
    f=font(size)
    line_h=int(size*1.48)
    top=620-(len(lines)*line_h)//2
    for k,line in enumerate(lines):
        bb=d.textbbox((0,0),line,font=f)
        width=bb[2]-bb[0]
        d.text(((W-width)//2,top+k*line_h),line,font=f,fill=(244,252,255),stroke_width=1,stroke_fill=(13,61,86))
    d.text((60,1010),"IWAKUNI • CORPORATE SECURITY",font=font(24),fill=(113,202,224))
    d.text((60,1105),"サイバー対策・SCS制度準備の相談",font=font(31),fill=(217,237,249))
    d.text((60,1170),"詳細は動画説明欄のURLへ",font=font(26),fill=(166,206,222))
    d.text((560,1170),f"{index+1:02d}/06",font=font(26),fill=(129,243,250))
    img.save(output)

def audio_wave(path,seconds=30,rate=22050):
    # Original soft ambient sequence, no third-party samples.
    freqs=(164.81,246.94,329.63)
    with wave.open(str(path),"wb") as wf:
        wf.setnchannels(1);wf.setsampwidth(2);wf.setframerate(rate)
        frames=bytearray()
        for i in range(rate*seconds):
            t=i/rate
            env=min(1,t/.7,(seconds-t)/1.5)
            pulse=.64+.18*math.sin(2*math.pi*.11*t)
            sample=sum(math.sin(2*math.pi*f*t+math.sin(2*math.pi*.07*t)*.08) for f in freqs)/3
            s=int(max(-1,min(1,sample*.065*max(0,env)*pulse))*32767)
            frames += s.to_bytes(2,"little",signed=True)
        wf.writeframes(frames)

def render_post(post,out):
    with tempfile.TemporaryDirectory(prefix="base-scs-short-") as temp:
        temp=Path(temp)
        images=[]
        for i,text in enumerate(post["short"]["slides"]):
            path=temp/f"scene-{i:02d}.png";draw_scene(text,i,path);images.append(path)
        # Single image per 5-second interval. This avoids huge intermediate frame files.
        sequence=temp/"slides.txt"
        sequence.write_text("\n".join([f"file '{p}'\nduration 5" for p in images]+[f"file '{images[-1]}'"])+"\n",encoding="utf-8")
        sound=temp/"original_ambient.wav";audio_wave(sound)
        mp4=out/(post["id"]+".mp4")
        subprocess.run([
            "ffmpeg","-hide_banner","-loglevel","error","-y",
            "-f","concat","-safe","0","-i",str(sequence),
            "-i",str(sound),"-t","30","-vf","fps=24,format=yuv420p",
            "-c:v","libx264","-preset","veryfast","-crf","25",
            "-c:a","aac","-b:a","96k",
            "-movflags","+faststart","-shortest",str(mp4)
        ],check=True,timeout=150)
        print("Created draft MP4:",mp4,mp4.stat().st_size,"bytes")

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--bundle",help="Path to bundle.json; default newest output")
    args=parser.parse_args()
    matches=sorted(Path("marketing/scs/output").glob("*/bundle.json"))
    bundle=Path(args.bundle) if args.bundle else (matches[-1] if matches else None)
    if bundle is None:raise SystemExit("Run scs_draft_factory.py first")
    data=json.loads(bundle.read_text(encoding="utf-8"))
    assert data["mode"]=="DRAFT_ONLY_NO_POSTING" and data["brand"]=="株式会社BASE"
    for post in data["posts"]:render_post(post,bundle.parent)
if __name__=="__main__": main()
