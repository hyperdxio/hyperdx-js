import winston from 'winston';

import { getWinsonTransport } from '../src/logger';

const MAX_LEVEL = 'info';

const winstonLogger = winston.createLogger({
  level: MAX_LEVEL,
  format: winston.format.json(),
  transports: [new winston.transports.Console(), getWinsonTransport(MAX_LEVEL)],
});

describe('logger', () => {
  it('init', () => {
    winstonLogger.info('test');
  });
});
