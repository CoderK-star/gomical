# Cloud Run 手動デプロイ手順

このドキュメントは、ゴミカル RAG バックエンドを **手動で** Cloud Run にデプロイする手順です。

---

## 前提

- Google Cloud のプロジェクトが作成済み（例: `gomical-backend`）
- `gcloud` CLI がインストール済みで、`gcloud auth login` と `gcloud config set project <PROJECT_ID>` が完了していること
- 本プロジェクトでは **Artifact Registry** のリポジトリ `cloud-run-source-deploy` を使用（既に作成済み想定）

---

## 手順 1: プロジェクトとリージョンの確認

```powershell
# 現在のプロジェクトを確認
gcloud config get-value project

# 未設定なら設定（例: gomical-backend）
gcloud config set project gomical-backend
```

- **リージョン**: `asia-northeast1`（東京）
- **サービス名**: `gomical-rag`
- **イメージ**: `asia-northeast1-docker.pkg.dev/gomical-backend/cloud-run-source-deploy/gomical-rag`

---

## 手順 2: バックエンドディレクトリに移動

```powershell
cd c:\gomical\backend
```

（プロジェクトのパスは環境に合わせて変更してください。）

---

## 手順 3: Docker イメージのビルドとプッシュ

Cloud Build でイメージをビルドし、Artifact Registry にプッシュします。

```powershell
gcloud builds submit --tag asia-northeast1-docker.pkg.dev/gomical-backend/cloud-run-source-deploy/gomical-rag
```

- 初回やコード変更後は数分かかることがあります。
- 成功すると `SUCCESS` と表示されます。

**別プロジェクトを使う場合**は、`gomical-backend` の部分を自分のプロジェクト ID に置き換えてください。

---

## 手順 4: Cloud Run にデプロイ

プッシュしたイメージで Cloud Run のサービスを更新します。

```powershell
gcloud run deploy gomical-rag `
  --image asia-northeast1-docker.pkg.dev/gomical-backend/cloud-run-source-deploy/gomical-rag `
  --region asia-northeast1 `
  --platform managed `
  --allow-unauthenticated
```

- 既存の環境変数はそのまま維持されます。
- 環境変数を **追加・更新** する場合は、次のようにします。

```powershell
gcloud run deploy gomical-rag `
  --image asia-northeast1-docker.pkg.dev/gomical-backend/cloud-run-source-deploy/gomical-rag `
  --region asia-northeast1 `
  --platform managed `
  --allow-unauthenticated `
  --update-env-vars "EMBEDDING_TYPE=openrouter,EMBEDDING_MODEL_NAME=openai/text-embedding-3-small"
```

---

## 手順 5: デプロイ結果の確認

コマンド完了時に **Service URL** が表示されます。

例:

```
Service [gomical-rag] revision [gomical-rag-00005-xxx] has been deployed and is serving 100 percent of traffic.
Service URL: https://gomical-rag-1044619351781.asia-northeast1.run.app
```

- この URL がフロントの `app.json` の `expo.extra.backendUrl` と一致しているか確認してください。
- ブラウザや curl で動作確認:

```powershell
Invoke-RestMethod -Uri "https://gomical-rag-1044619351781.asia-northeast1.run.app/health" -Method GET
```

（URL は実際の Service URL に置き換えてください。）

---

## 環境変数の設定（コンソールから）

1. [Cloud Run コンソール](https://console.cloud.google.com/run) を開く
2. プロジェクトを選択し、サービス **gomical-rag** をクリック
3. **「編集」** をクリック
4. **「変数とシークレット」** タブで以下を設定（必要に応じて）

| 変数名 | 例・説明 |
|--------|----------|
| `OPENROUTER_API_KEY` | LLM 用 API キー（必須） |
| `PINECONE_API_KEY` | Pinecone API キー（必須） |
| `PINECONE_INDEX_NAME` | 例: `gomical-rag` または `gomical-rag-v2`（別インデックスを使う場合） |
| `LLM_MODEL_TYPE` | `openrouter` |
| `EMBEDDING_TYPE` | `openrouter` または `openai` または `ollama` |
| `EMBEDDING_MODEL_NAME` | OpenRouter 時: `openai/text-embedding-3-small` |
| `CORS_ORIGINS` | 未設定でよい（デフォルトで Vercel を許可） |

5. **「デプロイ」** で新しいリビジョンが作成されます。

---

## 別の Pinecone インデックスを使う（例: gomical-rag-v2）

別インデックス（例: `gomical-rag-v2`）を作った場合の、環境変数の変更場所と ingest の呼び方です。

### 環境変数を変える場所

**A. Cloud Run コンソール（推奨）**

1. [Cloud Run コンソール](https://console.cloud.google.com/run) を開く
2. サービス **gomical-rag** をクリック
3. **「編集」** をクリック
4. **「変数とシークレット」** タブを開く
5. **「変数を追加」** または既存の `PINECONE_INDEX_NAME` の **値を編集** する
6. 値を `gomical-rag-v2` にし、**「デプロイ」** で新しいリビジョンを作成する

**B. gcloud で更新する**

```powershell
gcloud run services update gomical-rag `
  --region asia-northeast1 `
  --update-env-vars "PINECONE_INDEX_NAME=gomical-rag-v2"
