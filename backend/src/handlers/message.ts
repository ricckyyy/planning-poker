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
