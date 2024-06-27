import build from 'pino-abstract-transport';
import isString from 'lodash.isstring';
import {
  Attributes,
  context,
  diag,
  isSpanContextValid,
  trace,
} from '@opentelemetry/api';

import { Logger } from './';
import { jsonToString } from '../utils';

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

// https://github.com/open-telemetry/opentelemetry-js-contrib/blob/65bc979f9f04410e9a78b4d546f5e08471c1fb6d/plugins/node/opentelemetry-instrumentation-pino/src/instrumentation.ts#L167C11-L167C30
const DEFAULT_LOG_KEYS = {
  traceId: 'trace_id',
  spanId: 'span_id',
  traceFlags: 'trace_flags',
};
export const getMixinFunction = () => {
  const span = trace.getSpan(context.active());
  if (!span) {
    return {};
  }

  const spanContext = span.spanContext();

  if (!isSpanContextValid(spanContext)) {
    return {};
  }
  const logKeys = DEFAULT_LOG_KEYS;
  return {
    [logKeys.traceId]: spanContext.traceId,
    [logKeys.spanId]: spanContext.spanId,
    [logKeys.traceFlags]: `0${spanContext.traceFlags.toString(16)}`,
  };
};

export default async ({
  apiKey,
  getCustomMeta,
  ...options
}: HyperDXPinoOptions) => {
  try {
    diag.debug('Initializing HyperDX pino transport...');
    const logger = new Logger({
      ...(apiKey && {
        headers: {
          Authorization: apiKey,
        },
      }),
      ...options,
    });
    diag.debug(`HyperDX pino transport initialized!`);
    return build(
      async function (source) {
        for await (const obj of source) {
          const { level, message, meta } = parsePinoLog(obj);
          diag.debug('Sending log to HyperDX');
          logger.postMessage(PINO_LEVELS[level], message, {
            ...getCustomMeta?.(),
            ...meta,
          });
          diag.debug('Log sent to HyperDX');
        }
      },
      {
        async close(err) {
          diag.debug('Sending and closing HyperDX pino transport...');
          await logger.shutdown();
          diag.debug('HyperDX pino transport closed!');
        },
      },
    );
  } catch (err) {
    console.error('createTransport error', err);
  }
};
