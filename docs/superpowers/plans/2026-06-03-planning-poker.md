# Planning Poker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React + Vite (Vercel) ↔ WebSocket ↔ API Gateway ↔ Lambda ↔ DynamoDB でリアルタイムプランニングポーカーを構築する。URLをシェアするだけでチームが同じ部屋に参加できる。

**Architecture:** AWS CDK でインフラ全体を管理（DynamoDB シングルテーブル + API Gateway WebSocket API + Lambda 3関数）。フロントは React + Vite を Vercel にデプロイ。WebSocket は状態変化のたびに全量ブロードキャスト。

**Tech Stack:** React 18, react-router-dom v6, Vite 6, TypeScript, nanoid 5, AWS CDK v2, Lambda Node.js 22, @aws-sdk v3, aws-sdk-client-mock, Jest + ts-jest, Vercel CLI

---

> ⭐ **Milestone 1** (Task 2 完了後): WebSocket エンドポイントが AWS に稼働
> ⭐ **Milestone 2** (Task 5 完了後): バックエンド全機能完成、wscat でテスト可能
> ⭐ **Milestone 3** (Task 7 完了後): localhost でフル動作確認
> ⭐ **Milestone 4** (Task 8 完了後): Vercel URL で本番稼働

---

## File Map

```
planning-poker/
├── package.json                          # npm workspaces ルート
├── .gitignore
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── vercel.json
│   ├── .env.local                        # VITE_WS_URL (gitignore済み)
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── pages/
│       │   ├── Home.tsx                  # / → nanoid生成 → /rooms/:id リダイレクト
│       │   └── Room.tsx                  # /rooms/:roomId 投票画面
│       ├── components/
│       │   ├── NameModal.tsx
│       │   ├── MemberList.tsx
│       │   ├── CardDeck.tsx
│       │   ├── RevealButton.tsx
│       │   └── ResetButton.tsx
│       └── hooks/
│           └── usePoker.ts               # WebSocket接続・再接続・状態管理
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   └── src/
│       ├── handlers/
│       │   ├── connect.ts
│       │   ├── disconnect.ts
│       │   ├── message.ts
│       │   └── __tests__/
│       │       ├── connect.test.ts
│       │       ├── disconnect.test.ts
│       │       └── message.test.ts
│       └── lib/
│           ├── dynamo.ts
│           ├── broadcast.ts
│           └── __tests__/
│               ├── dynamo.test.ts
│               └── broadcast.test.ts
└── infra/
    ├── package.json
    ├── tsconfig.json
    ├── cdk.json
    ├── bin/
    │   └── app.ts
    └── lib/
        └── stack.ts
```

---

### Task 0: AWS Prerequisites（初回のみ）

**Files:** なし（セットアップのみ）

- [ ] **Step 1: AWS アカウントを作成する**

  https://aws.amazon.com/ → "AWS アカウントを作成" → メールアドレス・パスワード・クレジットカード（無料枠内なら請求なし）を入力。「ベーシックサポート（無料）」を選択。

- [ ] **Step 2: IAM ユーザーを作成する**

  AWS コンソール（ブラウザ）で：
  1. 検索バーに "IAM" → ユーザー → ユーザーを作成
  2. ユーザー名: `planning-poker-dev`
  3. 許可: ポリシーを直接アタッチ → `AdministratorAccess`（開発用）
  4. 作成後: セキュリティ認証情報タブ → アクセスキーを作成 → "コマンドラインインターフェイス(CLI)"
  5. `アクセスキー ID` と `シークレットアクセスキー` を安全な場所にコピーして保存

- [ ] **Step 3: ツールをインストールする**

  ```bash
  # AWS CLI (macOS)
  brew install awscli

  # CDK をグローバルインストール
  npm install -g aws-cdk

  # バージョン確認
  aws --version    # aws-cli/2.x.x
  cdk --version    # 2.x.x
  node --version   # v22.x.x
  ```

- [ ] **Step 4: AWS CLI を設定する**

  ```bash
  aws configure
  ```

  入力内容：
  ```
  AWS Access Key ID: （Step 2 で保存したキー）
  AWS Secret Access Key: （Step 2 で保存したキー）
  Default region name: ap-northeast-1
  Default output format: json
  ```

  確認：
  ```bash
  aws sts get-caller-identity
  # Account, UserId, Arn が表示されれば成功
  ```

- [ ] **Step 5: CDK をブートストラップする（アカウントごとに1回だけ必要）**

  ```bash
  # Step 4 の出力の "Account" の数字を使う
  cdk bootstrap aws://123456789012/ap-northeast-1
  ```

  期待する出力:
  ```
  ✅  Environment aws://123456789012/ap-northeast-1 bootstrapped.
  ```

---

### Task 1: Monorepo & Git Setup

**Files:**
- Create: `planning-poker/package.json`
- Create: `planning-poker/.gitignore`

- [ ] **Step 1: Git を初期化する**

  ```bash
  cd /Users/rikit/Documents/GitHub/planning-poker
  git init
  ```

- [ ] **Step 2: ルート package.json を作成する**

  ```json
  {
    "name": "planning-poker",
    "private": true,
    "workspaces": ["frontend", "backend", "infra"],
    "scripts": {
      "dev": "npm run dev --workspace=frontend",
      "test": "npm run test --workspace=backend",
      "deploy": "npm run deploy --workspace=infra"
    }
  }
  ```

- [ ] **Step 3: .gitignore を作成する**

  ```
  node_modules/
  dist/
  .env.local
  cdk.out/
  *.js
  *.d.ts
  !jest.config.js
  ```

- [ ] **Step 4: コミットする**

  ```bash
  git add package.json .gitignore docs/
  git commit -m "chore: init monorepo and add design docs"
  ```

---

### Task 2: CDK Infrastructure & First Deploy

**Files:**
- Create: `infra/package.json`
- Create: `infra/tsconfig.json`
- Create: `infra/cdk.json`
- Create: `infra/bin/app.ts`
- Create: `infra/lib/stack.ts`
- Create: `backend/src/handlers/connect.ts` (スタブ)
- Create: `backend/src/handlers/disconnect.ts` (スタブ)
- Create: `backend/src/handlers/message.ts` (スタブ)
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`

- [ ] **Step 1: infra/package.json を作成する**

  ```json
  {
    "name": "infra",
    "private": true,
    "scripts": {
      "deploy": "cdk deploy --require-approval never",
      "destroy": "cdk destroy"
    },
    "dependencies": {
      "aws-cdk-lib": "^2.170.0",
      "constructs": "^10.0.0"
    },
    "devDependencies": {
      "aws-cdk": "^2.170.0",
      "esbuild": "^0.25.0",
      "ts-node": "^10.0.0",
      "typescript": "^5.0.0",
      "@types/node": "^22.0.0"
    }
  }
  ```

- [ ] **Step 2: infra/tsconfig.json を作成する**

  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "commonjs",
      "lib": ["ES2020"],
      "strict": true,
      "esModuleInterop": true,
      "outDir": "cdk.out"
    },
    "include": ["bin", "lib"]
  }
  ```

