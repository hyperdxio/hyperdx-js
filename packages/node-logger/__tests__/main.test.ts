import path from 'path';

import pino from 'pino';

const target = path.resolve('build/src/pino.js');

describe('Logger', () => {
  it('pino', () => {
    const logger = pino({
      transport: {
        target,
        options: {
          apiKey: 'b0451b4a-da1a-4a6e-8055-db224498be0b',
          baseUrl: 'http://localhost:8002',
          service: 'test-pino',
        },
      },
    });
    logger.info({
      message: 'Hello World! 🍕🍕🍕',
      foo: 'bar',
    });
    logger.warn({
      message: 'Hello World! 🍕🍕🍕',
      foo: 'bar',
    });
    logger.error({
      message: 'Hello World! 🍕🍕🍕',
    });
  });
});
