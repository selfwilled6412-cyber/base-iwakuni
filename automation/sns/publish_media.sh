#!/usr/bin/env bash
set -euo pipefail

if [[ "${CONFIRM_PUBLIC_MEDIA:-NO}" != "YES" ]]; then
  echo "Public media publishing is locked. Set CONFIRM_PUBLIC_MEDIA=YES explicitly."
  exit 0
fi

VIDEO_PATH="${VIDEO_PATH:-automation/sns/output/base_sns_preview.mp4}"
MEDIA_BRANCH="${MEDIA_BRANCH:-sns-media-preview}"
RUN_SUFFIX="${GITHUB_RUN_ID:-$(date +%s)}"
MEDIA_NAME="${MEDIA_NAME:-base-sns-${RUN_SUFFIX}.mp4}"

if [[ ! -f "$VIDEO_PATH" ]]; then
  echo "Video not found: $VIDEO_PATH" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
cp "$VIDEO_PATH" "$TMP_DIR/$MEDIA_NAME"

pushd "$TMP_DIR" >/dev/null
git init
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git checkout -b "$MEDIA_BRANCH"
git add "$MEDIA_NAME"
git commit -m "Publish BASE SNS preview media ${RUN_SUFFIX}"
git remote add origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
git push --force origin "$MEDIA_BRANCH"
popd >/dev/null

MEDIA_URL="https://raw.githubusercontent.com/${GITHUB_REPOSITORY}/${MEDIA_BRANCH}/${MEDIA_NAME}?v=${RUN_SUFFIX}"
printf '%s\n' "$MEDIA_URL" > automation/sns/output/public_media_url.txt
echo "Published unique media URL prepared: $MEDIA_NAME"