- [ ] **Step 3: infra/cdk.json を作成する**

  ```json
  {
    "app": "npx ts-node bin/app.ts",
    "watch": { "include": ["**"] },
    "context": {
      "@aws-cdk/aws-lambda:recognizeLayerVersion": true
    }
  }
  ```

- [ ] **Step 4: infra/bin/app.ts を作成する**

  ```ts
  import * as cdk from 'aws-cdk-lib';
  import { PlanningPokerStack } from '../lib/stack';

  const app = new cdk.App();
  new PlanningPokerStack(app, 'PlanningPokerStack', {
    env: { region: 'ap-northeast-1' },
  });
  ```

- [ ] **Step 5: infra/lib/stack.ts を作成する**

  ```ts
  import * as cdk from 'aws-cdk-lib';
  import { Construct } from 'constructs';
  import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
  import * as lambda from 'aws-cdk-lib/aws-lambda';
  import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
  import * as iam from 'aws-cdk-lib/aws-iam';
  import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
  import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
  import * as path from 'path';

  export class PlanningPokerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);

      const table = new dynamodb.Table(this, 'Table', {
        tableName: 'planning-poker',
        partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        timeToLiveAttribute: 'ttl',
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      const fnProps = {
        runtime: lambda.Runtime.NODEJS_22_X,
        environment: { TABLE_NAME: table.tableName },
      };

      const connectFn = new NodejsFunction(this, 'ConnectFn', {
        ...fnProps,
        entry: path.join(__dirname, '../../backend/src/handlers/connect.ts'),
      });

      const disconnectFn = new NodejsFunction(this, 'DisconnectFn', {
        ...fnProps,
        entry: path.join(__dirname, '../../backend/src/handlers/disconnect.ts'),
      });

      const messageFn = new NodejsFunction(this, 'MessageFn', {
        ...fnProps,
        entry: path.join(__dirname, '../../backend/src/handlers/message.ts'),
      });

      table.grantReadWriteData(connectFn);
      table.grantReadWriteData(disconnectFn);
      table.grantReadWriteData(messageFn);

      const api = new WebSocketApi(this, 'Api', {
        connectRouteOptions: {
          integration: new WebSocketLambdaIntegration('ConnectInt', connectFn),
        },
        disconnectRouteOptions: {
          integration: new WebSocketLambdaIntegration('DisconnectInt', disconnectFn),
        },
        defaultRouteOptions: {
          integration: new WebSocketLambdaIntegration('MessageInt', messageFn),
        },
      });

      const stage = new WebSocketStage(this, 'Stage', {
        webSocketApi: api,
        stageName: 'prod',
        autoDeploy: true,
      });

      const connectionsArn = `arn:aws:execute-api:${this.region}:${this.account}:${api.apiId}/prod/POST/@connections/*`;
      const connectionsPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['execute-api:ManageConnections'],
        resources: [connectionsArn],
      });
      disconnectFn.addToRolePolicy(connectionsPolicy);
      messageFn.addToRolePolicy(connectionsPolicy);

      new cdk.CfnOutput(this, 'WebSocketUrl', { value: stage.url });
    }
  }
  ```

- [ ] **Step 6: Lambda スタブハンドラーを作成する（CDK のバンドルに必要）**

  `backend/src/handlers/connect.ts`:
  ```ts
  export const handler = async () => ({ statusCode: 200 });
  ```

  `backend/src/handlers/disconnect.ts`:
  ```ts
  export const handler = async () => ({ statusCode: 200 });
  ```

  `backend/src/handlers/message.ts`:
  ```ts
  export const handler = async () => ({ statusCode: 200 });
  ```

- [ ] **Step 7: backend/package.json を作成する**

  ```json
  {
    "name": "backend",
    "private": true,
    "scripts": {
      "test": "jest"
    },
    "dependencies": {
      "@aws-sdk/client-dynamodb": "^3.0.0",
      "@aws-sdk/client-apigatewaymanagementapi": "^3.0.0",
      "@aws-sdk/lib-dynamodb": "^3.0.0"
    },
    "devDependencies": {
      "@types/aws-lambda": "^8.10.0",
      "@types/node": "^22.0.0",
      "aws-sdk-client-mock": "^4.0.0",
      "jest": "^29.0.0",
      "ts-jest": "^29.0.0",
      "typescript": "^5.0.0"
    }
  }
  ```

- [ ] **Step 8: backend/tsconfig.json を作成する**

  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "commonjs",
      "strict": true,
      "esModuleInterop": true,
      "outDir": "dist"
    },
    "include": ["src"]
  }
  ```

- [ ] **Step 9: 依存パッケージをインストールしてデプロイする**

  ```bash
  cd /Users/rikit/Documents/GitHub/planning-poker
  npm install
  cd infra
  npx cdk deploy --require-approval never
  ```

  末尾に表示される出力を確認：
  ```
  ✅  PlanningPokerStack

  Outputs:
  PlanningPokerStack.WebSocketUrl = wss://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod
  ```

  **この WebSocket URL をメモしておく（後で frontend/.env.local に使う）。**

  ⭐ **Milestone 1: AWS WebSocket エンドポイント稼働中！**

- [ ] **Step 10: コミットする**

  ```bash
  git add infra/ backend/
  git commit -m "feat: add CDK stack and stub Lambda handlers"
  ```

---

### Task 3: Backend DynamoDB Library

**Files:**
- Create: `backend/src/lib/dynamo.ts`
- Create: `backend/src/lib/__tests__/dynamo.test.ts`
- Create: `backend/jest.config.js`

- [ ] **Step 1: jest.config.js を作成する**

  ```js
  module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
  };
  ```

- [ ] **Step 2: テストを先に書く**

  `backend/src/lib/__tests__/dynamo.test.ts`:

  ```ts
  import { mockClient } from 'aws-sdk-client-mock';
  import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
  import { saveConn, getConn, deleteConn, createRoom, saveMember, getMembers } from '../dynamo';

  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
    process.env.TABLE_NAME = 'planning-poker';
  });

  test('saveConn sends PutCommand with correct item', async () => {
    ddbMock.on(PutCommand).resolves({});
    await saveConn('conn-1', 'room-abc');
    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input.Item).toMatchObject({
      PK: 'CONN#conn-1',
      SK: 'META',
      roomId: 'room-abc',
    });
  });

  test('getConn returns item when found', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { PK: 'CONN#conn-1', SK: 'META', roomId: 'room-abc' },
    });
    const result = await getConn('conn-1');
    expect(result?.roomId).toBe('room-abc');
  });

  test('getConn returns null when not found', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    const result = await getConn('conn-1');
    expect(result).toBeNull();
  });

  test('getMembers returns array of members', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { PK: 'ROOM#abc', SK: 'MEMBER#conn-1', name: '田中', vote: '5' },
        { PK: 'ROOM#abc', SK: 'MEMBER#conn-2', name: '佐藤', vote: null },
      ],
    });
    const members = await getMembers('abc');
    expect(members).toHaveLength(2);
    expect(members[0].name).toBe('田中');
  });

  test('createRoom sends PutCommand with attribute_not_exists condition', async () => {
    ddbMock.on(PutCommand).resolves({});
    await createRoom('room-abc');
    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls[0].args[0].input.ConditionExpression).toBe('attribute_not_exists(PK)');
    expect(calls[0].args[0].input.Item).toMatchObject({
      PK: 'ROOM#room-abc',
      SK: 'META',
      status: 'voting',
    });
  });
  ```

- [ ] **Step 3: テストが失敗することを確認する**

  ```bash
  cd /Users/rikit/Documents/GitHub/planning-poker/backend
  npx jest --testPathPattern=dynamo.test
  ```

  期待する結果: FAIL — "Cannot find module '../dynamo'"

- [ ] **Step 4: backend/src/lib/dynamo.ts を実装する**

  ```ts
  import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
  import {
    DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand,
    QueryCommand, UpdateCommand,
  } from '@aws-sdk/lib-dynamodb';

  const client = new DynamoDBClient({});
  const ddb = DynamoDBDocumentClient.from(client);
  const TABLE = () => process.env.TABLE_NAME!;
  const ttl = () => Math.floor(Date.now() / 1000) + 3600;

  export async function saveConn(connId: string, roomId?: string) {
    await ddb.send(new PutCommand({
      TableName: TABLE(),
      Item: { PK: `CONN#${connId}`, SK: 'META', roomId, ttl: ttl() },
    }));
  }

  export async function getConn(connId: string): Promise<{ roomId?: string } | null> {
    const r = await ddb.send(new GetCommand({
      TableName: TABLE(),
      Key: { PK: `CONN#${connId}`, SK: 'META' },
    }));
    return (r.Item as { roomId?: string }) ?? null;
  }

  export async function deleteConn(connId: string) {
    await ddb.send(new DeleteCommand({
      TableName: TABLE(),
      Key: { PK: `CONN#${connId}`, SK: 'META' },
    }));
  }

  export async function createRoom(roomId: string) {
    await ddb.send(new PutCommand({
      TableName: TABLE(),
      Item: {
        PK: `ROOM#${roomId}`, SK: 'META',
        status: 'voting', deckType: 'fibonacci', ttl: ttl(),
      },
      ConditionExpression: 'attribute_not_exists(PK)',
    }));
  }

  export async function getRoomMeta(roomId: string): Promise<{ status: 'voting' | 'revealed' } | null> {
    const r = await ddb.send(new GetCommand({
      TableName: TABLE(),
      Key: { PK: `ROOM#${roomId}`, SK: 'META' },
    }));
    return (r.Item as { status: 'voting' | 'revealed' }) ?? null;
  }

  export async function saveMember(roomId: string, connId: string, name: string) {
    await ddb.send(new PutCommand({
      TableName: TABLE(),
      Item: { PK: `ROOM#${roomId}`, SK: `MEMBER#${connId}`, name, vote: null, ttl: ttl() },
    }));
  }

  export async function updateVote(roomId: string, connId: string, vote: string) {
    await ddb.send(new UpdateCommand({
      TableName: TABLE(),
      Key: { PK: `ROOM#${roomId}`, SK: `MEMBER#${connId}` },
      UpdateExpression: 'SET vote = :v, #t = :t',
      ExpressionAttributeNames: { '#t': 'ttl' },
      ExpressionAttributeValues: { ':v': vote, ':t': ttl() },
    }));
  }

  export async function deleteMember(roomId: string, connId: string) {
    await ddb.send(new DeleteCommand({
      TableName: TABLE(),
      Key: { PK: `ROOM#${roomId}`, SK: `MEMBER#${connId}` },
    }));
  }

  export async function getMembers(
    roomId: string,
  ): Promise<Array<{ SK: string; name: string; vote: string | null }>> {
    const r = await ddb.send(new QueryCommand({
      TableName: TABLE(),
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `ROOM#${roomId}`, ':sk': 'MEMBER#' },
    }));
    return (r.Items ?? []) as Array<{ SK: string; name: string; vote: string | null }>;
  }

  export async function setRoomStatus(roomId: string, status: 'voting' | 'revealed') {
    await ddb.send(new UpdateCommand({
      TableName: TABLE(),
      Key: { PK: `ROOM#${roomId}`, SK: 'META' },
      UpdateExpression: 'SET #s = :s, #t = :t',
      ExpressionAttributeNames: { '#s': 'status', '#t': 'ttl' },
      ExpressionAttributeValues: { ':s': status, ':t': ttl() },
    }));
  }

  export async function deleteRoom(roomId: string) {
    await ddb.send(new DeleteCommand({
      TableName: TABLE(),
      Key: { PK: `ROOM#${roomId}`, SK: 'META' },
    }));
  }

  export async function resetVotes(roomId: string, connIds: string[]) {
    await Promise.all(connIds.map(connId =>
      ddb.send(new UpdateCommand({
        TableName: TABLE(),
        Key: { PK: `ROOM#${roomId}`, SK: `MEMBER#${connId}` },
        UpdateExpression: 'SET vote = :null, #t = :t',
        ExpressionAttributeNames: { '#t': 'ttl' },
        ExpressionAttributeValues: { ':null': null, ':t': ttl() },
      }))
    ));
  }
  ```

- [ ] **Step 5: テストがパスすることを確認する**

  ```bash
  npx jest --testPathPattern=dynamo.test
  ```

  期待する結果: PASS (5 tests)

- [ ] **Step 6: コミットする**

  ```bash
  git add backend/src/lib/dynamo.ts backend/src/lib/__tests__/dynamo.test.ts backend/jest.config.js
  git commit -m "feat: add DynamoDB library with tests"
  ```

---

### Task 4: Backend Broadcast Library

**Files:**
- Create: `backend/src/lib/broadcast.ts`
- Create: `backend/src/lib/__tests__/broadcast.test.ts`

- [ ] **Step 1: テストを先に書く**

  `backend/src/lib/__tests__/broadcast.test.ts`:

  ```ts
  import { mockClient } from 'aws-sdk-client-mock';
  import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
  import * as dynamo from '../dynamo';
  import { broadcastState } from '../broadcast';

  jest.mock('../dynamo');
  const mockedDynamo = dynamo as jest.Mocked<typeof dynamo>;
  const mgmtMock = mockClient(ApiGatewayManagementApiClient);

  beforeEach(() => {
    mgmtMock.reset();
    jest.clearAllMocks();
  });

  test('voting 中は vote を null にして送信する', async () => {
    mockedDynamo.getRoomMeta.mockResolvedValue({ status: 'voting' });
    mockedDynamo.getMembers.mockResolvedValue([
      { SK: 'MEMBER#conn-1', name: '田中', vote: '5' },
      { SK: 'MEMBER#conn-2', name: '佐藤', vote: null },
    ]);
    mockedDynamo.deleteMember.mockResolvedValue(undefined);
    mockedDynamo.deleteConn.mockResolvedValue(undefined);
    mgmtMock.on(PostToConnectionCommand).resolves({});

    await broadcastState('room-abc', 'https://example.com');

    const calls = mgmtMock.commandCalls(PostToConnectionCommand);
    expect(calls).toHaveLength(2);
    const payload = JSON.parse(Buffer.from(calls[0].args[0].input.Data as Uint8Array).toString());
    expect(payload.status).toBe('voting');
    expect(payload.members[0].vote).toBeNull();
    expect(payload.members[0].hasVoted).toBe(true);
  });

  test('revealed 状態では vote を公開する', async () => {
    mockedDynamo.getRoomMeta.mockResolvedValue({ status: 'revealed' });
    mockedDynamo.getMembers.mockResolvedValue([
      { SK: 'MEMBER#conn-1', name: '田中', vote: '5' },
    ]);
    mockedDynamo.deleteMember.mockResolvedValue(undefined);
    mockedDynamo.deleteConn.mockResolvedValue(undefined);
    mgmtMock.on(PostToConnectionCommand).resolves({});

    await broadcastState('room-abc', 'https://example.com');

    const calls = mgmtMock.commandCalls(PostToConnectionCommand);
    const payload = JSON.parse(Buffer.from(calls[0].args[0].input.Data as Uint8Array).toString());
    expect(payload.members[0].vote).toBe('5');
  });

  test('meta が null のとき何も送信しない', async () => {
    mockedDynamo.getRoomMeta.mockResolvedValue(null);
    mockedDynamo.getMembers.mockResolvedValue([]);

    await broadcastState('room-abc', 'https://example.com');

    expect(mgmtMock.commandCalls(PostToConnectionCommand)).toHaveLength(0);
  });
  ```

- [ ] **Step 2: テストが失敗することを確認する**

  ```bash
  npx jest --testPathPattern=broadcast.test
  ```

  期待する結果: FAIL — "Cannot find module '../broadcast'"

- [ ] **Step 3: backend/src/lib/broadcast.ts を実装する**

  ```ts
  import {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand,
    GoneException,
  } from '@aws-sdk/client-apigatewaymanagementapi';
  import { getRoomMeta, getMembers, deleteMember, deleteConn } from './dynamo';

  export async function broadcastState(roomId: string, endpoint: string) {
    const [meta, members] = await Promise.all([getRoomMeta(roomId), getMembers(roomId)]);
    if (!meta) return;

    const isRevealed = meta.status === 'revealed';
    const message = JSON.stringify({
      type: 'state',
      roomId,
      status: meta.status,
      members: members.map(m => ({
        name: m.name,
        hasVoted: m.vote !== null,
        vote: isRevealed ? m.vote : null,
      })),
    });

    const mgmt = new ApiGatewayManagementApiClient({ endpoint });
    const payload = Buffer.from(message);

    await Promise.allSettled(
      members.map(async m => {
        const connId = m.SK.replace('MEMBER#', '');
        try {
          await mgmt.send(new PostToConnectionCommand({ ConnectionId: connId, Data: payload }));
        } catch (e) {
          if (e instanceof GoneException) {
            await Promise.all([deleteMember(roomId, connId), deleteConn(connId)]);
          }
        }
      })
    );
  }
  ```

- [ ] **Step 4: テストがパスすることを確認する**

  ```bash
  npx jest --testPathPattern=broadcast.test
  ```

  期待する結果: PASS (3 tests)

- [ ] **Step 5: コミットする**

  ```bash
  git add backend/src/lib/broadcast.ts backend/src/lib/__tests__/broadcast.test.ts
  git commit -m "feat: add broadcast library with tests"
  ```

---

### Task 5: Backend Lambda Handlers

**Files:**
- Modify: `backend/src/handlers/connect.ts`
- Modify: `backend/src/handlers/disconnect.ts`
- Modify: `backend/src/handlers/message.ts`
- Create: `backend/src/handlers/__tests__/connect.test.ts`
- Create: `backend/src/handlers/__tests__/disconnect.test.ts`
- Create: `backend/src/handlers/__tests__/message.test.ts`

- [ ] **Step 1: connect のテストを書く**

  `backend/src/handlers/__tests__/connect.test.ts`:

  ```ts
  import * as dynamo from '../../lib/dynamo';
  import { handler } from '../connect';

  jest.mock('../../lib/dynamo');
  const mockedDynamo = dynamo as jest.Mocked<typeof dynamo>;

  const event = (connectionId: string) =>
    ({ requestContext: { connectionId } } as any);

  test('接続時に saveConn を呼ぶ', async () => {
    mockedDynamo.saveConn.mockResolvedValue(undefined);
    const result = await handler(event('conn-1'), {} as any, {} as any) as any;
    expect(result.statusCode).toBe(200);
    expect(mockedDynamo.saveConn).toHaveBeenCalledWith('conn-1');
  });
  ```

- [ ] **Step 2: disconnect のテストを書く**

  `backend/src/handlers/__tests__/disconnect.test.ts`:

  ```ts
  import * as dynamo from '../../lib/dynamo';
  import * as broadcast from '../../lib/broadcast';
  import { handler } from '../disconnect';

  jest.mock('../../lib/dynamo');
  jest.mock('../../lib/broadcast');
  const mockedDynamo = dynamo as jest.Mocked<typeof dynamo>;
  const mockedBroadcast = broadcast as jest.Mocked<typeof broadcast>;

  const event = (connectionId: string) => ({
    requestContext: { connectionId, domainName: 'example.execute-api.amazonaws.com', stage: 'prod' },
  } as any);

  beforeEach(() => jest.clearAllMocks());

  test('roomId 未設定のまま切断した場合は conn を削除するだけ', async () => {
    mockedDynamo.getConn.mockResolvedValue({ roomId: undefined });
    mockedDynamo.deleteConn.mockResolvedValue(undefined);

    const result = await handler(event('conn-1'), {} as any, {} as any) as any;
    expect(result.statusCode).toBe(200);
    expect(mockedDynamo.deleteMember).not.toHaveBeenCalled();
  });

  test('最後のメンバーが退出したら部屋を削除する', async () => {
    mockedDynamo.getConn.mockResolvedValue({ roomId: 'room-abc' });
    mockedDynamo.deleteConn.mockResolvedValue(undefined);
    mockedDynamo.deleteMember.mockResolvedValue(undefined);
    mockedDynamo.getMembers.mockResolvedValue([]);
    mockedDynamo.deleteRoom.mockResolvedValue(undefined);

    await handler(event('conn-1'), {} as any, {} as any);

    expect(mockedDynamo.deleteRoom).toHaveBeenCalledWith('room-abc');
    expect(mockedBroadcast.broadcastState).not.toHaveBeenCalled();
  });

  test('残メンバーがいれば状態をブロードキャストする', async () => {
    mockedDynamo.getConn.mockResolvedValue({ roomId: 'room-abc' });
    mockedDynamo.deleteConn.mockResolvedValue(undefined);
    mockedDynamo.deleteMember.mockResolvedValue(undefined);
    mockedDynamo.getMembers.mockResolvedValue([
      { SK: 'MEMBER#conn-2', name: '佐藤', vote: null },
    ]);
    mockedBroadcast.broadcastState.mockResolvedValue(undefined);

    await handler(event('conn-1'), {} as any, {} as any);

    expect(mockedBroadcast.broadcastState).toHaveBeenCalledWith(
      'room-abc',
      'https://example.execute-api.amazonaws.com/prod',
    );
  });
  ```

- [ ] **Step 3: message のテストを書く**

  `backend/src/handlers/__tests__/message.test.ts`:

  ```ts
  import * as dynamo from '../../lib/dynamo';
  import * as broadcast from '../../lib/broadcast';
  import { handler } from '../message';

  jest.mock('../../lib/dynamo');
  jest.mock('../../lib/broadcast');
  const mockedDynamo = dynamo as jest.Mocked<typeof dynamo>;
  const mockedBroadcast = broadcast as jest.Mocked<typeof broadcast>;

  const event = (connectionId: string, body: object) => ({
    requestContext: { connectionId, domainName: 'example.execute-api.amazonaws.com', stage: 'prod' },
    body: JSON.stringify(body),
  } as any);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedBroadcast.broadcastState.mockResolvedValue(undefined);
  });

  test('join: 部屋とメンバーを作成してブロードキャストする', async () => {
    mockedDynamo.createRoom.mockResolvedValue(undefined);
    mockedDynamo.saveMember.mockResolvedValue(undefined);
    mockedDynamo.saveConn.mockResolvedValue(undefined);

    await handler(event('conn-1', { action: 'join', roomId: 'room-abc', name: '田中' }), {} as any, {} as any);

    expect(mockedDynamo.createRoom).toHaveBeenCalledWith('room-abc');
    expect(mockedDynamo.saveMember).toHaveBeenCalledWith('room-abc', 'conn-1', '田中');
    expect(mockedDynamo.saveConn).toHaveBeenCalledWith('conn-1', 'room-abc');
    expect(mockedBroadcast.broadcastState).toHaveBeenCalledWith(
      'room-abc',
      'https://example.execute-api.amazonaws.com/prod',
    );
  });

  test('vote: 投票値を更新してブロードキャストする', async () => {
    mockedDynamo.getConn.mockResolvedValue({ roomId: 'room-abc' });
    mockedDynamo.updateVote.mockResolvedValue(undefined);

    await handler(event('conn-1', { action: 'vote', vote: '5' }), {} as any, {} as any);

    expect(mockedDynamo.updateVote).toHaveBeenCalledWith('room-abc', 'conn-1', '5');
    expect(mockedBroadcast.broadcastState).toHaveBeenCalled();
  });

  test('reveal: ステータスを revealed に変更する', async () => {
    mockedDynamo.getConn.mockResolvedValue({ roomId: 'room-abc' });
    mockedDynamo.setRoomStatus.mockResolvedValue(undefined);

    await handler(event('conn-1', { action: 'reveal' }), {} as any, {} as any);

    expect(mockedDynamo.setRoomStatus).toHaveBeenCalledWith('room-abc', 'revealed');
  });

  test('reset: 全投票をクリアして voting に戻す', async () => {
    mockedDynamo.getConn.mockResolvedValue({ roomId: 'room-abc' });
    mockedDynamo.getMembers.mockResolvedValue([
      { SK: 'MEMBER#conn-1', name: '田中', vote: '5' },
      { SK: 'MEMBER#conn-2', name: '佐藤', vote: '8' },
    ]);
    mockedDynamo.resetVotes.mockResolvedValue(undefined);
    mockedDynamo.setRoomStatus.mockResolvedValue(undefined);

    await handler(event('conn-1', { action: 'reset' }), {} as any, {} as any);

    expect(mockedDynamo.resetVotes).toHaveBeenCalledWith('room-abc', ['conn-1', 'conn-2']);
    expect(mockedDynamo.setRoomStatus).toHaveBeenCalledWith('room-abc', 'voting');
  });
  ```

- [ ] **Step 4: テストが失敗することを確認する**

  ```bash
  npx jest
  ```

  期待する結果: FAIL — ハンドラーがスタブのため

- [ ] **Step 5: connect.ts を実装する**

  `backend/src/handlers/connect.ts` を置き換える:

  ```ts
  import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
  import { saveConn } from '../lib/dynamo';

  export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
    await saveConn(event.requestContext.connectionId);
    return { statusCode: 200 };
  };
  ```

- [ ] **Step 6: disconnect.ts を実装する**

  `backend/src/handlers/disconnect.ts` を置き換える:

  ```ts
  import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
  import { getConn, deleteConn, deleteMember, getMembers, deleteRoom } from '../lib/dynamo';
  import { broadcastState } from '../lib/broadcast';

  export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
    const connId = event.requestContext.connectionId;
    const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;

    const conn = await getConn(connId);
    await deleteConn(connId);

    if (!conn?.roomId) return { statusCode: 200 };

    const { roomId } = conn;
    await deleteMember(roomId, connId);

    const remaining = await getMembers(roomId);
    if (remaining.length === 0) {
      await deleteRoom(roomId);
    } else {
      await broadcastState(roomId, endpoint);
    }

    return { statusCode: 200 };
  };
  ```

- [ ] **Step 7: message.ts を実装する**

  `backend/src/handlers/message.ts` を置き換える:

  ```ts
  import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
  import {
    getConn, saveConn, createRoom, saveMember,
    updateVote, setRoomStatus, getMembers, resetVotes,
  } from '../lib/dynamo';
  import { broadcastState } from '../lib/broadcast';

  type Message =
    | { action: 'join'; roomId: string; name: string }
    | { action: 'vote'; vote: string }
    | { action: 'reveal' }
    | { action: 'reset' };

  export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
    const connId = event.requestContext.connectionId;
    const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
    const msg = JSON.parse(event.body ?? '{}') as Message;

    switch (msg.action) {
      case 'join': {
        const { roomId, name } = msg;
        try { await createRoom(roomId); } catch { /* 既存の部屋は無視 */ }
        await Promise.all([saveMember(roomId, connId, name), saveConn(connId, roomId)]);
        await broadcastState(roomId, endpoint);
        break;
      }
      case 'vote': {
        const conn = await getConn(connId);
        if (!conn?.roomId) break;
        await updateVote(conn.roomId, connId, msg.vote);
        await broadcastState(conn.roomId, endpoint);
        break;
      }
      case 'reveal': {
        const conn = await getConn(connId);
        if (!conn?.roomId) break;
        await setRoomStatus(conn.roomId, 'revealed');
        await broadcastState(conn.roomId, endpoint);
        break;
      }
      case 'reset': {
        const conn = await getConn(connId);
        if (!conn?.roomId) break;
        const members = await getMembers(conn.roomId);
        const connIds = members.map(m => m.SK.replace('MEMBER#', ''));
        await Promise.all([resetVotes(conn.roomId, connIds), setRoomStatus(conn.roomId, 'voting')]);
        await broadcastState(conn.roomId, endpoint);
        break;
      }
    }

    return { statusCode: 200 };
  };
  ```

- [ ] **Step 8: 全テストがパスすることを確認する**

  ```bash
  cd /Users/rikit/Documents/GitHub/planning-poker/backend
  npx jest
  ```

  期待する結果: PASS (全テスト)

- [ ] **Step 9: AWS に再デプロイする**

  ```bash
  cd /Users/rikit/Documents/GitHub/planning-poker/infra
  npx cdk deploy --require-approval never
  ```

- [ ] **Step 10: wscat でスモークテストする**

  ```bash
  npm install -g wscat
  wscat -c "wss://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod"
  # Connected (press CTRL+C to quit)
  > {"action":"join","roomId":"testroom1","name":"田中"}
  < {"type":"state","roomId":"testroom1","status":"voting","members":[{"name":"田中","hasVoted":false,"vote":null}]}
  > {"action":"vote","vote":"5"}
  < {"type":"state","roomId":"testroom1","status":"voting","members":[{"name":"田中","hasVoted":true,"vote":null}]}
  > {"action":"reveal"}
  < {"type":"state","roomId":"testroom1","status":"revealed","members":[{"name":"田中","hasVoted":true,"vote":"5"}]}
  ```

  ⭐ **Milestone 2: バックエンド全機能動作確認！**

- [ ] **Step 11: コミットする**

  ```bash
  git add backend/src/
  git commit -m "feat: implement Lambda WebSocket handlers with tests"
  ```

---

### Task 6: Frontend Scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`

