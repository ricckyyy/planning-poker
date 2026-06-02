# Planning Poker — 設計書

**作成日**: 2026-06-03  
**ステータス**: 承認済み

---

## 概要

tenkir.fly.dev/ja に類似したプランニングポーカーアプリ。  
URLをシェアするだけでチームが同じ部屋に参加できる、シンプルなリアルタイム投票ツール。  
AWS 無料枠内で運用する完全サーバーレス構成。

---

## アーキテクチャ

```
[React + Vite (TypeScript)]  ←→  WebSocket  ←→  [API Gateway WebSocket API]
        Vercel ホスティング                                    ↓ Lambda invoke
                                                   [Lambda (TypeScript) × 3]
                                                              ↓ read/write
                                                       [DynamoDB (シングルテーブル)]
```

インフラは AWS CDK (TypeScript) で管理し、`cdk deploy` 一発で環境を再現できる。

---

## リポジトリ構成

```
planning-poker/
├── frontend/                   # React + Vite (TypeScript)
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx        # / → roomId生成 → /rooms/:roomId にリダイレクト
│       │   └── Room.tsx        # /rooms/:roomId — 投票画面
│       └── hooks/
│           └── usePoker.ts     # WebSocket接続・再接続・状態管理
├── backend/                    # AWS Lambda (TypeScript)
│   └── src/
│       ├── handlers/
│       │   ├── connect.ts      # $connect ハンドラー
│       │   ├── disconnect.ts   # $disconnect ハンドラー
│       │   └── message.ts      # $default ハンドラー（全メッセージ）
│       └── lib/
│           ├── dynamo.ts       # DynamoDB アクセス層
│           └── broadcast.ts    # @connections API でブロードキャスト
├── infra/                      # AWS CDK (TypeScript)
│   └── lib/
│       └── stack.ts            # WebSocket API + Lambda + DynamoDB 定義
└── package.json                # ワークスペース定義（npm workspaces）
```

---

## Room ID

- **形式**: nanoid 8文字（`a-z0-9`）例: `x3k9mw2p`
- **URL**: `/rooms/x3k9mw2p`
- **衝突対策**: DynamoDB PutItem を `attribute_not_exists(PK)` 条件付きで実行。衝突時は別IDを再生成してリトライ。

---

## DynamoDB スキーマ

**テーブル名**: `planning-poker`  
**設計**: シングルテーブル

| PK | SK | 属性 | 用途 |
|----|----|------|------|
| `ROOM#<roomId>` | `META` | `status`, `deckType`, `ttl` | 部屋のメタ情報 |
| `ROOM#<roomId>` | `MEMBER#<connId>` | `name`, `vote`, `ttl` | 参加者・投票値 |
| `CONN#<connId>` | `META` | `roomId`, `ttl` | 切断時に部屋を特定するため |

**TTL**: 書き込みのたびに `ttl = now + 3600秒` でリセット。最終活動から1時間後に自動削除。

**削除の2段構え**:
1. 参加者が0人になったとき → `$disconnect` ハンドラーが即座に部屋を削除（主）
2. TTL 1時間 → ゴミ掃除用の安全網（従）

**部屋のステータス**:
- `voting` — 投票中（カードは裏向き）
- `revealed` — 全カード公開済み

---

## WebSocket メッセージプロトコル

### クライアント → サーバー

```ts
// 参加
{ action: "join", roomId: "x3k9mw2p", name: "田中" }

// 投票（カード値）
{ action: "vote", vote: "5" }  // "1"|"2"|"3"|"5"|"8"|"13"|"21"|"?"|"☕"

// 全カード公開（誰でも実行可）
{ action: "reveal" }

// 次のラウンド（投票リセット）
{ action: "reset" }
```

### サーバー → 全員ブロードキャスト（状態全量）

```ts
{
  type: "state",
  roomId: "x3k9mw2p",
  status: "voting" | "revealed",
  members: [
    // voting中: vote は null（隠す）、hasVoted で投票済みかわかる
    { name: "田中", hasVoted: true,  vote: null },
    { name: "佐藤", hasVoted: false, vote: null },
    // revealed後: vote を公開
    { name: "田中", hasVoted: true,  vote: "5" },
    { name: "佐藤", hasVoted: true,  vote: "8" },
  ]
}
```

