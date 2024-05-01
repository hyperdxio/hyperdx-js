import winston from 'winston';

import HyperDXWinston from '../src';

const HYPERDX_API_KEY = 'b0451b4a-da1a-4a6e-8055-db224498be0b';
const SERVICE_NAME = 'test-jest';
const HYPERDX_BASE_URL = 'http://localhost:8002';

describe('Logger', () => {
  it('winston', () => {
    const MAX_LEVEL = 'info';
    const logger = winston.createLogger({
      level: MAX_LEVEL,
      format: winston.format.json(),
      transports: [
        new winston.transports.Console(),
        new HyperDXWinston({
          apiKey: HYPERDX_API_KEY,
          baseUrl: HYPERDX_BASE_URL,
          maxLevel: MAX_LEVEL,
          service: SERVICE_NAME,
        }),
      ],
    });

    logger.info({
      message: 'Hello Winston! 🍕🍕🍕',
    });
  });
});
