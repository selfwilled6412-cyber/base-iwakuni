# SAIKO BEAT PIANO RUSH – Android v0.5 試作

株式会社BASE／サイ校プロジェクト岩国のオリジナル4レーン音楽ゲーム。**YouTubeの映像は表示しない**。配布版ではYouTube音声抽出機能も無効。他社ゲームの素材・デザイン・音楽は複製しない。

## 実装した再生モード

- **すぐにプレイ**: アプリが生成するオリジナルPCM音楽を実際に波形解析し、生成されたノーツをタップ。解析に使用した同じ `AudioBuffer` をWebAudioで再生する。
- **端末内の音楽ファイル**: Androidのシステムファイル選択（Storage Access Framework）で権利のあるMP3/M4A/WAV等を選択。アプリ内一時キャッシュにコピーし、`MediaExtractor/MediaCodec` で実音声を解析。**同じ音声ファイルを `MediaPlayer` で再生**し、その `getCurrentPosition()` をタイル描画と判定の時計にする。48MiB以下、約5～600秒。WAVはPCM 8/16/24/32bit・32bit floatを端末内で直接解析。音声をサーバーへアップロードしない。
- **YouTube URL（デバッグ専用・非配布）**: NewPipeExtractorで音声ストリームを取得しようとするが、YouTube側のbot検知・403/429・SocketException等で失敗する可能性がある。実機成功は未確認。権利・利用規約の問題が解決するまでは商用機能にしない。

## ゲーム機能

4レーン落下タイル、PERFECT/GOOD/MISS、コンボ、スコア、結果画面、難易度3段階、タップ補正±200ms、マルチタッチ、押し続ける長いタイル（実音声の持続成分から推定）、一時停止・バックグラウンド復帰。Androidでの音声再生終了時には結果画面へ遷移する。端末によって音声出力遅延が異なるため、Galaxy実機での検証が必要。

## ビルドと検証

GitHub Actions `SAIKO BEAT Android APK` は `tests/validate-piano.cjs` と `tests/validate-piano-web.cjs` を実行し、デバッグAPKと未署名のリリースAPKをビルドする。リリース依存関係からNewPipeExtractor（GPL-3.0）とOkHttpを除外していることもCIで検査する。別ワークフロー `SAIKO Android Emulator UI Smoke` はエミュレーター起動・スクリーンショット・クラッシュログに加え、オリジナルWAVのPCM16/24/float32解析とPCM16の実MediaPlayer時計の進行を検証する（2026-11-01成功、15ノーツ）。

**CI成功＝実機で完成、ではない。** Android端末でのタップ判定・音声遅延・音源ファイル選択・YouTube成功は別々に検証する。検証手順とリリース条件は [QA-STATUS.md](QA-STATUS.md) を参照。

## リリース上の制限

デバッグAPKは動作確認専用。YouTubeの抽出機能はdebugソースセットに隔離し、releaseではUI・共有導線・抽出ライブラリを含めない。YouTubeの音声分離・抽出について、許諾や規約適合を確認せずに商用配信しない。商用化する場合は正規ライセンス済み音源カタログ、または適切な権利を持つ音楽を使う方式を優先する。課金・ストア公開・商用配布は承認まで行わない。
