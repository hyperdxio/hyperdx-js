import path from 'path';

import pino from 'pino';

const target = path.resolve('build/src/index.js');

const HYPERDX_API_KEY = 'b0451b4a-da1a-4a6e-8055-db224498be0b';
const SERVICE_NAME = 'test-jest';
const HYPERDX_BASE_URL = 'http://localhost:8002';

describe('Logger', () => {
  it('pino', () => {
    const logger = pino(
      pino.transport({
        targets: [
          {
            target,
            options: {
              apiKey: HYPERDX_API_KEY,
              baseUrl: HYPERDX_BASE_URL,
              service: SERVICE_NAME,
            },
            level: 'info',
          },
        ],
      }),
    );
    logger.info({
      message: 'Hello Pino! 🍕🍕🍕',
      foo: 'bar',
    });
    logger.warn('Hello Pino! 🍕🍕🍕');
    logger.error('Hello Pino! 🍕🍕🍕');
  });
});
