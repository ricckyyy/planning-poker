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
