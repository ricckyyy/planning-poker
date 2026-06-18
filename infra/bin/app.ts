import * as cdk from 'aws-cdk-lib';
import { PlanningPokerStack } from '../lib/stack';
import { OidcStack } from '../lib/oidc-stack';

const app = new cdk.App();

new OidcStack(app, 'OidcStack', {
  env: { region: 'ap-northeast-1' },
  githubOrg: 'ricckyyy',
  githubRepo: 'planning-poker',
});

new PlanningPokerStack(app, 'PlanningPokerStack', {
  env: { region: 'ap-northeast-1' },
});
