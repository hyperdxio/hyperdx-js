import { init, initSDK, shutdown } from '../otel';

describe('otel', () => {
  it('can sucessively shutdown without initialization', () => {
    shutdown();
    shutdown();
  });

  it('should be able to initialize the SDK with initSDK', async () => {
    initSDK({
      apiKey: 'blabla',
      advancedNetworkCapture: true,
      consoleCapture: true,
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    shutdown();
  });

  it('should be able to initialize the SDK with init', async () => {
    init({
      apiKey: 'blabla',
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    shutdown();
  });
});
