# BASE LINE Go-Live Handoff

この文書は、BASE AI営業エンジンのLINE受信を本番接続するときの引き継ぎ用です。
秘密情報そのものはGitHubへ書かないでください。

## 現在準備済み

- LINE Webhook受信ロジック
- `x-line-signature` のHMAC-SHA256検証
- テキストイベントの正規化
- Cloudflare Worker用 `/webhook` と `/health`
- 非公開保存先へ転送するための `PRIVATE_SINK_URL` / `PRIVATE_SINK_SHARED_SECRET` インターフェース
- 自動返信なし
- 外部送信なし
- `wrangler deploy --dry-run` による公開なしのビルド確認
- 営業パイプラインは `external_action_allowed=false` で人確認待ち停止

## 本番接続で必要になるSecret

Cloudflare Workerの実行環境にだけ設定する。

1. `LINE_CHANNEL_SECRET`
2. `PRIVATE_SINK_URL`
3. `PRIVATE_SINK_SHARED_SECRET`

これらの値をGitHubの通常ファイル、PRコメント、Issue、Actions artifactへ保存しない。

## LINE側に登録するWebhook URL

Workerを本番デプロイした後に発行されたURLの末尾へ `/webhook` を付ける。

例（実際のURLではない）:

`https://base-line-webhook.<account>.workers.dev/webhook`

## 接続後の安全確認順

1. `/health` が200を返す
2. LINE DevelopersのWebhook検証が成功する
3. テスト用LINEメッセージを1件送る
4. 非公開保存先に1件だけ入ることを確認する
5. AI判定・提案骨子が生成されることを確認する
6. 外部返信が自動送信されていないことを確認する
7. 問題なければ実運用へ進む

## 本人操作が必要な最初の1ステップ

BASEのLINE Official Account Managerで、対象アカウントの

`設定 → Messaging API`

を開く。

まだプロバイダー選択、Webhook変更、Channel secretの共有は行わず、画面状態を確認してから次へ進む。
