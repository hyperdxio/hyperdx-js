import Transport from 'winston-transport';
import winston from 'winston';
import {
  WINSTON_MODULE_NEST_PROVIDER,
  WINSTON_MODULE_PROVIDER,
  WinstonModule,
} from 'nest-winston';

import { Logger, parseWinstonLog } from './logger';

type HyperDXNestLoggerModuleConfigs = {
  apiKey: string;
  baseUrl?: string;
  maxLevel?: string;
  service?: string;
};

export type HyperDXNestLogger = winston.Logger;

export class HyperDXNestLoggerModule {
  static HDX_LOGGER_MODULE_NEST_PROVIDER = WINSTON_MODULE_NEST_PROVIDER;
  static HDX_LOGGER_MODULE_PROVIDER = WINSTON_MODULE_PROVIDER;

  static toWinstonLoggerConfigs(configs?: HyperDXNestLoggerModuleConfigs) {
    return {
      level: configs?.maxLevel ?? 'info',
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console(),
        new HyperDXWinston({
          apiKey: configs.apiKey,
          baseUrl: configs.baseUrl,
          maxLevel: configs.maxLevel,
          service: configs.service ?? 'my-app',
        }),
      ],
    };
  }

  static createLogger(configs?: HyperDXNestLoggerModuleConfigs) {
    return WinstonModule.createLogger(this.toWinstonLoggerConfigs(configs));
  }

  static forRoot(configs?: HyperDXNestLoggerModuleConfigs) {
    return WinstonModule.forRoot(this.toWinstonLoggerConfigs(configs));
  }
}

export class HyperDXWinston extends Transport {
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
    const { level, message, meta } = parseWinstonLog(info);
    this.logger.postMessage(level, message, meta);
    callback();
  }
}
