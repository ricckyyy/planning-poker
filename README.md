# Planning Poker

リアルタイム Planning Poker アプリ。AWS サーバーレス + React で構築。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                  React (Vercel CDN)                         │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket (wss://)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            API Gateway  WebSocket API (prod stage)          │
│                                                             │
│   $connect ──────► ConnectFn (Lambda)                       │
│   $disconnect ───► DisconnectFn (Lambda)                    │
│   $default ──────► MessageFn (Lambda)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  DynamoDB  (PAY_PER_REQUEST)                 │
│                  Table: planning-poker                      │
│                  TTL: 1時間 (自動削除)                        │
└─────────────────────────────────────────────────────────────┘
```

### データフロー

1. クライアントが WebSocket 接続 → `ConnectFn` が `CONN` レコードを保存
2. クライアントがアクション送信 → `MessageFn` がルーティング → DynamoDB 更新 → `broadcastState()` で全メンバーに送信
3. クライアントが切断 → `DisconnectFn` がメンバー削除、ルームが空なら削除、残りメンバーにブロードキャスト

各状態変化は **full state replacement** (差分パッチなし)。クライアントは毎回ルーム全体の状態を受け取る。

## DynamoDB データモデル

シングルテーブル設計。PK/SK パターン。

| PK | SK | 用途 |
|----|----|------|
| `ROOM#<roomId>` | `META` | ルームのメタデータ (`status`, `deckType`) |
| `ROOM#<roomId>` | `MEMBER#<connId>` | メンバー (`name`, `vote`) |
| `CONN#<connId>` | `META` | 接続 → ルームのマッピング (`roomId`) |

投票フェーズ中は `vote` フィールドは `null` でブロードキャスト。`status === "revealed"` になった時点で公開。

## WebSocket プロトコル

**クライアント → サーバー**

```json
{ "action": "join",   "roomId": "abc12345", "name": "Alice" }
{ "action": "vote",   "vote": "5" }
{ "action": "reveal" }
{ "action": "reset"  }
```

**サーバー → 全クライアント (ブロードキャスト)**

```json
{
  "status": "voting",
  "members": [
    { "name": "Alice", "hasVoted": true,  "vote": null },
    { "name": "Bob",   "hasVoted": false, "vote": null }
  ]
}
```

`status === "revealed"` のときのみ `vote` に値が入る。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 18, TypeScript, Vite 6, Tailwind CSS v4 |
| バックエンド | AWS Lambda (Node.js 22), TypeScript, esbuild |
| DB | Amazon DynamoDB (PAY_PER_REQUEST) |
| リアルタイム | API Gateway WebSocket API |
| インフラ | AWS CDK (TypeScript) |
| ホスティング | Vercel (フロントエンド), AWS (バックエンド・東京リージョン) |
| テスト | Vitest, @testing-library/react |

## プロジェクト構成

```
planning-poker/
├── frontend/          # React アプリ (Vercel)
│   ├── src/
│   │   ├── components/   # CardDeck, MemberList, NameModal, etc.
│   │   ├── hooks/
│   │   │   └── usePoker.ts  # WebSocket 管理・アクション
│   │   └── pages/
│   │       ├── Home.tsx     # ルームID生成 → リダイレクト
│   │       └── Room.tsx     # メイン画面
│   └── vite.config.ts
├── backend/           # Lambda 関数 (AWS)
│   └── src/
│       ├── handlers/
│       │   ├── connect.ts
│       │   ├── disconnect.ts
│       │   └── message.ts
│       └── lib/
│           ├── dynamo.ts    # DynamoDB 操作
│           └── broadcast.ts # 全接続へのステート配信
├── infra/             # AWS CDK スタック
│   └── lib/
│       └── stack.ts         # DynamoDB + Lambda × 3 + API Gateway
└── .github/workflows/
    └── deploy.yml           # バックエンド自動デプロイ
```

## ローカル開発

**前提条件:** Node.js 20+, AWS CLI (バックエンド開発時)

```bash
# 依存関係インストール
npm install

# フロントエンド開発サーバー起動 (localhost:5173)
npm run dev

# テスト実行
npm test                                          # バックエンド (Jest)
npm run test --prefix frontend                    # フロントエンド (Vitest)
```

フロントエンドの WebSocket 接続先は `.env.local` で設定:

```env
# frontend/.env.local
VITE_WS_URL=wss://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
```

## デプロイ

### バックエンド (自動)

`main` ブランチへの `backend/**` または `infra/**` の変更が GitHub Actions をトリガー → CDK デプロイ。

認証は **GitHub Actions OIDC** を使用。長期アクセスキー不要。

必要な GitHub Secrets:

- `DEPLOY_ROLE_ARN` — IAM ロール `github-actions-deploy-role` の ARN

初回セットアップは [docs/oidc-setup.md](docs/oidc-setup.md) を参照。

CDK デプロイ後、出力される `WebSocketUrl` を Vercel の環境変数 `VITE_WS_URL` に設定。

### フロントエンド (自動)

`main` ブランチへの `frontend/**` の変更が Vercel の自動デプロイをトリガー。

## ライセンス

MIT
