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