- [ ] **Step 1: frontend/package.json を作成する**

  ```json
  {
    "name": "frontend",
    "private": true,
    "scripts": {
      "dev": "vite",
      "build": "tsc && vite build",
      "preview": "vite preview"
    },
    "dependencies": {
      "nanoid": "^5.0.0",
      "react": "^18.0.0",
      "react-dom": "^18.0.0",
      "react-router-dom": "^6.0.0"
    },
    "devDependencies": {
      "@types/react": "^18.0.0",
      "@types/react-dom": "^18.0.0",
      "@vitejs/plugin-react": "^4.0.0",
      "typescript": "^5.0.0",
      "vite": "^6.0.0"
    }
  }
  ```

- [ ] **Step 2: frontend/tsconfig.json を作成する**

  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "lib": ["ES2020", "DOM", "DOM.Iterable"],
      "module": "ESNext",
      "moduleResolution": "bundler",
      "jsx": "react-jsx",
      "strict": true,
      "noEmit": true
    },
    "include": ["src"]
  }
  ```

- [ ] **Step 3: frontend/vite.config.ts を作成する**

  ```ts
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';

  export default defineConfig({ plugins: [react()] });
  ```

- [ ] **Step 4: frontend/index.html を作成する**

  ```html
  <!DOCTYPE html>
  <html lang="ja">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Planning Poker</title>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/src/main.tsx"></script>
    </body>
  </html>
  ```

- [ ] **Step 5: frontend/src/main.tsx を作成する**

  ```tsx
  import React from 'react';
  import ReactDOM from 'react-dom/client';
  import App from './App';

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  ```

- [ ] **Step 6: frontend/src/App.tsx を作成する**

  ```tsx
  import { BrowserRouter, Routes, Route } from 'react-router-dom';
  import Home from './pages/Home';
  import Room from './pages/Room';

  export default function App() {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rooms/:roomId" element={<Room />} />
        </Routes>
      </BrowserRouter>
    );
  }
  ```

- [ ] **Step 7: 依存をインストールして dev server を起動する**

  ```bash
  cd /Users/rikit/Documents/GitHub/planning-poker
  npm install
  cd frontend
  npx vite
  ```

  http://localhost:5173 を開く → 白いページが表示されればOK（ページはまだ未実装）。

- [ ] **Step 8: コミットする**

  ```bash
  git add frontend/
  git commit -m "feat: add frontend Vite + React scaffold"
  ```

---

### Task 7: Frontend Pages & Components

**Files:**
- Create: `frontend/.env.local`
- Create: `frontend/src/pages/Home.tsx`
- Create: `frontend/src/hooks/usePoker.ts`
- Create: `frontend/src/components/NameModal.tsx`
- Create: `frontend/src/components/MemberList.tsx`
- Create: `frontend/src/components/CardDeck.tsx`
- Create: `frontend/src/components/RevealButton.tsx`
- Create: `frontend/src/components/ResetButton.tsx`
- Create: `frontend/src/pages/Room.tsx`

- [ ] **Step 1: frontend/.env.local を作成する**

  ```
  VITE_WS_URL=wss://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod
  ```

  `YOUR_API_ID` は Task 2 の CDK デプロイ出力の URL から取得する。

- [ ] **Step 2: frontend/src/pages/Home.tsx を作成する**

  ```tsx
  import { useEffect } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { customAlphabet } from 'nanoid';

  const generateId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

  export default function Home() {
    const navigate = useNavigate();
    useEffect(() => {
      navigate(`/rooms/${generateId()}`, { replace: true });
    }, [navigate]);
    return null;
  }
  ```

- [ ] **Step 3: frontend/src/hooks/usePoker.ts を作成する**

  ```ts
  import { useState, useEffect, useRef, useCallback } from 'react';

  export interface Member {
    name: string;
    hasVoted: boolean;
    vote: string | null;
  }

  export interface PokerState {
    status: 'voting' | 'revealed';
    members: Member[];
  }

  export interface UsePokerReturn {
    state: PokerState | null;
    connected: boolean;
    join: (roomId: string, name: string) => void;
    vote: (value: string) => void;
    reveal: () => void;
    reset: () => void;
  }

  export function usePoker(): UsePokerReturn {
    const [state, setState] = useState<PokerState | null>(null);
    const [connected, setConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(() => {
      const ws = new WebSocket(import.meta.env.VITE_WS_URL as string);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'state') setState({ status: msg.status, members: msg.members });
      };
      ws.onclose = () => {
        setConnected(false);
        timerRef.current = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();
    }, []);

    useEffect(() => {
      connect();
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        wsRef.current?.close();
      };
    }, [connect]);

    const send = useCallback((msg: object) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(msg));
      }
    }, []);

    return {
      state,
      connected,
      join: useCallback((roomId, name) => send({ action: 'join', roomId, name }), [send]),
      vote: useCallback((value) => send({ action: 'vote', vote: value }), [send]),
      reveal: useCallback(() => send({ action: 'reveal' }), [send]),
      reset: useCallback(() => send({ action: 'reset' }), [send]),
    };
  }
  ```

- [ ] **Step 4: frontend/src/components/NameModal.tsx を作成する**

  ```tsx
  import { useState, FormEvent } from 'react';

  interface Props {
    onJoin: (name: string) => void;
  }

  export default function NameModal({ onJoin }: Props) {
    const [name, setName] = useState('');

    const handleSubmit = (e: FormEvent) => {
      e.preventDefault();
      if (name.trim()) onJoin(name.trim());
    };

    return (
      <div style={overlay}>
        <div style={modal}>
          <h2>Planning Poker</h2>
          <p>あなたの名前を入力してください</p>
          <form onSubmit={handleSubmit}>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="名前"
              style={{ padding: '8px', fontSize: '16px', width: '200px' }}
            />
            <br /><br />
            <button type="submit" disabled={!name.trim()} style={{ padding: '8px 24px', fontSize: '16px' }}>
              参加する
            </button>
          </form>
        </div>
      </div>
    );
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  const modal: React.CSSProperties = {
    background: 'white', padding: '40px', borderRadius: '8px', textAlign: 'center',
  };
  ```

- [ ] **Step 5: frontend/src/components/MemberList.tsx を作成する**

  ```tsx
  import { Member } from '../hooks/usePoker';

  interface Props {
    members: Member[];
    status: 'voting' | 'revealed';
  }

  export default function MemberList({ members, status }: Props) {
    return (
      <div>
        <h3>参加者 ({members.length}人)</h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {members.map(m => (
            <div key={m.name} style={cardStyle(m.hasVoted, status)}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {status === 'revealed' && m.vote ? m.vote : (m.hasVoted ? '✓' : '?')}
              </div>
              <div style={{ fontSize: '14px' }}>{m.name}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const cardStyle = (hasVoted: boolean, status: string): React.CSSProperties => ({
    width: '80px', height: '100px', border: '2px solid',
    borderColor: hasVoted ? '#4CAF50' : '#ccc',
    borderRadius: '8px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '8px',
    background: status === 'revealed' ? '#fff9c4' : (hasVoted ? '#e8f5e9' : 'white'),
  });
  ```

- [ ] **Step 6: frontend/src/components/CardDeck.tsx を作成する**

  ```tsx
  const CARDS = ['1', '2', '3', '5', '8', '13', '21', '?', '☕'];

  interface Props {
    selectedVote: string | null;
    onVote: (value: string) => void;
    disabled: boolean;
  }

  export default function CardDeck({ selectedVote, onVote, disabled }: Props) {
    return (
      <div>
        <h3>カードを選ぶ</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {CARDS.map(card => (
            <button
              key={card}
              onClick={() => onVote(card)}
              disabled={disabled}
              style={{
                width: '60px', height: '80px', fontSize: '18px',
                cursor: disabled ? 'default' : 'pointer',
                border: '2px solid',
                borderColor: selectedVote === card ? '#1976d2' : '#ccc',
                borderRadius: '8px',
                background: selectedVote === card ? '#e3f2fd' : 'white',
                fontWeight: selectedVote === card ? 'bold' : 'normal',
              }}
            >
              {card}
            </button>
          ))}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 7: frontend/src/components/RevealButton.tsx を作成する**

  ```tsx
  interface Props {
    allVoted: boolean;
    onClick: () => void;
  }

  export default function RevealButton({ allVoted, onClick }: Props) {
    return (
      <button
        onClick={onClick}
        style={{
          padding: '12px 32px', fontSize: '18px', cursor: 'pointer',
          background: allVoted ? '#4CAF50' : '#9E9E9E',
          color: 'white', border: 'none', borderRadius: '8px',
        }}
      >
        カードを公開
      </button>
    );
  }
  ```

- [ ] **Step 8: frontend/src/components/ResetButton.tsx を作成する**

  ```tsx
  interface Props { onClick: () => void; }

  export default function ResetButton({ onClick }: Props) {
    return (
      <button
        onClick={onClick}
        style={{
          padding: '12px 32px', fontSize: '18px', cursor: 'pointer',
          background: '#2196F3', color: 'white', border: 'none', borderRadius: '8px',
        }}
      >
        次のラウンド
      </button>
    );
  }
  ```

- [ ] **Step 9: frontend/src/pages/Room.tsx を作成する**

  ```tsx
  import { useEffect, useState } from 'react';
  import { useParams } from 'react-router-dom';
  import { usePoker } from '../hooks/usePoker';
  import NameModal from '../components/NameModal';
  import MemberList from '../components/MemberList';
  import CardDeck from '../components/CardDeck';
  import RevealButton from '../components/RevealButton';
  import ResetButton from '../components/ResetButton';

  export default function Room() {
    const { roomId } = useParams<{ roomId: string }>();
    const { state, connected, join, vote, reveal, reset } = usePoker();
    const [myName, setMyName] = useState<string | null>(null);
    const [myVote, setMyVote] = useState<string | null>(null);

    useEffect(() => {
      if (connected && myName && roomId) {
        join(roomId, myName);
      }
    }, [connected, myName, roomId]);

    useEffect(() => {
      if (state?.status === 'voting') setMyVote(null);
    }, [state?.status]);

    const handleVote = (value: string) => {
      setMyVote(value);
      vote(value);
    };

    if (!myName) return <NameModal onJoin={setMyName} />;

    const allVoted = (state?.members ?? []).length > 0 &&
      (state?.members ?? []).every(m => m.hasVoted);

    return (
      <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Planning Poker</h1>
        <p style={{ color: connected ? 'green' : 'red' }}>
          {connected ? '接続中' : '再接続中...'}
        </p>
        <p style={{ fontFamily: 'monospace', color: '#666', fontSize: '14px' }}>
          このURLをチームに共有: {window.location.href}
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            style={{ marginLeft: '8px', cursor: 'pointer', padding: '2px 8px' }}
          >
            コピー
          </button>
        </p>

        {state && (
          <>
            <MemberList members={state.members} status={state.status} />
            <br />
            {state.status === 'voting' ? (
              <>
                <CardDeck selectedVote={myVote} onVote={handleVote} disabled={false} />
                <br />
                <RevealButton allVoted={allVoted} onClick={reveal} />
              </>
            ) : (
              <ResetButton onClick={reset} />
            )}
          </>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 10: dev server で動作確認する**

  ```bash
  cd /Users/rikit/Documents/GitHub/planning-poker/frontend
  npx vite
  ```

  1. http://localhost:5173 を開く → `/rooms/xxxxxxxx` にリダイレクトされる
  2. 名前入力モーダルが表示される
  3. 名前を入力 → 投票画面が表示される
  4. 同じURLを別のタブで開いて別の名前を入力 → 両方の参加者が表示される
  5. カードを選んで投票 → お互いの「投票済み」状態がリアルタイムで更新される
  6. 「カードを公開」→ 全員の投票値が表示される
  7. 「次のラウンド」→ リセットされる

  ⭐ **Milestone 3: localhost でフル動作確認！**

- [ ] **Step 11: コミットする**

  ```bash
  git add frontend/src/
  git commit -m "feat: implement planning poker frontend"
  ```

---

### Task 8: Vercel Deploy

**Files:**
- Create: `frontend/vercel.json`

- [ ] **Step 1: Vercel CLI をインストールする**

  ```bash
  npm install -g vercel
  ```

- [ ] **Step 2: frontend/vercel.json を作成する**

  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/" }]
  }
  ```

  React Router がすべてのパスを処理できるようにする（SPA モード）。

- [ ] **Step 3: Vercel にデプロイする**

  ```bash
  cd /Users/rikit/Documents/GitHub/planning-poker/frontend
  vercel
  ```

  質問への回答:
  ```
  Set up and deploy? → Y
  Which scope? → （自分のアカウントを選択）
  Link to existing project? → N
  Project name: → planning-poker（またはお好みの名前）
  In which directory is your code? → ./
  Want to override settings? → N
  ```

  デプロイが完了すると `https://planning-poker-xxx.vercel.app` のような URL が表示される。

- [ ] **Step 4: Vercel に環境変数を設定する**

  ```bash
  vercel env add VITE_WS_URL production
  ```

  入力値:
  ```
  wss://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod
  ```

- [ ] **Step 5: 本番ビルドで再デプロイする**

  ```bash
  vercel --prod
  ```

- [ ] **Step 6: 本番 URL で動作確認する**

  1. Vercel の URL を開く → `/rooms/xxxxxxxx` にリダイレクトされる
  2. 名前を入力して投票が機能することを確認する
  3. URL をチームに共有して複数人で動作確認する

  ⭐ **Milestone 4: 本番稼働！**

- [ ] **Step 7: コミットする**

  ```bash
  git add frontend/vercel.json
  git commit -m "feat: add Vercel config for SPA routing"
  ```

---

## Spec Coverage

| 設計書の要件 | 実装タスク |
|-------------|-----------|
| 部屋の自動作成（nanoid 8文字） | Task 7 Home.tsx |
| URL シェアで同じ部屋に参加 | Task 5 join + Task 7 Room.tsx |
| 名前入力モーダル | Task 7 NameModal.tsx |
| 投票カード（フィボナッチ） | Task 7 CardDeck.tsx |
| 投票中はカードを非表示 | Task 4 broadcast.ts |
| カード公開（reveal） | Task 5 message.ts + Task 7 RevealButton |
| 次のラウンド（reset） | Task 5 message.ts + Task 7 ResetButton |
| WebSocket リアルタイム通信 | Task 5 Lambda + Task 7 usePoker.ts |
| 0人で部屋削除 | Task 5 disconnect.ts |
| TTL 1時間 | Task 3 dynamo.ts |
| DynamoDB シングルテーブル | Task 3 dynamo.ts |
| CDK インフラ管理 | Task 2 stack.ts |
| Vercel デプロイ | Task 8 |
| join前切断のエッジケース | Task 5 disconnect.ts Step 6 |

全要件をカバー ✅
