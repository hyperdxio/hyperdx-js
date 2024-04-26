import Transport from 'winston-transport';
import { Attributes } from '@opentelemetry/api';

import hdx from './debug';
import { Logger, parseWinstonLog } from './logger';

import type { LoggerOptions } from './logger';

export type HyperDXWinstonOptions = LoggerOptions & {
  maxLevel?: string;
  getCustomMeta?: () => Attributes;
};

export default class HyperDXWinston extends Transport {
  private readonly logger: Logger;

  private readonly getCustomMeta: () => Attributes;

  constructor({ maxLevel, getCustomMeta, ...options }: HyperDXWinstonOptions) {
    hdx('Initializing HyperDX winston transport...');
    super({ level: maxLevel ?? 'info' });
    this.getCustomMeta = getCustomMeta;
    this.logger = new Logger(options);
    hdx(`HyperDX winston transport initialized!`);
  }

  log(
    info: { message: string | Attributes; level: string } & Attributes,
    callback: () => void,
  ) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    hdx('Received log from winston');

    const { level, message, meta } = parseWinstonLog(info);
    hdx('Sending log to HyperDX');
    this.logger.postMessage(level, message, {
      ...this.getCustomMeta?.(),
      ...meta,
    });
    hdx('Log sent to HyperDX');

    callback();
  }

  close() {
    hdx('Closing HyperDX winston transport...');
    this.logger
      .shutdown()
      .then(() => {
        hdx('HyperDX winston transport closed!');
        this.emit('finish');
        this.emit('close');
      })
      .catch((err) => {
        console.error('Error closing HyperDX winston transport:', err);
      });
  }
}
