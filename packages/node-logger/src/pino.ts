import build from 'pino-abstract-transport';

import { Logger } from './logger';
import { version as PKG_VERSION } from '../package.json';

export type PinoLogLine = {
  level: number;
  time: number;
  pid: number;
  hostname: string;
  msg: string;
};

// map pino level to text
const LEVELS = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

export default (opts: {
  apiKey: string;
  baseUrl?: string;
  service?: string;
}) => {
  try {
    const logger = new Logger(opts);
    console.log(`HyperDX pino transport [v${PKG_VERSION}] started!`);
    return build(
      async function (source) {
        for await (const obj of source) {
          const { level, message, ...meta } = obj;
          logger.postMessage(LEVELS[level], message, meta);
        }
      },
      {
        async close(err) {
          // TODO: IMPLEMENT ME
        },
      },
    );
  } catch (err) {
    console.error('createTransport error', err);
  }
};
