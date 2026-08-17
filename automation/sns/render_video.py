from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output"
FRAMES = OUT / "frames"
VIDEO = OUT / "base_sns_preview.mp4"
WIDTH = 1080
HEIGHT = 1920
FPS = 30
SLIDE_SECONDS = 7.5

DEFAULT_CONTENT = {
    "title": "AIで面倒なPC作業を減らす",
    "slides": [
        "毎日のPC作業、\nまだ手でやってませんか？",
        "AIに任せられる作業を\n少しずつ切り分ける",
        "文章・整理・投稿準備を\n自動化して時間を戻す",
        "小さな会社でも\nAI自走化は始められます",
    ],
    "caption": "AIと自動化で、面倒なPC作業を少しずつ減らす取り組みを進めています。",
}


def load_content() -> dict:
    path = OUT / "content.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return DEFAULT_CONTENT


def find_font() -> str:
    candidates = [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return candidate
    raise RuntimeError("No usable font found")


def fit_text(draw: ImageDraw.ImageDraw, text: str, font_path: str, max_width: int, start_size: int = 94):
    for size in range(start_size, 47, -2):
        font = ImageFont.truetype(font_path, size=size)
        bbox = draw.multiline_textbbox((0, 0), text, font=font, spacing=18, align="center")
        if bbox[2] - bbox[0] <= max_width:
            return font
    return ImageFont.truetype(font_path, size=48)


def make_frame(text: str, index: int, total: int, font_path: str, path: Path) -> None:
    image = Image.new("RGB", (WIDTH, HEIGHT), (16, 20, 28))
    draw = ImageDraw.Draw(image)

    # simple premium gradient-like bands without external assets
    draw.rectangle((0, 0, WIDTH, 260), fill=(24, 34, 50))
    draw.rectangle((0, HEIGHT - 260, WIDTH, HEIGHT), fill=(24, 34, 50))
    draw.rounded_rectangle((80, 430, WIDTH - 80, 1450), radius=54, fill=(245, 247, 250))

    brand_font = ImageFont.truetype(font_path, size=48)
    small_font = ImageFont.truetype(font_path, size=36)
    body_font = fit_text(draw, text, font_path, WIDTH - 220)

    draw.text((80, 105), "岩国BASE｜店舗・事業者相談", font=brand_font, fill=(255, 255, 255))
    draw.text((WIDTH - 80, 180), f"{index}/{total}", font=small_font, fill=(210, 218, 230), anchor="ra")

    bbox = draw.multiline_textbbox((0, 0), text, font=body_font, spacing=26, align="center")
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (WIDTH - tw) / 2
    y = 920 - th / 2
    draw.multiline_text((x, y), text, font=body_font, fill=(20, 26, 36), spacing=26, align="center")

    draw.text((80, HEIGHT - 150), "AI生成コンテンツ｜確認後に投稿", font=small_font, fill=(220, 226, 236))
    image.save(path, quality=95)


def render_video(frame_paths: list[Path]) -> None:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg is required")

    concat = OUT / "frames.txt"
    lines = []
    for path in frame_paths:
        lines.append(f"file '{path.as_posix()}'")
        lines.append(f"duration {SLIDE_SECONDS}")
    lines.append(f"file '{frame_paths[-1].as_posix()}'")
    concat.write_text("\n".join(lines) + "\n", encoding="utf-8")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", str(concat),
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-shortest",
        "-vf", f"fps={FPS},format=yuv420p",
        "-c:v", "libx264", "-preset", "medium", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        str(VIDEO),
    ]
    subprocess.run(cmd, check=True)

    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration,size", "-show_entries", "stream=codec_name,width,height,r_frame_rate", "-of", "json", str(VIDEO)],
        check=True,
        capture_output=True,
        text=True,
    )
    (OUT / "video_probe.json").write_text(probe.stdout, encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    FRAMES.mkdir(parents=True, exist_ok=True)
    content = load_content()
    slides = content.get("slides") or DEFAULT_CONTENT["slides"]
    slides = list(slides)[:4]
    while len(slides) < 4:
        slides.append(DEFAULT_CONTENT["slides"][len(slides)])

    font_path = find_font()
    frame_paths = []
    for index, text in enumerate(slides, start=1):
        path = FRAMES / f"slide_{index}.png"
        make_frame(str(text), index, len(slides), font_path, path)
        frame_paths.append(path)

    render_video(frame_paths)
    print(VIDEO)


if __name__ == "__main__":
    main()
