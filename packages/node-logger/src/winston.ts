import Transport from 'winston-transport';

import hdx from './debug';
import { Logger, parseWinstonLog } from './logger';
import { version as PKG_VERSION } from '../package.json';

export default class HyperDXWinston extends Transport {
  private readonly logger: Logger;

  constructor({
    apiKey,
    baseUrl,
    maxLevel,
    service,
    debug,
  }: {
    apiKey: string;
    baseUrl?: string;
    maxLevel?: string;
    service?: string;
    debug?: boolean;
  }) {
    hdx('Initializing HyperDX winston transport...');
    super({ level: maxLevel ?? 'info' });
    this.logger = new Logger({ apiKey, baseUrl, service });
    hdx(`HyperDX winston transport [v${PKG_VERSION}] initialized!`);
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
