from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output"

REQUIRED = [
    ("problem", "何を自動化・改善したいか"),
    ("current_flow", "現在の作業手順"),
    ("frequency", "作業頻度"),
    ("tools", "現在使っているツール・サービス"),
    ("timing", "希望時期"),
    ("personal_data_involved", "個人情報・機密情報を扱うか"),
]


def _present(value) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip()) and value.strip() not in {"要確認", "不明"}
    if isinstance(value, (list, tuple, dict, set)):
        return bool(value)
    return True


def assess(lead: dict) -> dict:
    missing = [label for key, label in REQUIRED if not _present(lead.get(key))]
    budget_known = _present(lead.get("budget"))
    time_known = _present(lead.get("time_per_run"))

    ready = len(missing) == 0
    next_action = (
        "人が内容を確認し、見積り作成へ進む"
        if ready
        else "不足情報だけを確認してから見積り作成へ進む"
    )

    return {
        "quote_ready": ready,
        "missing_before_quote": missing,
        "optional_but_useful": [
            label
            for ok, label in [
                (budget_known, "予算感"),
                (time_known, "1回あたりの作業時間"),
            ]
            if not ok
        ],
        "next_action": next_action,
        "external_action_allowed": False,
        "price_commitment_allowed": False,
        "notes": [
            "この判定は見積り準備のための内部判定で、顧客への自動送信はしない",
            "33,000円〜は入口価格であり、この判定だけで確定価格にしない",
            "契約・値引き・支出は本人承認なしに実行しない",
        ],
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    if len(sys.argv) > 1:
        lead = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    else:
        lead = json.loads(sys.stdin.read())
    result = assess(lead)
    path = OUT / "quote_readiness_latest.json"
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
