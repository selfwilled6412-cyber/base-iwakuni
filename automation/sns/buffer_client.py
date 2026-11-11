import json
import os
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output"
ENDPOINT = "https://api.buffer.com"


def call_buffer(query):
    response = requests.post(
        ENDPOINT,
        headers={"Authorization": "Bearer " + os.environ["BUFFER_API_TOKEN"], "Content-Type": "application/json"},
        json={"query": query},
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("errors"):
        raise RuntimeError(json.dumps(payload["errors"], ensure_ascii=False))
    return payload["data"]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    account = call_buffer("query { account { organizations { id name } } }")
    (OUT / "buffer_account.json").write_text(json.dumps(account, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(account, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
