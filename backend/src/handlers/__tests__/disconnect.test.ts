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
