# GomiCal チャットボット実装計画（Dify.ai + GPT-4o-mini）

## 概要

GomiCalアプリに、Dify.aiクラウド版を利用したLLM+RAGチャットボット機能を追加する。
ユーザが「シャンプーのボトルは何ゴミ？」「次の燃やすごみの日はいつ？」のような自然言語の質問をすると、
ユーザの選択自治体のデータをもとにRAGで回答する。

---

## Step 1: ナレッジベース用ドキュメント準備

### 目的
19自治体のJSONデータ（合計約3.5MB）をDifyのナレッジベースにアップロードできるMarkdown形式に変換する。
Difyは生JSONの理解が弱いため、人間が読める形式に変換するスクリプトを作成する。

### 作成ファイル
- `scripts/generateKnowledgeBase.ts` — JSONからMarkdownへの変換スクリプト

### 変換ロジック
各自治体JSONから以下のMarkdownを生成（1自治体1ファイル）:

```markdown
# 流山市（千葉県）のごみ分別ガイド

## ごみの種類

### 燃やすごみ
- 説明: 生ごみ、紙くず、衣類、革製品など
- 収集時間: 朝8:30まで
- ルール:
  - 流山市家庭用指定ごみ袋（黒字）に入れて出す
  - 生ごみは水切りをする
  ...

## 地区別収集スケジュール

### 地区1（流山5丁目、...）
- 燃やすごみ: 毎週 月曜日・木曜日
- プラスチック: 毎週 水曜日
- 燃やさないごみ: 第2・第4 金曜日
...

## 特別ルール
- 祝日: 収集なし
- 年末年始: 12/29〜1/3 収集なし
```

さらに、検索用データ（`src/data/search/*.json`）から品名→分別のマッピングもMarkdownに変換:

```markdown
# 流山市 ごみ分別辞典

| 品名 | 分別 | 備考 |
|------|------|------|
| 生ごみ | 燃やすごみ | |
| シャンプーボトル | 容器包装プラスチック | |
...
```

### 出力先
- `knowledge-base/` ディレクトリ（`.gitignore`に追加）

---

## Step 2: Dify クラウド設定（手動）

以下は手動でDifyダッシュボードで行うセットアップ手順:

1. **アカウント作成**: https://cloud.dify.ai でサインアップ
2. **ナレッジベース作成**:
   - 「ナレッジ」→「作成」
   - Step 1で生成したMarkdownファイル（19自治体分）をアップロード
   - チャンク設定: 自動（デフォルト）
   - 埋め込みモデル: text-embedding-3-small
3. **チャットボットアプリ作成**:
   - 「アプリを作成」→「チャットボット」
   - モデル: GPT-4o-mini
   - ナレッジベースを添付
   - コンテキスト変数: `municipality_name`（ユーザの自治体名）
4. **システムプロンプト設定**（後述）
5. **APIキー取得**: 「アクセスAPI」→ APIキーを発行

### システムプロンプト（案）

```
あなたは日本のごみ分別アシスタント「ゴミカルBot」です。

ユーザの自治体: {{municipality_name}}

以下のルールに従って回答してください:
1. ナレッジベースの情報のみに基づいて回答する
2. ナレッジベースにない情報は「自治体の公式サイトをご確認ください」と案内する
3. 回答は簡潔に（3文以内を目安）
4. ごみの種類名は自治体データに合わせる
5. 収集日の質問には、曜日パターンで回答する（「毎週月曜日と木曜日」等）
6. ユーザの質問が日本語なら日本語で、英語なら英語で回答する
```

---

## Step 3: APIサービス実装

### 作成ファイル
- `src/services/difyService.ts`

### 内容

