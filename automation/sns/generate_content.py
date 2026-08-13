from __future__ import annotations

import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path

from openai import OpenAI

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
OUTPUT_DIR = ROOT / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

JST = timezone(timedelta(hours=9))


def generate_content() -> dict:
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    model = os.getenv("OPENAI_TEXT_MODEL", "gpt-5-mini")
    today = datetime.now(JST).strftime("%Y-%m-%d")

    schema = {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "hook": {"type": "string"},
            "voiceover": {"type": "string"},
            "slides": {
                "type": "array",
                "minItems": 4,
                "maxItems": 4,
                "items": {"type": "string"}
            },
            "caption": {"type": "string"},
            "hashtags": {
                "type": "array",
                "minItems": 3,
                "maxItems": 6,
                "items": {"type": "string"}
            }
        },
        "required": ["title", "hook", "voiceover", "slides", "caption", "hashtags"],
        "additionalProperties": False
    }

    prompt = f"""
あなたは株式会社BASEのSNS編集長です。日付は{today}です。
ブランド名: {CONFIG['brand_name']}
対象: {CONFIG['audience']}
テーマ候補: {', '.join(CONFIG['content_pillars'])}
CTA: {CONFIG['cta']}

Instagram Reels / YouTube Shorts / TikTok 共通の30秒前後の縦動画を1本企画してください。
条件:
- 難しい専門用語を避ける。
- 誇大広告や断定を避ける。
- 「AIそのもの」より、仕事が楽になる具体例を中心にする。
- 冒頭2秒で興味を引く。
- voiceoverは日本語で120〜180文字程度。
- slidesは画面に大きく出す短文を4枚。各24文字程度まで。
- captionは自然な日本語。売り込みすぎない。
- hashtagsは先頭に#を付ける。
- BASEが実際にAI自走化を進めている連載として成立させる。
- 実在企業や第三者について未確認の事実を作らない。
"""

    response = client.responses.create(
        model=model,
        input=prompt,
        text={
            "format": {
                "type": "json_schema",
                "name": "base_sns_post",
                "strict": True,
                "schema": schema
            }
        }
    )
    data = json.loads(response.output_text)
    data["generated_at"] = datetime.now(timezone.utc).isoformat()
    data["ai_generated"] = True
    return data


def main() -> None:
    data = generate_content()
    path = OUTPUT_DIR / "content.json"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(path)


if __name__ == "__main__":
    main()
