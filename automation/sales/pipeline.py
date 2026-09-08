from __future__ import annotations

import json
from dataclasses import asdict
from typing import Any

from lead_qualifier import qualify
from proposal_builder import build
from line_webhook_receiver import IncomingLead


def process_incoming_lead(lead: IncomingLead, extra: dict[str, Any] | None = None) -> dict:
    """Run the private-side sales pipeline without sending anything externally.

    The returned object is intended for a private datastore only.
    """
    extra = extra or {}
    qualification = qualify(lead.message_text)

    proposal_input = {
        "company_name": extra.get("company_name", ""),
        "problem": extra.get("problem") or lead.message_text,
        "current_flow": extra.get("current_flow", ""),
        "tools": extra.get("tools", []),
        "budget": extra.get("budget", ""),
        "timing": extra.get("timing", ""),
        "lead_text": lead.message_text,
    }
    proposal = build(proposal_input)

    return {
        "incoming": asdict(lead),
        "qualification": qualification,
        "proposal": proposal,
        "workflow_state": "needs_human_review",
        "external_action_allowed": False,
        "next_human_action": "内容を確認し、必要ならヒアリング質問を調整してから返信・見積りへ進む",
    }


def main() -> None:
    sample = IncomingLead(
        source="line",
        event_id="sample-event",
        user_id="sample-user",
        message_text="毎日Excelから別の表に転記していて時間がかかります。自動化相談したいです。",
        timestamp=0,
    )
    print(json.dumps(process_incoming_lead(sample), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
