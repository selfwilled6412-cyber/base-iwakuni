from __future__ import annotations

import json
import sys
from pathlib import Path

from lead_qualifier import qualify
from proposal_builder import build

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output"


def process_manual_lead(text: str) -> dict:
    text = (text or "").strip()
    if not text:
        raise ValueError("lead text is required")

    qualification = qualify(text)
    proposal = build({"lead_text": text})

    return {
        "source": "manual_fallback",
        "qualification": qualification,
        "proposal": proposal,
        "review_gate": {
            "status": "human_review_required",
            "external_action_allowed": False,
            "next_step": "内容を人が確認し、必要な追加質問をしてから返信・見積りする",
        },
        "safety": [
            "この処理は外部へ送信しない",
            "価格・契約・値引きは確定しない",
            "顧客本文はGitHubへコミットしない",
        ],
    }


def main() -> None:
    text = " ".join(sys.argv[1:]).strip()
    if not text:
        text = sys.stdin.read().strip()
    result = process_manual_lead(text)
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / "manual_lead_latest.json"
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
