import build from 'pino-abstract-transport';

import hdx from './debug';
import { Logger, parsePinoLog } from './logger';

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
    hdx('Initializing HyperDX pino transport...');
    const logger = new Logger(opts);
    hdx(`HyperDX pino transport initialized!`);
    return build(
      async function (source) {
        for await (const obj of source) {
          const { level, message, meta } = parsePinoLog(obj);
          hdx('Sending log to HyperDX');
          logger.postMessage(PINO_LEVELS[level], message, meta);
          hdx('Log sent to HyperDX');
        }
      },
      {
        async close(err) {
          hdx('Sending and closing HyperDX pino transport...');
          await new Promise<void>((resolve, reject) =>
            logger.sendAndClose((_err) => {
              if (_err) {
                reject(_err);
                return;
              }
              hdx('HyperDX pino transport closed!');
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
