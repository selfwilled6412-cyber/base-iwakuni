#!/usr/bin/env python3
"""Read-only Buffer channel verification for BASE. Never creates/schedules posts."""
from __future__ import annotations
import json
import os
import sys
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

API_URL = "https://api.buffer.com"
EXPECTED = ("youtube", "instagram", "tiktok")


def normalized(value: str) -> str:
    return unicodedata.normalize("NFKC", str(value)).strip().casefold().replace(" ", "").replace("@", "")


def matches_base_channel(channel: dict) -> bool:
    service = normalized(channel.get("service") or "")
    name = normalized(channel.get("name") or "")
    display = normalized(channel.get("displayName") or "")
    if service not in EXPECTED:
        return False
    names = (name, display)
    if service == "youtube":
        return any("base_iwakuni" in x or ("岩国base" in x and "店舗" in x) for x in names)
    return any("base_iwakuni" in x for x in names)


def select_channels(channels: list[dict]) -> dict[str, dict]:
    selected = {}
    for channel in channels:
        if not matches_base_channel(channel):
            continue
        service = normalized(channel["service"])
        if service in selected:
            raise ValueError("Multiple BASE-like accounts on one platform; refusing to choose")
        selected[service] = channel
    missing = set(EXPECTED) - set(selected)
    if missing:
        raise ValueError("BASE channel identity not resolved for: " + ", ".join(sorted(missing)))
    return selected


def graphql(key: str, query: str) -> dict:
    req = Request(
        API_URL,
        data=json.dumps({"query": query}, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + key},
        method="POST",
    )
    try:
        with urlopen(req, timeout=25) as response:
            payload = json.load(response)
    except HTTPError as err:
        # Do not print HTTP body, headers or credentials.
        raise RuntimeError(f"Buffer API HTTP {err.code}; check token and permissions") from None
    except URLError:
        raise RuntimeError("Buffer API unavailable") from None
    if payload.get("errors"):
        # Errors may include user account information, only report the presence of an error.
        raise RuntimeError("Buffer GraphQL query failed; check read scopes")
    return payload.get("data") or {}


def main() -> None:
    if "--self-test" in sys.argv:
        example = [
            {"id": "1", "name": "岩国BASE 店舗・事業者相談", "service": "youtube"},
            {"id": "2", "name": "base_iwakuni", "service": "instagram"},
            {"id": "3", "name": "base_iwakuni", "service": "tiktok"},
            {"id": "4", "name": "kardivex_official", "service": "youtube"},
        ]
        assert set(select_channels(example)) == set(EXPECTED)
        assert not matches_base_channel(example[3])
        try:
            select_channels([example[3]])
            raise AssertionError("Expected refusal when BASE is missing")
        except ValueError:
            pass
        print("PASS: BASE-only channel identification and fail-closed behavior")
        return

    key = os.environ.get("BUFFER_API_TOKEN", "").strip()
    if not key:
        raise SystemExit(
            "MISSING_SECRET: Set GitHub Actions secret BUFFER_API_TOKEN; "
            "do not paste the API key into chat, code or logs."
        )
    account = graphql(key, "query { account { organizations { id name } } }")
    orgs = (account.get("account") or {}).get("organizations") or []
    if not orgs:
        raise SystemExit("No Buffer organizations visible. Check API key account:read scope")
    found = []
    for org in orgs:
        oid = json.dumps(str(org["id"]), ensure_ascii=False)
        result = graphql(key,
            "query { channels(input: { organizationId: " + oid +
            " }) { id name displayName service } }"
        )
        for channel in result.get("channels") or []:
            found.append(channel)
    try:
        selected = select_channels(found)
    except ValueError as err:
        raise SystemExit("NOT_VERIFIED: " + str(err))
    print("VERIFIED READ-ONLY: Buffer contains all three expected BASE channels")
    for service in EXPECTED:
        channel = selected[service]
        print(f"{service}: {channel.get('displayName') or channel.get('name')}"
              f" / Buffer channel ID: {channel['id']}")
    print("NO POSTS CREATED, SCHEDULED OR PUBLISHED")
    print("Next step: review BASE-only publish automation separately.")


if __name__ == "__main__":
    main()
