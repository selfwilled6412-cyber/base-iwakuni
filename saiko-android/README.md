# SAIKO BEAT Native Android — 実機試作

**目的:** YouTube動画のURLを入力し、同じスマホ上で音を解析してノーツを生成。MP3や譜面の手動準備は不要。YouTube公式IFrameプレーヤーを可視表示し、再生位置からノーツを判定する。

## 方式
- JavaのAndroidアプリ。NewPipeExtractorのライブラリで動画の音声ストリームを解決し、端末内の一時キャッシュに取得。
- Android MediaExtractor/MediaCodecで音声をデコードし、音量の立ち上がりを計測してノーツの候補時刻を算出。取得した音声キャッシュは削除する。
- HTMLゲーム画面は既存の4レーン音ゲーを再利用。JS Native bridgeから譜面JSONを渡す。
- 公開サーバー、APIキー、Python、FFmpegは不要。Androidのみの動作検証用。ユーザーのスマホに設定画面やファイル選択を要求しない。

## 注意
**現在は試作、実際のYouTube曲に対する端末実機検証は未実施。** YouTubeの抽出制限、再生の埋め込み制限、デバイスのMediaCodec対応によって曲ごとに失敗することがある。実際にノーツが曲と合うかも確認が必要。

YouTubeの利用条件や楽曲の権利問題は解消しない。DRM回避やログイン情報・Cookieの要求は行わない。商用配布の前に別途レビューする。

## APKビルド
GitHub Actions「SAIKO Android APK」を使用。 `app-debug.apk` を成果物としてアップロードする。まだ公式販売版ではない。
