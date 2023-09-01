import winston from 'winston';

import { getWinsonTransport } from '../src/logger';

const MAX_LEVEL = 'info';

process.env.HYPERDX_API_KEY = null;

const logger = winston.createLogger({
  level: MAX_LEVEL,
  format: winston.format.json(),
  transports: [new winston.transports.Console(), getWinsonTransport(MAX_LEVEL)],
});

describe('logger', () => {
  it('init getWinsonTransport', () => {
    logger.info('test');
  });
});
