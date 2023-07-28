import Transport from 'winston-transport';

import hdx from './debug';
import { Logger, parseWinstonLog } from './logger';

import type { LoggerOptions } from './logger';

export type HyperDXWinstonOptions = LoggerOptions & {
  maxLevel?: string;
};

export default class HyperDXWinston extends Transport {
  private readonly logger: Logger;

  constructor({
    apiKey,
    baseUrl,
    bufferSize,
    maxLevel,
    sendIntervalMs,
    service,
    timeout,
  }: HyperDXWinstonOptions) {
    hdx('Initializing HyperDX winston transport...');
    super({ level: maxLevel ?? 'info' });
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
    this.logger.postMessage(level, message, meta);
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
