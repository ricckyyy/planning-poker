import * as cdk from 'aws-cdk-lib';
import { PlanningPokerStack } from '../lib/stack';

const app = new cdk.App();
new PlanningPokerStack(app, 'PlanningPokerStack', {
  env: { region: 'ap-northeast-1' },
});
