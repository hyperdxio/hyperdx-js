import winston from 'winston';

import { getWinstonTransport } from '../src/logger';

const MAX_LEVEL = 'info';

const winstonLogger = winston.createLogger({
  level: MAX_LEVEL,
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    getWinstonTransport(MAX_LEVEL),
  ],
});

describe('logger', () => {
  it('init', () => {
    winstonLogger.info('test');
  });
});
