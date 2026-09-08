import json
import os
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output"
ENDPOINT = "https://api.buffer.com"
EXPECTED_SERVICES = {"instagram", "youtube", "tiktok"}


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


def get_orgs():
    return call_buffer("query { account { organizations { id name } } }")["account"]["organizations"]


def get_drafts():
    drafts = []
    for org in get_orgs():
        q = f'''query {{
          posts(first: 100, input: {{
            organizationId: "{org['id']}"
            sort: [{{ field: createdAt, direction: desc }}]
            filter: {{ status: [draft] }}
          }}) {{
            edges {{
              node {{ id text status channel {{ id name service }} }}
            }}
          }}
        }}'''
        for edge in call_buffer(q)["posts"]["edges"]:
            node = edge["node"]
            node["organization"] = org
            drafts.append(node)
    return drafts


def queue_draft(post_id: str):
    q = f'''mutation QueueApprovedDraft {{
      updatePost(input: {{
        id: "{post_id}"
        mode: addToQueue
        saveToDraft: false
        schedulingType: automatic
      }}) {{
        ... on PostActionSuccess {{ post {{ id status dueAt }} }}
        ... on MutationError {{ message }}
      }}
    }}'''
    return call_buffer(q)["updatePost"]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    approved_ids = [x.strip() for x in os.getenv("BUFFER_APPROVED_DRAFT_IDS", "").split(",") if x.strip()]
    confirm = os.getenv("CONFIRM_BUFFER_QUEUE", "NO")

    drafts = get_drafts()
    draft_map = {d["id"]: d for d in drafts}
    selected = [draft_map[x] for x in approved_ids if x in draft_map]
    missing = [x for x in approved_ids if x not in draft_map]
    selected_services = {d["channel"]["service"] for d in selected}

    plan = {
        "confirm": confirm,
        "approved_ids": approved_ids,
        "selected": selected,
        "missing": missing,
        "selected_services": sorted(selected_services),
        "expected_services": sorted(EXPECTED_SERVICES),
    }
    (OUT / "buffer_approval_plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")

    if confirm != "APPROVE_FOR_QUEUE":
        print("Approval gate locked. No draft was scheduled.")
        print(json.dumps(plan, ensure_ascii=False, indent=2))
        return

    if len(approved_ids) != 3:
        raise RuntimeError("Exactly 3 approved draft IDs are required")
    if missing:
        raise RuntimeError("Approved IDs are not current drafts: " + ", ".join(missing))
    if selected_services != EXPECTED_SERVICES:
        raise RuntimeError(f"Expected one Instagram/YouTube/TikTok draft; got {sorted(selected_services)}")

    results = []
    for post in selected:
        result = queue_draft(post["id"])
        if result.get("message"):
            raise RuntimeError(result["message"])
        results.append({"source": post, "result": result})

    (OUT / "buffer_approval_results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
