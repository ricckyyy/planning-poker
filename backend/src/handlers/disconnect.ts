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
