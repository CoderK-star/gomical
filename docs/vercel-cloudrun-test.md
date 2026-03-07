# Vercel（フロント）→ Cloud Run（バックエンド）接続テストと再デプロイ

## 構成

- **フロントエンド**: Vercel でホスティング（Expo Web ビルド）
- **バックエンド**: Google Cloud Run（FastAPI）
- **バックエンドURL**: `app.json` の `expo.extra.backendUrl` に記載（例: `https://xxxx.asia-northeast1.run.app`）

---

## 1. 接続テストのやり方

### 方法A: アプリ内でテスト（推奨）

1. Vercel の本番URL（例: `https://your-app.vercel.app`）にアクセスする。
2. 設定タブを開く。
3. **「バックエンド接続テスト」** をタップする。
4. 結果がアラートで表示される。
   - **接続成功**: ステータスと RAG 利用可否が表示される。
   - **接続失敗**: エラー内容（CORS・ネットワーク・URL 違いなど）が表示される。

これで「Vercel のオリジンから Cloud Run にリクエストが届いているか」を確認できます。

### 方法B: ブラウザや curl で直接確認

Cloud Run の URL が分かっている場合（`app.json` の `backendUrl` と同じ）：

```bash
# 疎通確認（Cloud Run の URL を実際の値に置き換え）
curl -s "https://gomical-rag-xxxxxxxx.asia-northeast1.run.app/health"
```

期待される例:

```json
{"status":"ready","rag_initialized":true}
```

または `"status":"loading","rag_initialized":false`（起動直後など）。

---

## 2. 接続できない場合の確認ポイント

| 確認項目 | 内容 |
|----------|------|
| **backendUrl** | `app.json` の `expo.extra.backendUrl` が、実際の Cloud Run の URL と一致しているか。 |
| **Vercel の再ビルド** | `app.json` を変更した場合は、Vercel で再デプロイしないとフロントに反映されない。 |
| **CORS** | バックエンドの `CORS_ORIGINS` が `*` または Vercel のドメインを含むか。Cloud Run の環境変数で設定。 |
| **Cloud Run の稼働** | サービスがデプロイ済みで、未使用時は 0 になっていても、リクエストで自動起動する。 |

---

## 3. 再デプロイが必要なとき

### フロント（Vercel）の再デプロイ

- **backendUrl を変えた場合**（Cloud Run の URL を変更したなど）  
  1. `app.json` の `expo.extra.backendUrl` を新しい Cloud Run URL に更新する。  
  2. コミットしてプッシュする。  
  3. Vercel が自動でビルド・デプロイする（または手動でデプロイ）。  
- 接続テスト用の「バックエンド接続テスト」を入れただけなら、同じ手順で再デプロイすれば反映される。

### バックエンド（Cloud Run）の再デプロイ

- コードや環境変数（API キーなど）を変えた場合:
  1. `backend` ディレクトリで Docker イメージをビルドする。  
  2. イメージを Artifact Registry などにプッシュする。  
  3. Cloud Run のサービスをそのイメージで更新する。

例（gcloud を使う場合）:

```bash
# プロジェクト・リージョンは環境に合わせて変更
export PROJECT_ID=your-gcp-project
export REGION=asia-northeast1
export SERVICE_NAME=gomical-rag

# イメージビルド＆プッシュ（Cloud Build 利用時）
cd backend
gcloud builds submit --tag gcr.io/${PROJECT_ID}/${SERVICE_NAME}

# Cloud Run にデプロイ
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME} \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated
```

- 環境変数（`OPENROUTER_API_KEY` など）は、Cloud Run の「環境変数」で設定する。`.env` は本番では使わず、Secret Manager 連携も検討できる。

---

## 4. まとめ

1. **通常の確認**: Vercel の本番URL → 設定 → **「バックエンド接続テスト」** で疎通確認。  
2. **backendUrl を変えたら**: `app.json` 更新 → コミット → Vercel 再デプロイ。  
3. **バックエンドを変えたら**: イメージの再ビルド・プッシュ → Cloud Run の再デプロイ。

これで「Vercel のフロントから Cloud Run にきちんとつながるか」をテストし、必要に応じて再デプロイできます。
