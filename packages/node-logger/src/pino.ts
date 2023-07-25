import build from 'pino-abstract-transport';

import { Logger, parsePinoLog } from './logger';
import { version as PKG_VERSION } from '../package.json';

// map pino level to text
const PINO_LEVELS = {
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
    console.log(`HyperDX pino transport [v${PKG_VERSION}] initialized!`);
    return build(
      async function (source) {
        for await (const obj of source) {
          const { level, message, meta } = parsePinoLog(obj);
          logger.postMessage(PINO_LEVELS[level], message, meta);
        }
      },
      {
        async close(err) {
          await new Promise<void>((resolve, reject) =>
            logger.sendAndClose((_err) => {
              if (_err) {
                reject(_err);
                return;
              }
              resolve();
            }),
          );
        },
      },
    );
  } catch (err) {
    console.error('createTransport error', err);
  }
};
