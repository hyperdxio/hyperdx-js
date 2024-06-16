import * as proto from '../../../../../src/opentelemetry/proto/logs/v1/logs';

const MOCK_LOGS_DATA: proto.LogsData = {
  resourceLogs: [
    {
      scopeLogs: [
        {
          scope: { name: 'rum.rr-web', version: '0.0.0' },
          logRecords: [
            {
              body: {
                kvlistValue: {
                  values: [{ key: 'Hi', value: { stringValue: 'there' } }],
                },
              },
            },
          ],
        },
      ],
    },
  ],
};

describe('LogsProto', () => {
  it('should encode and decode', () => {
    const buffer = proto.LogsData.encode(MOCK_LOGS_DATA).finish();

    expect(buffer).toBeTruthy();

    const decoded = proto.LogsData.decode(buffer);
    expect(decoded).toMatchObject(MOCK_LOGS_DATA);
  });
});
