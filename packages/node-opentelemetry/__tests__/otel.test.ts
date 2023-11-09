import { initSDK, shutdown } from '../src/otel';

describe('otel', () => {
  it('can sucessively shutdown without initialization', () => {
    shutdown();
    shutdown();
  });

  it('should initialize the SDK', () => {
    initSDK({
      advancedNetworkCapture: true,
      consoleCapture: true,
    });
  });
});
