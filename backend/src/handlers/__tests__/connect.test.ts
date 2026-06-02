import * as dynamo from '../../lib/dynamo';
import { handler } from '../connect';

jest.mock('../../lib/dynamo');
const mockedDynamo = dynamo as jest.Mocked<typeof dynamo>;

const event = (connectionId: string) =>
  ({ requestContext: { connectionId } } as any);

test('接続時に saveConn を呼ぶ', async () => {
  mockedDynamo.saveConn.mockResolvedValue(undefined);
  const result = await handler(event('conn-1'), {} as any, {} as any) as any;
  expect(result.statusCode).toBe(200);
  expect(mockedDynamo.saveConn).toHaveBeenCalledWith('conn-1');
});
