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
