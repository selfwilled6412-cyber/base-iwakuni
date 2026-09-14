from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output"


def summarize(records: Iterable[dict]) -> dict:
    """Summarize aggregate sales outcomes without customer identifiers.

    Expected fields per record:
      source_theme: str
      lead_count: int
      quote_count: int
      won_count: int
      revenue_jpy: int (optional)

    The function never performs external actions and never requires names, emails,
    phone numbers, message bodies, LINE user IDs, or company identifiers.
    """
    by_theme: dict[str, dict] = defaultdict(lambda: {
        "lead_count": 0,
        "quote_count": 0,
        "won_count": 0,
        "revenue_jpy": 0,
    })

    for record in records:
        theme = str(record.get("source_theme") or "未分類").strip() or "未分類"
        target = by_theme[theme]
        for key in ("lead_count", "quote_count", "won_count", "revenue_jpy"):
            try:
                value = int(record.get(key) or 0)
            except (TypeError, ValueError):
                value = 0
            target[key] += max(value, 0)

    themes = []
    for theme, values in by_theme.items():
        leads = values["lead_count"]
        quotes = values["quote_count"]
        won = values["won_count"]
        revenue = values["revenue_jpy"]
        themes.append({
            "source_theme": theme,
            **values,
            "quote_rate": round(quotes / leads, 4) if leads else 0.0,
            "win_rate": round(won / leads, 4) if leads else 0.0,
            "revenue_per_lead_jpy": round(revenue / leads) if leads else 0,
        })

    themes.sort(
        key=lambda x: (x["won_count"], x["quote_count"], x["lead_count"]),
        reverse=True,
    )

    top = themes[0] if themes else None
    recommendation = (
        f"次回のSNS企画では『{top['source_theme']}』系を優先候補にする。"
        if top and top["lead_count"] >= 1
        else "十分な相談データが集まるまで既存の5本サイクルを継続する。"
    )

    return {
        "themes": themes,
        "recommended_editorial_action": recommendation,
        "safety": {
            "aggregate_only": True,
            "external_action_allowed": False,
            "auto_publish_allowed": False,
            "auto_contact_allowed": False,
            "note": "これは編集・営業判断の下書き。公開・営業送信・価格変更は人が承認する。",
        },
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    if len(sys.argv) > 1:
        records = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    else:
        records = json.loads(sys.stdin.read() or "[]")
    if not isinstance(records, list):
        raise SystemExit("input must be a JSON array")
    result = summarize(records)
    path = OUT / "conversion_feedback_latest.json"
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
