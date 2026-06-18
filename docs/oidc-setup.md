# GitHub Actions → AWS OIDC 認証 設定手順

アクセスキー不要で GitHub Actions から AWS にデプロイする設定です。  
**費用: 無料**（IAM・OIDC プロバイダー・CDK はすべて無料）

---

## 概要

```
GitHub Actions
  │  OIDC トークン（一時的・自動発行）
  ▼
AWS IAM（OIDC プロバイダー）
  │  ロールを引き受ける（AssumeRoleWithWebIdentity）
  ▼
github-actions-deploy-role
  │  CDK bootstrap ロールを引き受ける
  ▼
CDK Deploy 実行
```

---

## 前提条件

- AWS CLI がローカルにインストール済み
- 既存の `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` でローカルから CDK を実行できる状態

---

## Step 1: CDK bootstrap が済んでいるか確認

CDK bootstrap が未実施の場合は先に実行します。

```bash
cd infra
npx cdk bootstrap aws://<AWSアカウントID>/ap-northeast-1
```

> アカウント ID は `aws sts get-caller-identity --query Account --output text` で確認できます。

---

## Step 2: OidcStack をデプロイ（一度だけ手動で実行）

```bash
cd infra
npx cdk deploy OidcStack
```

デプロイ完了後、出力に以下が表示されます：

```
Outputs:
OidcStack.DeployRoleArn = arn:aws:iam::123456789012:role/github-actions-deploy-role
```

この ARN をコピーしておきます。

---

## Step 3: GitHub Secrets に DEPLOY_ROLE_ARN を登録

1. GitHub リポジトリを開く
2. **Settings** → **Secrets and variables** → **Actions** を開く
3. **New repository secret** をクリック
4. 以下を入力して **Add secret**：

   | 項目 | 値 |
   |---|---|
   | Name | `DEPLOY_ROLE_ARN` |
   | Secret | Step 2 でコピーした ARN |

---

## Step 4: 古いシークレットを削除（任意）

以下のシークレットはもう不要なので削除できます：

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

---

## Step 5: 動作確認

`backend/` または `infra/` 配下のファイルを変更して `main` ブランチにプッシュします。

```bash
git push origin main
```

GitHub Actions の **Deploy Backend** ワークフローが OIDC 認証で実行されることを確認します。

---

## セキュリティの仕組み

| 項目 | 内容 |
|---|---|
| 有効期限 | トークンはジョブごとに自動発行・自動失効（漏洩リスクなし） |
| リポジトリ制限 | `ricckyyy/planning-poker` からのトークンのみ信頼 |
| 権限制限 | CDK bootstrap ロール（`cdk-*`）の引き受けのみ許可 |
| キー管理 | 長期アクセスキーは一切不要 |

---

## トラブルシューティング

### `Not authorized to perform sts:AssumeRoleWithWebIdentity`

- Step 2 の OidcStack デプロイが完了しているか確認
- GitHub Secret の `DEPLOY_ROLE_ARN` が正しいか確認

### `cdk deploy` が権限エラーになる

CDK bootstrap が実施されていない可能性があります。Step 1 の bootstrap を実行してください。
