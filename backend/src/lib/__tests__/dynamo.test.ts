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
