from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output"
OFFER = json.loads((ROOT / "offer_catalog.json").read_text(encoding="utf-8"))["primary_offer"]


def build(lead: dict) -> dict:
    company = (lead.get("company_name") or "ご相談者様").strip()
    problem = (lead.get("problem") or lead.get("lead_text") or "業務上の繰り返し作業").strip()
    current_flow = (lead.get("current_flow") or "要ヒアリング").strip()
    tools = lead.get("tools") or []
    if isinstance(tools, str):
        tools = [x.strip() for x in tools.split(",") if x.strip()]
    budget = (lead.get("budget") or "要確認").strip()
    timing = (lead.get("timing") or "要確認").strip()

    questions = []
    if current_flow == "要ヒアリング":
        questions.append("現在の作業手順を、開始から完了まで順番に確認する")
    if not tools:
        questions.append("現在利用しているツール・サービスを確認する")
    if budget == "要確認":
        questions.append("予算感を確認する")
    if timing == "要確認":
        questions.append("希望時期を確認する")
    questions.extend([
        "1回あたりの作業時間と頻度を確認する",
        "個人情報・機密情報を扱うか確認する",
        "自動化後も人が最終確認すべき工程を確認する",
    ])

    scope = [
        "対象業務を1つに絞る",
        "現状フローを整理する",
        "最小構成で自動化案を設計する",
        "動作確認用の試作を行う",
        "操作・運用方法を簡単に整理する",
    ]

    proposal = {
        "customer": company,
        "title": f"{company}向け 業務自動化ミニパック ご提案骨子",
        "problem_summary": problem,
        "recommended_offer": OFFER["name"],
        "price_display": "33,000円〜（内容・難易度・外部サービス費用により個別見積り）",
        "proposed_scope": scope,
        "current_flow": current_flow,
        "tools": tools or ["要確認"],
        "budget": budget,
        "timing": timing,
        "questions_before_quote": list(dict.fromkeys(questions)),
        "draft_message": (
            f"{company}様、ご相談ありがとうございます。\n"
            f"まずは『{problem}』の中から、繰り返し負担が大きい作業を1つに絞り、"
            "小さく自動化できるか確認する進め方が合いそうです。\n"
            "業務自動化ミニパックは33,000円〜で、実際の作業内容・利用中ツール・希望時期を確認したうえでお見積りします。\n"
            "まず現在の作業手順を簡単に教えてください。"
        ),
        "safety": [
            "この提案は下書きであり、外部送信前に人が確認する",
            "価格は確定額ではなく入口価格",
            "未検証の削減時間・売上効果を約束しない",
            "個人情報・機密情報を扱う場合は別途設計確認する",
        ],
    }
    return proposal


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    if len(sys.argv) > 1:
        source = Path(sys.argv[1])
        lead = json.loads(source.read_text(encoding="utf-8"))
    else:
        lead = json.loads(sys.stdin.read())
    result = build(lead)
    path = OUT / "proposal_latest.json"
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
