"""Add readable BASE headings and provider-timed captions to an existing LUMI video.

Requires FFmpeg with libass. Preserves source audio and source watermark; no AI generation.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess


def ass_time(value):
    h, m, s, ms = map(int, re.split('[:,]', value))
    return f'{h}:{m:02}:{s:02}.{ms // 10:02}'


def make_ass(srt):
    lines = ['''[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Droid Sans Fallback,30,&H00FFFFFF,&H0000FFFF,&H00110702,&H700C0804,-1,0,0,0,100,100,0,0,1,3,1,2,48,72,180,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text''']
    def event(layer, start, end, text):
        lines.append(f'Dialogue: {layer},{start},{end},Default,,0,0,0,,{text}')
    event(1, '0:00:00.00', '0:00:22.32', r'{\an7\pos(54,100)\fs22\c&HFFF0B2&\fad(180,0)}BASE  /  ルミの仕事相談')
    event(1, '0:00:00.00', '0:00:22.32', r'{\an7\pos(50,149)\fs54\bord2\fad(180,0)}会社の電話を')
    event(0, '0:00:00.00', '0:00:22.32', r'{\an7\pos(50,222)\fs64\c&HFFF0B2&\bord10\blur14\1a&H90&\3c&HFF963A&\fad(180,0)}スマホでも。')
    event(1, '0:00:00.00', '0:00:22.32', r'{\an7\pos(50,222)\fs64\c&HFFF0B2&\bord1\fad(180,0)}スマホでも。')
    event(1, '0:00:00.00', '0:00:22.32', r'{\an7\pos(54,313)\fs22\c&HD6B9A6&}クラウドPBXという選択肢')
    event(1, '0:00:00.00', '0:00:22.32', r'{\an7\pos(54,1132)\fs24\c&HFFF0B2&}会社の電話の相談は、株式会社BASEへ')
    count = 0
    for block in re.split(r'\n\s*\n', srt.strip()):
        parts = block.strip().splitlines()
        if len(parts) < 3 or ' --> ' not in parts[1]:
            raise ValueError('Invalid provider SRT cue')
        start, end = parts[1].split(' --> ')
        text = ''.join(parts[2:]).replace('ベース', 'BASE').replace('るみ', 'ルミ')
        if any(c in text for c in '{}\\'):
            raise ValueError('Subtitle contains ASS control syntax')
        chunks = []
        while len(text) > 21:
            candidates = [i for i in range(8, 22) if text[i-1] in '。、？'
                          or any(text[i:].startswith(word) for word in
                                 ['会社', 'スマホ', '電話に', '番号の', '外出中', '大事'])]
            split = max(candidates) if candidates else 21
            chunks.append(text[:split])
            text = text[split:]
        wrapped = r'\N'.join(chunks + [text])
        event(2, ass_time(start), ass_time(end), r'{\an2\pos(346,1082)\fad(60,40)}' + wrapped)
        count += 1
    if not count:
        raise ValueError('No subtitle cues')
    return '\n'.join(lines) + '\n'


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--video', required=True)
    p.add_argument('--srt', required=True)
    p.add_argument('--fonts-dir', required=True)
    p.add_argument('--output', required=True)
    args = p.parse_args()
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    subtitle = output.with_suffix('.ass')
    subtitle.write_text(make_ass(Path(args.srt).read_text(encoding='utf-8-sig')))
    # All file paths are argv, not a shell command. Restrict libavfilter paths.
    for value in [str(subtitle), args.fonts_dir]:
        if not re.fullmatch(r'[A-Za-z0-9_./-]+', value):
            raise ValueError('Filter paths must use plain filename characters')
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', args.video,
                    '-vf', f'ass={subtitle}:fontsdir={args.fonts_dir}',
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
                    '-c:a', 'copy', '-movflags', '+faststart', '-y', str(output)], check=True)
    receipt = {'sourceSha256': hashlib.sha256(Path(args.video).read_bytes()).hexdigest(),
               'outputSha256': hashlib.sha256(output.read_bytes()).hexdigest(),
               'subtitleSource': 'existing HeyGen video subtitleUrl; cue times preserved',
               'captionSpellingNormalization': ['ベース → BASE', 'るみ → ルミ'],
               'audio': 'stream_copy', 'sourceWatermark': 'preserved',
               'qualityReviewed': False, 'published': False}
    output.with_suffix('.json').write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps(receipt, ensure_ascii=False))
