# BASE security PR publishing

Production entry point: `.github/workflows/base-buffer-video-queue.yml`.
Daily generation and immediate automatic publication at 10:15 JST; hourly monitoring
at :45. Initial merge and manual dispatch also process today's one video. GitHub
cron can be delayed; the hourly recovery makes up a missed daily run. Only the exact
three verified BASE Buffer IDs in `buffer_publish_video.py` can be used.

Videos: original 1080×1920 graphics, 30fps H.264/AAC, Japanese neural narration,
full scene captions, moving camera, five timed scenes. Uses the official local VOICEVOX CPU engine with 四国めたん narration and
required voice credits in the video and captions. No paid API key is required. A voice failure fails the job; unvoiced content is never
published. The 72-day industry/topic rotation gives practical, non-time-sensitive
checks rather than claiming regulatory certification or a guaranteed defense.

Secrets: existing `BUFFER_API_TOKEN` needs account:read, posts:read and posts:write.
No new account or BASE_BUFFER_CHANNEL_IDS secret is needed. Exact IDs were verified
by successful connection run 43651956417 (2026-11-15 JST). Never print tokens.

Public video hosting: one GitHub Release per day, permanent public MP4 asset.
No files/accounts/posts are deleted. The journal lives on `base-security-post-state`
in `marketing/scs/runtime/ledger.json`. A write-ahead intent is committed before
creating each Buffer post. A crash or unknown API response causes reconciliation
with remote posts by unique date marker, never a blind second create. A failure to
persist state prevents further mutation. Existing sent posts are skipped. Buffer
errors are retried using editPost on the SAME post ID, with 30-minute backoff and a
three-retry cap. A missing/uncertain result is alerted for investigation instead
of risking a duplicate. Every channel is processed independently.

A single GitHub issue titled `BASE security auto-publishing: operational alert`
tracks outstanding failures. Runs include status and public post URLs in the
Actions summary and artifacts; this distinguishes accepted/sending from `sent`.
Infrastructure/authorization failures create an incident too. Hourly recovery
continues without requiring individual approval. A disconnected social account
or expired token requires its owner to reconnect it; the job reports the error.
GitHub may disable inactive scheduled workflows; the existing external BASE PR
scheduled task can inspect that condition and restore operation.

PRs run isolation, duplicate/crash, retry and layout tests plus a narrated video
preview without publishing or exposing secrets. The older `scs_draft_factory.py`
and `render_shorts.py` remain as historical draft tools; they do not publish.
