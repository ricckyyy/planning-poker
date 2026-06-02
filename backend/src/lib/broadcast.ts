import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from '@aws-sdk/client-apigatewaymanagementapi';
import { getRoomMeta, getMembers, deleteMember, deleteConn } from './dynamo';

export async function broadcastState(roomId: string, endpoint: string) {
  const [meta, members] = await Promise.all([getRoomMeta(roomId), getMembers(roomId)]);
  if (!meta) return;

  const isRevealed = meta.status === 'revealed';
  const message = JSON.stringify({
    type: 'state',
    roomId,
    status: meta.status,
    members: members.map(m => ({
      name: m.name,
      hasVoted: m.vote !== null,
      vote: isRevealed ? m.vote : null,
    })),
  });

  const mgmt = new ApiGatewayManagementApiClient({ endpoint });
  const payload = Buffer.from(message);

  await Promise.allSettled(
    members.map(async m => {
      const connId = m.SK.replace('MEMBER#', '');
      try {
        await mgmt.send(new PostToConnectionCommand({ ConnectionId: connId, Data: payload }));
      } catch (e) {
        if (e instanceof GoneException) {
          await Promise.all([deleteMember(roomId, connId), deleteConn(connId)]);
        }
      }
    })
  );
}
