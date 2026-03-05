# Gomical Launch Checklist (Android / Google Play)

## Pre-Launch (1週間前)

- [ ] アプリ名「ゴミカル」の商標検索（J-PlatPat: https://www.j-platpat.inpit.go.jp/）
- [ ] プライバシーポリシーをWebページとして公開（GitHub Pages / Notion等）
- [ ] 利用規約をWebページとして公開
- [ ] Google Play Developer登録（$25 一回のみ）
- [ ] Google Play Consoleでアプリを作成
- [ ] Google Cloud Consoleでサービスアカウント作成 → JSONキーをダウンロード → `google-services.json` としてプロジェクトルートに配置
- [ ] EAS Projectにリンク: `eas init`
- [ ] app.jsonの `extra.eas.projectId` を設定
- [ ] 実機でフル動作確認（Android）

## Build & Submit

```bash
# 本番用ビルド
eas build --platform android --profile production

# Google Playへ提出
eas submit --platform android --profile production
```

## Store Listing (Google Play Console)

- [ ] アプリアイコン（512x512）をアップロード
- [ ] フィーチャーグラフィック（1024x500）をアップロード
- [ ] スクリーンショット（1080x1920以上）を最低2枚アップロード
- [ ] ストア説明文を設定（docs/store-listing.md 参照）
- [ ] カテゴリ: ライフスタイル / ユーティリティ
- [ ] コンテンツレーティング質問票を回答（対象年齢: 13歳以上）
- [ ] Data Safety セクションを申告
- [ ] プライバシーポリシーURLを設定
- [ ] 連絡先メールアドレスを設定
- [ ] 国/地域の配信範囲を設定

## Post-Launch マーケティング

### Week 1: 初期認知
- [ ] X/Twitter アカウント作成（@gomical_app等）
- [ ] 初回投稿: アプリ公開のお知らせ
- [ ] Zennに技術記事投稿: 「個人開発でごみアプリを作ってストアに公開した話」
- [ ] Product Huntに投稿

### Week 2-4: 拡散
- [ ] Reddit投稿: r/japanlife, r/movingtojapan
- [ ] キャラクターを使った「今日のごみの日」定期投稿開始
- [ ] 対応自治体のユーザからのフィードバック収集開始
- [ ] Qiitaに技術記事: 「Expo + React Nativeで通知カレンダーアプリ」

### Month 2+: 継続
- [ ] ユーザリクエストに基づき自治体データ追加
- [ ] Google Playのレビュー返信
- [ ] SNS定期投稿の継続（週2-3回）
- [ ] 外国人コミュニティ（Facebook等）で告知

## KPIトラッキング

| 指標 | 1ヶ月目標 | 3ヶ月目標 |
|------|----------|----------|
| ダウンロード | 100 | 1,000 |
| DAU | 20 | 200 |
| レビュー数 | 5 | 30 |
| 平均評価 | 4.0+ | 4.0+ |
| 対応自治体数 | 3 | 10 |
