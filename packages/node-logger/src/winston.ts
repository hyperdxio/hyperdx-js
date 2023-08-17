import Transport from 'winston-transport';

import hdx from './debug';
import { Logger, parseWinstonLog } from './logger';

import type { LoggerOptions } from './logger';

export type HyperDXWinstonOptions = LoggerOptions & {
  maxLevel?: string;
  getCustomMeta?: () => Record<string, any>;
};

export default class HyperDXWinston extends Transport {
  private readonly logger: Logger;

  private readonly getCustomMeta: () => Record<string, any>;

  constructor({
    apiKey,
    baseUrl,
    bufferSize,
    maxLevel,
    sendIntervalMs,
    service,
    timeout,
    getCustomMeta,
  }: HyperDXWinstonOptions) {
    hdx('Initializing HyperDX winston transport...');
    super({ level: maxLevel ?? 'info' });
    this.getCustomMeta = getCustomMeta;
    this.logger = new Logger({
      apiKey,
      baseUrl,
      bufferSize,
      sendIntervalMs,
      service,
      timeout,
    });
    hdx(`HyperDX winston transport initialized!`);
  }

  log(
    info: { message: string | Record<string, any>; level: string },
    callback: () => void,
  ) {
    hdx('Received log from winston');
    setImmediate(() => {
      this.emit('logged', info);
    });

    const { level, message, meta } = parseWinstonLog(info);
    hdx('Sending log to HyperDX');
    this.logger.postMessage(level, message, {
      ...meta,
      ...this.getCustomMeta?.(),
    });
    hdx('Log sent to HyperDX');
    callback();
  }

  finish(callback) {
    hdx('Sending and closing HyperDX winston transport...');
    this.logger.sendAndClose(callback);
  }

  close() {
    hdx('Closing HyperDX winston transport...');
    this.finish(() => {
      hdx('HyperDX winston transport closed!');
      this.emit('finish');
      this.emit('close');
    });
  }
}
