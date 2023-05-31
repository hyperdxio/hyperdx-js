import Transport from 'winston-transport';

import { Logger, parseWinstonLog } from './logger';

export default class HyperDXWinston extends Transport {
  private readonly logger: Logger;

  constructor({
    apiKey,
    baseUrl,
    maxLevel,
    service,
  }: {
    apiKey: string;
    baseUrl?: string;
    maxLevel?: string;
    service?: string;
  }) {
    super({ level: maxLevel ?? 'info' });
    this.logger = new Logger({ apiKey, baseUrl, service });
  }

  log(
    info: { message: string | Record<string, any>; level: string },
    callback: () => void,
  ) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const { level, message, meta } = parseWinstonLog(info);
    this.logger.postMessage(level, message, meta);
    callback();
  }

  finish(callback) {
    this.logger.sendAndClose(callback);
  }

  close() {
    this.finish(() => {
      this.emit('finish');
      this.emit('close');
    });
  }
}