```

- これだけで新しいリビジョンが作成され、以降は `gomical-rag-v2` が使われます。
- **ローカル**で試す場合は `backend/.env` の `PINECONE_INDEX_NAME=gomical-rag-v2` に変更します（本番には反映されません）。

### ingest の呼び方（手順）

1. **Cloud Run の Service URL を用意する**  
   例: `https://gomical-rag-1044619351781.asia-northeast1.run.app`（実際の URL はコンソールまたはデプロイ時の表示で確認）

2. **コンテナにドキュメントがあるか確認する**  
   - コンテナの `data/raw` に PDF/TXT が無いと ingest は「ドキュメントが見つかりません」になります。
   - ドキュメントを入れるには、`backend/data/raw/` にファイルを置いてから **イメージをビルドし直し、Cloud Run を再デプロイ** してください。

3. **POST で /ingest を呼ぶ**

   **PowerShell の例:**

   ```powershell
   $url = "https://gomical-rag-1044619351781.asia-northeast1.run.app/ingest"
   Invoke-RestMethod -Uri $url -Method POST -ContentType "application/json"
   ```

   **curl の例（WSL や Git Bash など）:**

   ```bash
   curl -X POST "https://gomical-rag-1044619351781.asia-northeast1.run.app/ingest" \
     -H "Content-Type: application/json"
   ```

4. **成功時の例**  
   レスポンス例: `{"status":"success","chunks":123}` のように、取り込んだチャンク数が返ります。

5. **失敗時**  
   - `data/raw にドキュメントが見つかりません` → 上記のとおり `backend/data/raw/` にファイルを置き、イメージをビルドし直して再デプロイしてから再度 ingest を呼ぶ。
   - その他のエラーは Cloud Run の「ログ」で `query_rag error:` やトレースバックを確認する。

### まとめ（gomical-rag-v2 を使う流れ）

| 順番 | やること |
|------|----------|
| 1 | Cloud Run の環境変数で `PINECONE_INDEX_NAME=gomical-rag-v2` に変更し、デプロイ（または gcloud で更新） |
| 2 | （まだなら）`backend/data/raw/` に PDF/TXT を置き、ビルド＆デプロイ |
| 3 | `POST https://<あなたのService URL>/ingest` を実行 |
| 4 | 成功したらチャットボットから質問して動作確認 |

---

## トラブルシューティング

| 現象 | 確認すること |
|------|----------------|
| `gcr.io//gomical-rag` のようなエラー | `gcloud config set project <PROJECT_ID>` でプロジェクトを設定する |
| ビルドは成功するがプッシュで権限エラー | Artifact Registry のリポジトリが存在するか、Cloud Build の権限を確認する |
| 500 エラー・Ollama 接続エラー | ログで `Using embeddings: openrouter` が出ているか確認。出ていなければ `EMBEDDING_TYPE=openrouter` を設定する |
| Pinecone 400 エラー | 埋め込みモデルを変えた場合は、Pinecone のインデックスを削除してから `/ingest` で再取り込みする |
| **Container import failed**（リビジョン作成失敗） | 下記「Container import failed の対処」を参照 |

### Container import failed の対処

リビジョン作成で「Container import failed」と出る場合、次の可能性があります。

1. **イメージが大きすぎる**  
   `data/raw` をイメージに含めたことでサイズが増え、Cloud Run の制限（目安 10GB）に近づいている場合があります。  
   - **確認**: Artifact Registry でイメージサイズを確認する。  
   - **対処**: `.dockerignore` で `data/processed` を除外する。それでも大きい場合は、PDF を Cloud Storage に置き起動時に取得する方式を検討する。

2. **起動時のクラッシュやタイムアウト**  
   起動時の `lifespan` でドキュメント読み込みや Pinecone 接続に時間がかかり、ヘルスチェックに間に合っていない、または OOM で落ちている場合があります。  
   - **確認**: Cloud Run → 該当サービス → **「ログ」** タブで、失敗したリビジョンのログを確認する。  
     - フィルタ例: `resource.type="cloud_run_revision"` と `resource.labels.revision_name="gomical-rag-00011-xxx"`（失敗したリビジョン名）。  
   - **対処**: メモリを増やす（例: 1Gi → 2Gi）。必要なら「最小インスタンス数」を 0 のまま、起動後のタイムアウト設定を確認する。

