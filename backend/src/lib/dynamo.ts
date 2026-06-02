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
