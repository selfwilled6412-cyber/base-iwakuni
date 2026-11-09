# BASE SCS Social Draft Factory

Purpose: generate 2 vertical 30-second Shorts MP4 previews, narration scripts, and platform-specific post copy every day using zero external APIs or credits.

Workflow: .github/workflows/base-scs-social-drafts.yml, scheduled at 08:30 JST. Script: marketing/scs/scs_draft_factory.py. Output: dated bundle.json, drafts.md, and 2 MP4 videos in GitHub Actions artifacts (14-day retention). Videos are motion-text drafts with a low-volume original ambient sound bed; scripted voiceover is not rendered yet.

Coverage: 6 industries x 12 security topics = 72 rotations. Each daily pack includes YouTube Shorts title, 6 scenes, Japanese narration, source link and 8 platform-specific caption variants (YouTube, Facebook, Instagram, TikTok, LinkedIn, Threads, X, Google Business Profile).

SAFETY: generated MP4 is a working draft, not fully voiced or approved. Drafts only. No YouTube/Buffer/Metricool posting call. No secrets required. BASE channel ownership/ID and explicit publishing approval MUST be verified. Never publish on KARDIVEX or personal accounts. Manually verify current sources before posting.

Official source: https://www.ipa.go.jp/security/scs/details.html
Business landing: https://selfwilled6412-cyber.github.io/base-iwakuni/security/scs/
LINE: https://lin.ee/z5T92Yn

Planned next step after authorization: BASE-specific OAuth, verify channel ID, private upload test, then scheduling with approval and duplicate protections.
