import json
import os
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output"
ENDPOINT = "https://api.buffer.com"
SUPPORTED = {"instagram", "youtube", "tiktok"}


def gql_escape(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def call_buffer(query: str):
    response = requests.post(
        ENDPOINT,
        headers={
            "Authorization": "Bearer " + os.environ["BUFFER_API_TOKEN"],
            "Content-Type": "application/json",
        },
        json={"query": query},
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("errors"):
        raise RuntimeError(json.dumps(payload["errors"], ensure_ascii=False))
    return payload["data"]


def get_channels():
    account = call_buffer("query { account { organizations { id name } } }")
    channels = []
    for organization in account["account"]["organizations"]:
        org_id = organization["id"]
        found = call_buffer(
            'query { channels(input: { organizationId: "' + org_id + '" }) { id name service } }'
        )["channels"]
        channels.extend(found)
    return [channel for channel in channels if channel["service"] in SUPPORTED]


def metadata_for(service: str, title: str) -> str:
    if service == "instagram":
        return "metadata: { instagram: { type: reel, shouldShareToFeed: true, isAiGenerated: true } }"
    if service == "tiktok":
        return "metadata: { tiktok: { isAiGenerated: true } }"
    if service == "youtube":
        return (
            "metadata: { youtube: { "
            f"title: {gql_escape(title)}, categoryId: \"28\", madeForKids: false, "
            "isAiGenerated: true, privacy: unlisted } }"
        )
    raise ValueError(service)


def create_draft(channel, media_url: str, text: str, title: str):
    metadata = metadata_for(channel["service"], title)
    query = f"""
    mutation CreateDraftVideoPost {{
      createPost(input: {{
        text: {gql_escape(text)}
        channelId: \"{channel['id']}\"
        schedulingType: automatic
        mode: addToQueue
        saveToDraft: true
        aiAssisted: true
        assets: [{{ video: {{ url: {gql_escape(media_url)}, metadata: {{ thumbnailOffset: 1000 }} }} }}]
        {metadata}
      }}) {{
        ... on PostActionSuccess {{
          post {{ id text }}
        }}
        ... on MutationError {{
          message
        }}
      }}
    }}
    """
    return call_buffer(query)["createPost"]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    media_url = os.getenv("BUFFER_MEDIA_URL", "").strip()
    create_enabled = os.getenv("BUFFER_CREATE_DRAFTS", "false").lower() == "true"
    title = os.getenv("BUFFER_DRAFT_TITLE", "BASE SNS 自動化テスト")
    text = os.getenv(
        "BUFFER_DRAFT_TEXT",
        "AIと自動化で、面倒なPC作業を少しずつ減らす取り組みを進めています。#AI活用 #業務改善",
    )

    channels = get_channels()
    plan = {
        "create_enabled": create_enabled,
        "media_url_present": bool(media_url),
        "targets": channels,
    }
    (OUT / "buffer_draft_plan.json").write_text(
        json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    if not create_enabled:
        print("Draft creation is disabled. Set BUFFER_CREATE_DRAFTS=true to enable.")
        return
    if not media_url:
        raise RuntimeError("BUFFER_MEDIA_URL is required when draft creation is enabled")

    results = []
    for channel in channels:
        results.append({"channel": channel, "result": create_draft(channel, media_url, text, title)})

    (OUT / "buffer_draft_results.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
