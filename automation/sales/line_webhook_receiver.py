"""LINE Messaging API webhook receiver scaffold for BASE AI Sales Engine.

This module intentionally does NOT send replies and does NOT commit customer data.
It validates the LINE signature, extracts text messages, and emits a minimal normalized
record to a caller-provided private sink. Wire the sink only after the private storage
endpoint and credentials are configured outside GitHub.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
from dataclasses import dataclass, asdict
from typing import Callable, Iterable


@dataclass(frozen=True)
class IncomingLead:
    source: str
    event_id: str
    user_id: str
    message_text: str
    timestamp: int


def verify_line_signature(body: bytes, signature: str, channel_secret: str) -> bool:
    digest = hmac.new(channel_secret.encode("utf-8"), body, hashlib.sha256).digest()
    expected = base64.b64encode(digest).decode("ascii")
    return hmac.compare_digest(expected, signature or "")


def extract_text_leads(payload: dict) -> Iterable[IncomingLead]:
    for event in payload.get("events", []):
        message = event.get("message") or {}
        if event.get("type") != "message" or message.get("type") != "text":
            continue
        source = event.get("source") or {}
        yield IncomingLead(
            source="line",
            event_id=str(event.get("webhookEventId") or message.get("id") or ""),
            user_id=str(source.get("userId") or ""),
            message_text=str(message.get("text") or "").strip(),
            timestamp=int(event.get("timestamp") or 0),
        )


def handle_webhook(
    body: bytes,
    signature: str,
    channel_secret: str,
    private_sink: Callable[[dict], None],
) -> int:
    """Validate and persist text events. Returns accepted text-event count.

    private_sink must write to a non-public store such as the private sales sheet/API.
    Do not point it at repository files or Actions artifacts.
    """
    if not verify_line_signature(body, signature, channel_secret):
        raise ValueError("invalid LINE signature")

    payload = json.loads(body.decode("utf-8"))
    count = 0
    for lead in extract_text_leads(payload):
        if not lead.message_text:
            continue
        private_sink(asdict(lead))
        count += 1
    return count