```typescript
// Dify Chat API クライアント
const DIFY_API_URL = 'https://api.dify.ai/v1';

interface DifyMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DifyResponse {
  answer: string;
  conversation_id: string;
  message_id: string;
}

export async function sendChatMessage(
  message: string,
  conversationId: string | null,
  municipalityName: string,
  apiKey: string,
): Promise<DifyResponse> {
  const response = await fetch(`${DIFY_API_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: { municipality_name: municipalityName },
      query: message,
      response_mode: 'blocking',
      conversation_id: conversationId ?? '',
      user: 'gomical-user',
    }),
  });
  return response.json();
}
```

### APIキー管理
- `app.json` の `extra` フィールドに `difyApiKey` を配置
- `expo-constants` で読み取り
- 本番は環境変数で管理（EAS Secrets）

---

## Step 4: チャットUI画面の作成

### 作成ファイル
- `app/(tabs)/chat.tsx` — チャットタブ画面

### UIデザイン

既存の検索画面（`search.tsx`）のパターンに準拠:

```
┌────────────────────────────┐
│ ヘッダー: ゴミ分別アシスタント    │
├────────────────────────────┤
│                            │
│  [Bot] こんにちは！ごみの    │
│  分別について質問してね。     │
│                            │
│       [User] シャンプーの   │
│       ボトルは何ゴミ？      │
│                            │
│  [Bot] シャンプーのボトルは  │
│  容器包装プラスチックです。   │
│  キャップも同じ分別です。    │
│                            │
│  (typing indicator...)      │
│                            │
├────────────────────────────┤
│ [入力欄............] [送信]  │
└────────────────────────────┘
```

### コンポーネント構成

```
chat.tsx
├── MessageBubble（ユーザ/Bot別のスタイル）
│   - Bot: 左寄せ、surfaceSecondary背景、Ionicons chatbubble-ellipses アイコン
│   - User: 右寄せ、primary背景、白文字
├── TypingIndicator（「...」アニメーション）
├── MessageList（FlatList、inverted）
└── InputBar（TextInput + 送信ボタン）
```

### 状態管理
- `useState` でメッセージ配列、conversationId、ローディング状態を管理
- 会話の localStorage 永続化は MVP では不要（画面遷移でリセット）

---

## Step 5: タブナビゲーションへの追加

### 変更ファイル
- `app/(tabs)/_layout.tsx` — 5番目のタブ追加

```typescript
<Tabs.Screen
  name="chat"
  options={{
    title: t('tabs.chat'),
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
    ),
  }}
/>
```

### 変更ファイル
- `src/i18n/ja.ts` — チャット関連翻訳追加
- `src/i18n/en.ts` — 英語翻訳追加

```typescript
// ja.ts に追加
tabs: {
  ...
  chat: 'チャット',
},
chat: {
  title: 'ゴミ分別アシスタント',
  placeholder: '質問を入力...',
  send: '送信',
  greeting: 'こんにちは！ごみの分別や収集日について質問してね。',
  errorMessage: '回答を取得できませんでした。もう一度お試しください。',
  noArea: '地区を設定してからご利用ください',
},
```

---

## 作成・変更ファイル一覧

| ファイル | 操作 | 内容 |
|---------|------|------|
| `scripts/generateKnowledgeBase.ts` | 新規 | JSON→Markdown変換スクリプト |
| `src/services/difyService.ts` | 新規 | Dify API クライアント |
| `app/(tabs)/chat.tsx` | 新規 | チャットUI画面 |
| `app/(tabs)/_layout.tsx` | 変更 | 5番目タブ追加 |
| `src/i18n/ja.ts` | 変更 | チャット翻訳追加 |
| `src/i18n/en.ts` | 変更 | チャット翻訳追加 |
| `app.json` | 変更 | Dify APIキー設定欄追加 |
| `.gitignore` | 変更 | `knowledge-base/` 追加 |

---

## 実装順序

1. `scripts/generateKnowledgeBase.ts` を作成・実行 → Markdownファイル生成
2. Dify ダッシュボード設定（手動）→ ナレッジベース＆アプリ作成 → APIキー取得
3. `src/services/difyService.ts` 作成
4. `app/(tabs)/chat.tsx` 作成
5. `app/(tabs)/_layout.tsx`、i18n、`app.json` 変更
6. 動作確認

---

## 検証方法

1. `npx ts-node scripts/generateKnowledgeBase.ts` でMarkdown生成を確認
2. Difyダッシュボードでテストチャット（ブラウザ上で動作確認）
3. `npx expo start` でアプリ起動
4. チャットタブからテスト質問:
   - 「シャンプーのボトルは何ゴミ？」→ 容器包装プラスチック
   - 「次の燃やすごみはいつ？」→ 曜日パターンで回答
   - 「電池の捨て方は？」→ 有害危険ごみのルール
   - 英語: "How should I dispose of batteries?" → English answer
5. エラーケース確認: ネットワーク切断時のエラー表示
