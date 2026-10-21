# BASE SNS Automation

## Current automated flow

1. Generate SNS content.
   - Uses OpenAI when `OPENAI_API_KEY` exists.
   - Falls back to a no-cost local editorial rotation when no API key is configured.
2. Render a 1080x1920, ~30 second MP4 with ffmpeg and Japanese Noto CJK fonts.
3. Confirm Buffer API connectivity and discover Instagram / YouTube / TikTok targets.
4. Validate Buffer draft creation in dry-run mode.
5. Save approval-ready outputs as GitHub Actions artifacts.

## Scheduled preview

`BASE SNS Scheduled Preview` is prepared to run Monday / Wednesday / Friday at 09:00 JST after it is merged to the default branch. It generates content and video artifacts only. It does not publish media and does not create Buffer drafts.

## Public media and Buffer draft gate

Public media publishing is intentionally separated into `BASE SNS Publish Media (Gated)`.

- Public media publication requires the exact input `confirm_public_media=YES`.
- Buffer draft creation additionally requires `create_buffer_drafts=true`.
- The default is locked and does not expose a public media URL.
- SNS publication is not performed by this workflow; it only prepares Buffer drafts when explicitly enabled.

## Japanese font validation

The renderer requires a Japanese-capable Noto CJK font and the workflows install `fonts-noto-cjk` explicitly. A replacement run verified readable Japanese text in the generated frame, deleted the three broken-font drafts, and recreated three corrected Buffer drafts.

## Current targets

- Instagram: `base_iwakuni`
- YouTube: `岩国BASE 店舗・事業者相談`
- TikTok: `base_iwakuni`

## Secret

- `BUFFER_API_TOKEN`: GitHub Actions repository secret.

Never commit API tokens to the repository.
