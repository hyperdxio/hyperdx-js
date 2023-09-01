import { initSDK } from '../src/otel';

describe('otel', () => {
  it('should initialize the SDK', () => {
    initSDK({
      advancedNetworkCapture: true,
      consoleCapture: true,
    });
  });
});
