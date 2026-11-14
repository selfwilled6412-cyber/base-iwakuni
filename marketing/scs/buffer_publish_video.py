#!/usr/bin/env python3
"""BASE-only Buffer video queue publisher. Requires explicit --publish and a public MP4 URL."""
import argparse
import json
import os
from urllib.parse import urlparse
from buffer_verify_channels import graphql, select_channels

def video_url_ok(url):
    p = urlparse(url)
    return p.scheme == "https" and bool(p.netloc) and not p.username and not p.password and p.path.lower().endswith(".mp4")

def mutation():
    return """mutation PublishBaseVideo($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id text status } }
        ... on MutationError { message }
      }
    }"""

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--publish", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        assert video_url_ok("https://example.org/a.mp4")
        assert not video_url_ok("http://example.org/a.mp4")
        assert not video_url_ok("https://example.org/a.txt")
        print("PASS: MP4 URL validation")
        return
    url = os.getenv("BASE_VIDEO_URL", "").strip()
    if not video_url_ok(url):
        raise SystemExit("BASE_VIDEO_URL must be a publicly reachable HTTPS .mp4 URL")
    caption = os.getenv("BASE_VIDEO_CAPTION", "").strip()
    if not caption or len(caption) > 1000:
        raise SystemExit("BASE_VIDEO_CAPTION required (1-1000 characters)")
    token = os.getenv("BUFFER_API_TOKEN", "").strip()
    if not token:
        raise SystemExit("Missing BUFFER_API_TOKEN")
    account = graphql(token, "query { account { organizations { id name } } }")
    channels = []
    for org in (account.get("account") or {}).get("organizations") or []:
        oid = json.dumps(str(org["id"]))
        channels += graphql(token, "query { channels(input: { organizationId: " + oid + " }) { id name displayName service } }").get("channels") or []
    selected = select_channels(channels)
    expected = json.loads(os.environ.get("BASE_BUFFER_CHANNEL_IDS", "{}"))
    if set(expected) != {"youtube", "instagram", "tiktok"}:
        raise SystemExit("BASE_BUFFER_CHANNEL_IDS must specify all 3 confirmed IDs")
    for service, channel in selected.items():
        if channel["id"] != expected[service]:
            raise SystemExit("REFUSING: BASE channel ID changed for " + service)
    if not args.publish:
        print("DRY RUN: 3 BASE channels verified; no post created")
        return
    if os.getenv("BASE_PUBLISH_AUTHORIZED") != "YES_BASE_ONLY":
        raise SystemExit("Publishing gate not enabled")
    # Buffer requires externally hosted media; it fetches the URL when publishing.
    from urllib.request import Request, urlopen
    for service in ("youtube", "instagram", "tiktok"):
        input_obj = {
            "text": caption, "channelId": expected[service],
            "schedulingType": "automatic", "mode": "addToQueue",
            "assets": [{"video": {"url": url}}],
        }
        request = Request("https://api.buffer.com",
            data=json.dumps({"query": mutation(), "variables": {"input": input_obj}}).encode(),
            headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"}, method="POST")
        with urlopen(request, timeout=30) as response:
            payload = json.load(response)
        if payload.get("errors"):
            raise SystemExit("Buffer GraphQL rejected video for " + service)
        result = (payload.get("data") or {}).get("createPost") or {}
        if not (result.get("post") or {}).get("id"):
            raise SystemExit("Buffer did not queue video for " + service + ": " + str(result.get("message", "unknown error")))
        print(service + " QUEUED: " + result["post"]["id"])

if __name__ == "__main__":
    main()
