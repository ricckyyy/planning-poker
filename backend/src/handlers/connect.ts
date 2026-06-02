import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { saveConn } from '../lib/dynamo';

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  await saveConn(event.requestContext.connectionId);
  return { statusCode: 200 };
};
