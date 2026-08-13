# BASE SNS自走システム Ver.1

Instagram Reels / YouTube Shorts / TikTok向けの共通縦動画をAIで作り、Bufferへ下書きとして登録するMVPです。

## 安全設計
- まずは自動公開せずBuffer下書きまで
- AI生成であることを明示
- APIキーはGitHub Secretsで管理
- 3〜5本確認後に完全自動投稿へ切り替える

## 必要なSecrets
- OPENAI_API_KEY
- BUFFER_API_TOKEN
- BUFFER_ORGANIZATION_ID（任意）

## 構成
OpenAI → 台本・投稿文 → 縦動画 → 公開メディアURL → Buffer → Instagram / YouTube / TikTok

## 現在地
- Buffer 3/3接続済み
- SNS企画生成スクリプト作成済み
- 動画レンダラーとBuffer投稿処理は実装中