3. **ファイルパス・文字コード**  
   `data/raw/柏市/` のように非 ASCII のディレクトリ名を含む場合、まれに環境によって問題になることがあります。  
   - **対処**: 一時的にフォルダ名をローマ字（例: `kashiwa`）に変えてビルドし直し、同じエラーが出るか確認する。

**まずやること**: Cloud Run の **ログ** で、失敗したリビジョン名を指定してエラーメッセージとスタックトレースを確認してください。原因が特定しやすくなります。

---

## 一覧: よく使うコマンド

```powershell
# プロジェクト確認
gcloud config get-value project

# ビルド＆プッシュ（backend ディレクトリで実行）
cd c:\gomical\backend
gcloud builds submit --tag asia-northeast1-docker.pkg.dev/gomical-backend/cloud-run-source-deploy/gomical-rag

# デプロイ（イメージのみ更新）
gcloud run deploy gomical-rag --image asia-northeast1-docker.pkg.dev/gomical-backend/cloud-run-source-deploy/gomical-rag --region asia-northeast1 --platform managed --allow-unauthenticated
```

以上が Cloud Run を手動でデプロイする手順です。

---

## Cloud Run の「ソース」に変更が反映されない場合

ローカルで `data/raw/` のディレクトリ名をローマ字（例: `kasiwa`, `nagareyama`）に変えてデプロイしたのに、Cloud Run の **「ソース」タブ** ではまだ日本語（柏市・流山市）のまま見えることがあります。

### 理由

1. **「ソース」は「今動いているイメージ」の内容ではないことがある**  
   Cloud Run の「ソース」は、**ビルドトリガーでリポジトリと連携している場合、リポジトリ側のコード**を表示していることがあります。手元で `gcloud builds submit` したときにアップロードしたディレクトリとは別の参照元（Git の状態）が表示されている可能性があります。

2. **どのビルドでデプロイしたか**  
   - **手動で `gcloud builds submit`** している場合: ビルドに使われるのは **そのときのローカル `backend/` の内容**です。ローカルがローマ字なら、イメージにはローマ字が入っています。  
   - **リポジトリ連携のビルドトリガー**でデプロイしている場合: ビルドに使われるのは **Git に push された時点のリポジトリ**です。ローカルでローマ字に変えても **push していない**と、イメージは古い（日本語のまま）です。

3. **Docker のキャッシュ**  
   過去の `COPY . .` がキャッシュされていると、古いディレクトリ構成のままイメージが作られることがあります。

### やること

| やり方 | 対応 |
|--------|------|
| **手動デプロイだけ** | キャッシュを外してビルドし直す（下記の `--no-cache`）。ローカルがローマ字なら、そのイメージでデプロイされる。 |
| **リポジトリ連携のトリガーでもデプロイしている** | ローカルの変更（`kasiwa`, `nagareyama` など）を **Git にコミットして push** する。その後トリガーでビルドされる内容がリポジトリと一致する。 |

**キャッシュなしでビルドする例**（`backend` で実行）:

```powershell
# Cloud Build でキャッシュを使わずにビルド（cloudbuild.yaml を使う場合）
# または、Dockerfile の COPY の前にキャッシュを無効化するためのダミーを入れる方法もある

# 簡易的に: ビルド時に --no-cache 相当にするには cloudbuild.yaml で docker build に --no-cache を渡す
# 以下は cloudbuild.yaml を使わない場合の代替: ローカルで確実にローマ字になっているか確認してから submit
gcloud builds submit --tag asia-northeast1-docker.pkg.dev/gomical-backend/cloud-run-source-deploy/gomical-rag
```

Cloud Build でキャッシュを無効化するには、`backend/` に次のような `cloudbuild.yaml` を置き、`gcloud builds submit --config=cloudbuild.yaml .` でビルドする方法があります（オプション）:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '--no-cache', '-t', 'asia-northeast1-docker.pkg.dev/gomical-backend/cloud-run-source-deploy/gomical-rag', '.']
images:
  - 'asia-northeast1-docker.pkg.dev/gomical-backend/cloud-run-source-deploy/gomical-rag'
```

**確認**: 実際に動いているコンテナの内容は、「ソース」タブではなく **Artifact Registry にプッシュされたイメージ**（または「ビルド履歴」でどのソースからビルドしたか）で判断する必要があります。ローカルをローマ字にしたうえで手動 `gcloud builds submit` し、その直後にデプロイしたリビジョンであれば、そのイメージにはローマ字のディレクトリが入っています。