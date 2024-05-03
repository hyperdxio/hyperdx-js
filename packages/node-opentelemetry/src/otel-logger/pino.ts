import build from 'pino-abstract-transport';
import isString from 'lodash.isstring';
import { Attributes } from '@opentelemetry/api';

import hdx from '../debug';
import { Logger, jsonToString } from './';

import type { LoggerOptions } from './';

export type PinoLogLine = {
  level: number;
  time: number;
  pid: number;
  hostname: string;
  msg: string;
} & Attributes;

export const parsePinoLog = (log: PinoLogLine) => {
  const { level, msg, message, ...meta } = log;
  const targetMessage = msg || message;
  let bodyMsg = '';
  if (targetMessage) {
    bodyMsg = isString(targetMessage)
      ? targetMessage
      : jsonToString(targetMessage);
  } else {
    bodyMsg = jsonToString(log);
  }
  return {
    level,
    message: bodyMsg,
    meta,
  };
};

// map pino level to text
const PINO_LEVELS = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

export type HyperDXPinoOptions = LoggerOptions & {
  apiKey?: string;
  getCustomMeta?: () => Attributes;
};

export default ({ apiKey, getCustomMeta, ...options }: HyperDXPinoOptions) => {
  try {
    hdx('Initializing HyperDX pino transport...');
    const logger = new Logger({
      ...(apiKey && {
        headers: {
          Authorization: apiKey,
        },
      }),
      ...options,
    });
    hdx(`HyperDX pino transport initialized!`);
    return build(
      async function (source) {
        for await (const obj of source) {
          const { level, message, meta } = parsePinoLog(obj);
          hdx('Sending log to HyperDX');
          logger.postMessage(PINO_LEVELS[level], message, {
            ...getCustomMeta?.(),
            ...meta,
          });
          hdx('Log sent to HyperDX');
        }
      },
      {
        async close(err) {
          hdx('Sending and closing HyperDX pino transport...');
          await logger.shutdown();
          hdx('HyperDX pino transport closed!');
        },
      },
    );
  } catch (err) {
    console.error('createTransport error', err);
  }
};
