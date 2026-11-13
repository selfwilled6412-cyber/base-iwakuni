# BASE × Buffer の安全な接続確認

2026-11-12 時点のBuffer画面から確認済み:
- TikTok: `base_iwakuni`
- YouTube: `岩国BASE 店舗・事業者相談`
- Instagram Professional: `base_iwakuni`
- Buffer Freeの3/3枠を使用中。新たなアカウントは不要。

## 次の作業
1. BufferのPersonal Accessには2026-10-27発行の既存APIキー `BUFFER_API_KEY` がある。**新規キー発行不要**。
2. 2026-11-12のGitHub Actions読み取り専用接続テストはHTTP 401（認証失敗）: https://github.com/selfwilled6412-cyber/base-iwakuni/actions/runs/43112904773 。`BUFFER_API_TOKEN` Secret自体は登録済みだが、現行Bufferキー（2026-10-27作成）と一致していない可能性がある。ユーザー本人がGitHub Actions Secretの値を現行キーに**置換**する必要がある。キーはチャット・PR・ファイル・ログへ貼らない。
3. Secret更新後、`.github/workflows/base-buffer-verify.yml` の読み取り専用Actionsを手動実行し、HTTP 200とBASE専用3チャンネルの固有ID一致を確認。成功するまでは接続済みとみなさない。
4. 安全確認後、別途投稿システムを設計する。公開先はBASE専用の3チャンネルだけ。KARDIVEXへの誤投稿を絶対に避ける。

このチェックはBuffer GraphQL APIの`account`と`channels`**読み取りのみ**。投稿/予約/削除のAPIは使用しない。Secretsはジョブ環境にしか読み込まず、PR時にはSecretsを渡さない。

注: YouTube Shorts、TikTok、Instagram Reelsの動画投稿にはメディアURL・プラットフォーム固有条件がある。現在の自動制作はGitHub Actions成果物への動画生成まで。Bufferがアクセスできるメディアの公開URL、実際の動画品質と読み上げ、チャンネルIDの明示照合、ユーザーの公開承認が揃うまで自動公開を有効にしない。
