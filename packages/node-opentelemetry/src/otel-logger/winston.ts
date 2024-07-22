import { Attributes, diag } from '@opentelemetry/api';
import isPlainObject from 'lodash.isplainobject';
import isString from 'lodash.isstring';
import Transport from 'winston-transport';

import { jsonToString } from '../utils';
import type { LoggerOptions } from './';
import { Logger } from './';

export const parseWinstonLog = (
  log: {
    message: string | Attributes;
    level: string;
  } & Attributes,
) => {
  const { level, message, ...attributes } = log;
  const bodyMsg = isString(message) ? message : jsonToString(message);

  let meta = attributes;

  if (isPlainObject(message)) {
    // FIXME: attributes conflict ??
    meta = {
      ...attributes,
      ...(message as Attributes),
    };
  }

  return {
    level,
    message: bodyMsg,
    meta,
  };
};

export type HyperDXWinstonOptions = LoggerOptions & {
  apiKey?: string;
  maxLevel?: string;
  getCustomMeta?: () => Attributes;
};

export default class HyperDXWinston extends Transport {
  private readonly logger: Logger;

  private readonly getCustomMeta: (() => Attributes) | undefined;

  constructor({
    maxLevel,
    getCustomMeta,
    apiKey,
    ...options
  }: HyperDXWinstonOptions) {
    diag.debug('Initializing HyperDX winston transport...');
    super({ level: maxLevel ?? 'info' });
    this.getCustomMeta = getCustomMeta;
    this.logger = new Logger({
      ...(apiKey && {
        headers: {
          Authorization: apiKey,
        },
      }),
      ...options,
    });
    diag.debug(`HyperDX winston transport initialized!`);
  }

  log(
    info: { message: string | Attributes; level: string } & Attributes,
    callback: () => void,
  ) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    diag.debug('Received log from winston');

    const { level, message, meta } = parseWinstonLog(info);
    diag.debug('Sending log to HyperDX');
    this.logger.postMessage(level, message, {
      ...this.getCustomMeta?.(),
      ...meta,
    });
    diag.debug('Log sent to HyperDX');

    callback();
  }

  close() {
    diag.debug('Closing HyperDX winston transport...');
    this.logger
      .shutdown()
      .then(() => {
        diag.debug('HyperDX winston transport closed!');
        this.emit('finish');
        this.emit('close');
      })
      .catch((err) => {
        console.error('Error closing HyperDX winston transport:', err);
      });
  }
}