差分ではなく状態全量を毎回送ることでフロントの状態管理をシンプルに保つ。

---

## Lambda ハンドラー

### `connect.ts` ($connect)
- 接続時に `CONN#<connId>` レコードを仮作成（roomId はまだ未設定）

### `disconnect.ts` ($disconnect)
1. `CONN#<connId>` から `roomId` を取得
2. `roomId` が未設定（join前に切断）なら `CONN#<connId>` を削除して終了
3. `MEMBER#<connId>` を削除
4. 部屋の残メンバー数を確認
5. 0人なら `ROOM#META` も削除
6. 残メンバーがいれば最新状態をブロードキャスト

### `message.ts` ($default)
`action` フィールドで分岐:

| action | 処理 |
|--------|------|
| `join` | ROOM#META がなければ作成。MEMBER を作成。CONN に roomId を記録。全員にstate送信。 |
| `vote` | MEMBER の vote を更新。TTL リセット。全員にstate送信。 |
| `reveal` | ROOM#META の status を `revealed` に変更。TTL リセット。全員にstate送信。 |
| `reset` | 全 MEMBER の vote を null にリセット。status を `voting` に変更。全員にstate送信。 |

---

## フロントエンド

### ページ構成

| パス | 内容 |
|------|------|
| `/` | nanoid 8文字を生成し `/rooms/:roomId` にリダイレクト |
| `/rooms/:roomId` | 名前入力モーダル → 投票画面 |

### 状態遷移

```
[名前入力モーダル]
      ↓ join 送信
[投票中] — カードを選んで vote 送信
      ↓ 誰かが reveal
[結果表示] — 全員の投票値が公開
      ↓ 誰かが reset
[投票中] — 次のラウンドへ
```

### コンポーネント構成

```
Room.tsx
├── NameModal.tsx     — 初回参加時の名前入力
├── MemberList.tsx    — 参加者一覧（投票済み🟢 / 未投票⚪）
├── CardDeck.tsx      — 投票カード (1,2,3,5,8,13,21,?,☕)
├── RevealButton.tsx  — 「公開」ボタン（全員投票済みでハイライト）
└── ResetButton.tsx   — 「次のラウンド」ボタン
```

`usePoker.ts` が WebSocket 接続・自動再接続・状態管理を一元管理。  
各コンポーネントはこの hook から状態を受け取るだけ。

---

## カードデッキ

初期実装はフィボナッチのみ。デッキは配列定義なので追加は容易。

```ts
const DECKS = {
  fibonacci: ["1", "2", "3", "5", "8", "13", "21", "?", "☕"],
  // tshirt: ["XS", "S", "M", "L", "XL"],  // 将来追加予定
}
```

---

## インフラ (AWS CDK)

- **API Gateway WebSocket API** — ルート: `$connect`, `$disconnect`, `$default`
- **Lambda** — Node.js 22.x, TypeScript (esbuild でバンドル)
- **DynamoDB** — PAY_PER_REQUEST（オンデマンド）、TTL 有効
- **IAM** — Lambda に DynamoDB 読み書き権限 + `execute-api:ManageConnections` 権限

---

## コスト見積もり（無料枠）

| サービス | 無料枠 | 想定使用量 |
|----------|--------|-----------|
| Lambda | 1M リクエスト/月、400K GB-s/月 (永久) | 数千リクエスト/月 → 余裕 |
| API Gateway WebSocket | 1M メッセージ/月 (12ヶ月) | 数万メッセージ/月 → 余裕 |
| DynamoDB | 25 WCU/RCU、25 GB (永久) | 微量 → 余裕 |
| Vercel | 無料プラン | フロントのみ → 余裕 |

**12ヶ月経過後**: API Gateway のみ微課金の可能性あり（$1/百万メッセージ）。小規模利用なら実質無料。

---

## 未対応（スコープ外）

- 認証・ユーザー管理なし（URLを知っていれば誰でも入れる）
- ルームオーナー概念なし（誰でも reveal/reset できる）
- 投票履歴・ラウンド管理なし
- モバイル対応は基本的なレスポンシブのみ
