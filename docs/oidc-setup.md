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

## はじめに: OidcStack の初回デプロイ方法を選ぶ

OidcStack は「鶏と卵」問題があります。IaC で AWS 認証を設定するには、一度だけ AWS の認証情報が必要です。
状況に応じて以下の3つの方法から選択してください。

| 状況 | おすすめ |
|---|---|
| 個人・スタートアップ | **方法A: AWS CloudShell**（ローカル環境不要） |
| コンソール操作が好き・CLI を使いたくない | **方法B: AWS コンソールで手動作成** |
| チームで IaC の再現性を重視したい | **方法C: 一時キーで bootstrap して即削除** |

---

## 方法A: AWS CloudShell（一番手軽）

AWS コンソールにログインさえできれば、ブラウザ上のターミナルで CDK を実行できます。  
**ローカルの AWS CLI 設定・アクセスキー不要。**

1. [AWS コンソール](https://console.aws.amazon.com/) にログイン
2. 画面右上の **`>_`** アイコン（CloudShell）をクリック
3. 以下を実行：

```bash
npm install -g aws-cdk
git clone https://github.com/ricckyyy/planning-poker
cd planning-poker && npm install
cd infra
npx cdk bootstrap
npx cdk deploy OidcStack
```

デプロイ完了後、出力に表示される ARN をコピーします：

```
Outputs:
OidcStack.DeployRoleArn = arn:aws:iam::123456789012:role/github-actions-deploy-role
```

→ [Step 3](#step-3-github-secrets-に-deploy_role_arn-を登録) へ進む

---

## 方法B: AWS コンソールで手動作成（CDK・CLI 不要）

コンソールのポイント操作だけで OIDC プロバイダーと IAM ロールを作成します。

### B-1: OIDC プロバイダーを作成

1. [IAM → Identity providers](https://console.aws.amazon.com/iam/home#/identity_providers) を開く
2. **Add provider** をクリック
3. 以下を入力して **Add provider**：

   | 項目 | 値 |
   |---|---|
   | Provider type | `OpenID Connect` |
   | Provider URL | `https://token.actions.githubusercontent.com` |
   | Audience | `sts.amazonaws.com` |

### B-2: IAM ロールを作成

1. [IAM → Roles → Create role](https://console.aws.amazon.com/iam/home#/roles$new) を開く
2. **Trusted entity type**: `Web identity`
3. **Identity provider**: `token.actions.githubusercontent.com`
4. **Audience**: `sts.amazonaws.com`
5. **Add condition**:
   - Key: `token.actions.githubusercontent.com:sub`
   - Condition: `StringLike`
   - Value: `repo:ricckyyy/planning-poker:*`
6. **Permissions**: 以下のインラインポリシーを追加：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::*:role/cdk-*"
    }
  ]
}
```

7. **Role name**: `github-actions-deploy-role` と入力して作成

作成後、ロールの ARN（`arn:aws:iam::<アカウントID>:role/github-actions-deploy-role`）をコピーします。

> **注意**: 方法Bでは CDK bootstrap も手動で実施するか、方法AのCloudShellから `npx cdk bootstrap` だけ実行する必要があります。

→ [Step 3](#step-3-github-secrets-に-deploy_role_arn-を登録) へ進む

---

## 方法C: 一時キーで bootstrap して即削除

「キーを使ってキーを不要にする」パターン。以後は永遠にキー不要になります。

1. IAM で **最小権限の一時ユーザー**を作成し、アクセスキーを発行
2. ローカルで OidcStack をデプロイ：

```bash
export AWS_ACCESS_KEY_ID=<一時キー>
export AWS_SECRET_ACCESS_KEY=<一時シークレット>
export AWS_DEFAULT_REGION=ap-northeast-1

cd infra
npx cdk bootstrap
npx cdk deploy OidcStack
```

3. 出力の ARN をコピー
4. IAM から一時ユーザーとキーを**即座に削除**

> 一時ユーザーに必要な最小権限: `cloudformation:*`, `s3:*`, `iam:*`, `sts:AssumeRole`（CDK bootstrap 用）

→ [Step 3](#step-3-github-secrets-に-deploy_role_arn-を登録) へ進む

---

## Step 1: ARN の確認（方法A/C 共通）

ロール名を `github-actions-deploy-role` で固定しているため、ARN はデプロイ前から計算できます：

```
arn:aws:iam::<AWSアカウントID>:role/github-actions-deploy-role
```

アカウント ID の確認方法：
- AWS コンソール右上のアカウント名をクリック
- または `aws sts get-caller-identity --query Account --output text`

---

## Step 2: CDK bootstrap が済んでいるか確認

方法B 以外はデプロイ時に自動実行されますが、明示的に確認したい場合：

```bash
cd infra
npx cdk bootstrap aws://<AWSアカウントID>/ap-northeast-1
```

---

## Step 3: GitHub Secrets に DEPLOY_ROLE_ARN を登録 {#step-3-github-secrets-に-deploy_role_arn-を登録}

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
