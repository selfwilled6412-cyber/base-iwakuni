from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT / "output"

KEYWORDS = {
    "urgency": ["急ぎ", "至急", "今月", "すぐ", "困って", "止まって"],
    "repeat_work": ["毎日", "毎週", "繰り返し", "転記", "コピペ", "集計", "日報", "記録", "定型"],
    "clear_problem": ["時間がかかる", "手間", "ミス", "忘れる", "二重入力", "属人化", "面倒"],
    "decision": ["見積", "相談", "導入", "お願い", "依頼", "費用"],
}


def contains_any(text: str, words: list[str]) -> bool:
    return any(word in text for word in words)


def qualify(text: str) -> dict:
    normalized = re.sub(r"\s+", " ", text).strip()
    score = 20
    reasons = []

    if contains_any(normalized, KEYWORDS["repeat_work"]):
        score += 25
        reasons.append("繰り返し作業が見える")
    if contains_any(normalized, KEYWORDS["clear_problem"]):
        score += 20
        reasons.append("具体的な業務課題がある")
    if contains_any(normalized, KEYWORDS["decision"]):
        score += 20
        reasons.append("相談・見積り意向がある")
    if contains_any(normalized, KEYWORDS["urgency"]):
        score += 15
        reasons.append("緊急度が高い可能性")

    score = min(score, 100)
    if score >= 75:
        priority = "A"
    elif score >= 50:
        priority = "B"
    else:
        priority = "C"

    missing_questions = []
    if not re.search(r"\d+\s*(円|万|万円)", normalized):
        missing_questions.append("予算感")
    if not re.search(r"(いつ|今月|来月|月末|日まで|週間|ヶ月)", normalized):
        missing_questions.append("希望時期")
    missing_questions.extend(["現在の作業手順", "1回あたりの作業時間・頻度", "利用中のツール"])

    return {
        "lead_text": normalized,
        "score": score,
        "priority": priority,
        "reasons": reasons,
        "recommended_offer": "業務自動化ミニパック 33,000円〜",
        "next_action": "課題ヒアリング→対象作業を1つに絞る→対応可否と見積りを人が確認",
        "questions_to_confirm": list(dict.fromkeys(missing_questions)),
        "safety": "この結果は営業優先度の下書き。価格確定・契約・外部送信は人が確認する。"
    }


def main():
    text = " ".join(sys.argv[1:]).strip()
    if not text:
        text = sys.stdin.read().strip()
    if not text:
        raise SystemExit("lead text is required")
    result = qualify(text)
    OUTPUT_DIR.mkdir(exist_ok=True)
    out = OUTPUT_DIR / "lead_qualification_latest.json"
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
