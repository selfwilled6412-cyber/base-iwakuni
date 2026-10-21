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

FALLBACK_SERIES = [
    {
        "title": "毎日のPC作業、減らせます",
        "hook": "そのコピペ、毎日やってませんか？",
        "voiceover": "毎日同じ文章を作る、同じ場所へ転記する、投稿文を毎回考える。こうした繰り返し作業は、自動化できる可能性があります。BASEでも、小さな作業から順番にAIと自動化へ切り替えています。",
        "slides": [
            "そのコピペ、\n毎日やってませんか？",
            "繰り返し作業を\nまず1つ見つける",
            "文章・整理・投稿準備を\n自動化する",
            "小さく始めて\n時間を取り戻す",
        ],
        "caption": "毎日繰り返しているPC作業は、全部を一気に変えなくても大丈夫。まず1つだけ自動化できる仕事を探すところから始められます。",
        "hashtags": ["#業務改善", "#AI活用", "#自動化", "#岩国", "#小規模事業者"],
    },
    {
        "title": "SNS投稿準備を自動化",
        "hook": "SNS、投稿する前が一番大変です。",
        "voiceover": "SNSは投稿ボタンを押すより、ネタ探し、文章作成、画像や動画の準備に時間がかかります。BASEでは、企画から動画生成、投稿準備までをつなげて、人が確認するだけの形を試しています。",
        "slides": [
            "SNSは\n投稿前がいちばん大変",
            "ネタ・文章・動画を\nまとめて準備",
            "AIと自動化で\n下書きまで作る",
            "最後は人が確認して\n安全に投稿",
        ],
        "caption": "SNS運用は“毎回ゼロから作る”状態を減らすだけでもかなり楽になります。BASEでは下書きまで自動で作る仕組みを検証中です。",
        "hashtags": ["#SNS運用", "#業務自動化", "#AI活用", "#店舗経営", "#岩国"],
    },
    {
        "title": "小さな会社こそ自動化",
        "hook": "人が少ない会社ほど、同じ作業が重い。",
        "voiceover": "人手が少ない会社では、事務、営業、SNS、問い合わせ対応を同じ人が抱えがちです。だからこそ、全部をAIに任せるのではなく、繰り返し部分だけを自動化すると効果が出やすくなります。",
        "slides": [
            "人が少ないほど\n同じ作業が重い",
            "全部AIに任せる\n必要はありません",
            "繰り返し部分だけ\n自動化する",
            "人は判断と接客に\n時間を使う",
        ],
        "caption": "小規模事業者の自動化は、大きなシステム導入から始めなくてもOK。繰り返し作業を1つずつ減らす設計が現実的です。",
        "hashtags": ["#中小企業", "#小規模事業者", "#業務改善", "#DX", "#AI活用"],
    },
    {
        "title": "問い合わせ対応を整理",
        "hook": "同じ質問に何度も答えていませんか？",
        "voiceover": "営業時間、料金、必要な持ち物など、何度も聞かれる質問は整理できます。よくある質問をまとめ、AIや自動返信につなげることで、スタッフは本当に対応が必要な相談へ時間を使いやすくなります。",
        "slides": [
            "同じ質問に\n何度も答えてない？",
            "よくある質問を\n先に整理する",
            "自動返信できる部分を\n切り分ける",
            "人は大事な相談に\n集中できる",
        ],
        "caption": "問い合わせ対応も、全部自動化する必要はありません。定型的な質問だけ切り分けると、現場の負担を減らしやすくなります。",
        "hashtags": ["#問い合わせ対応", "#業務改善", "#自動化", "#AI活用", "#店舗運営"],
    },
    {
        "title": "福祉現場の事務を軽くする",
        "hook": "記録を書く時間、長くなっていませんか？",
        "voiceover": "福祉現場では支援そのものに加えて、記録や引き継ぎなどの事務作業も発生します。入力項目を整理し、文章化をAIに補助させることで、職員が利用者と向き合う時間を増やせる可能性があります。",
        "slides": [
            "記録を書く時間\n長くなってない？",
            "入力項目を\nまず整理する",
            "文章化をAIで\n補助する",
            "人は支援に使う時間を\n増やしていく",
        ],
        "caption": "福祉現場のAI活用は、支援を置き換えるためではなく、事務負担を軽くして人が支援に集中しやすくするために使えます。",
        "hashtags": ["#福祉DX", "#福祉事業所", "#業務改善", "#AI活用", "#事務効率化"],
    },
]


def fallback_content() -> dict:
    today = datetime.now(JST).date()
    index = today.toordinal() % len(FALLBACK_SERIES)
    data = dict(FALLBACK_SERIES[index])
    data["generated_by"] = "local_editorial_rotation"
    data["topic_index"] = index
    return data


def ai_content() -> dict:
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
                "items": {"type": "string"},
            },
            "caption": {"type": "string"},
            "hashtags": {
                "type": "array",
                "minItems": 3,
                "maxItems": 6,
                "items": {"type": "string"},
            },
        },
        "required": ["title", "hook", "voiceover", "slides", "caption", "hashtags"],
        "additionalProperties": False,
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
                "schema": schema,
            }
        },
    )
    data = json.loads(response.output_text)
    data["generated_by"] = "openai"
    return data


def generate_content() -> dict:
    if os.getenv("OPENAI_API_KEY", "").strip():
        data = ai_content()
    else:
        data = fallback_content()
    data["generated_at"] = datetime.now(timezone.utc).isoformat()
    data["ai_generated"] = data.get("generated_by") == "openai"
    return data


def main() -> None:
    data = generate_content()
    path = OUTPUT_DIR / "content.json"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(path)
    print(f"generated_by={data['generated_by']}")


if __name__ == "__main__":
    main()
