import os from 'os';

import Transport from 'winston-transport';
import axios from 'axios';
import axiosRetry, { exponentialDelay } from 'axios-retry';
import stripAnsi from 'strip-ansi';
import winston from 'winston';
import {
  WINSTON_MODULE_NEST_PROVIDER,
  WINSTON_MODULE_PROVIDER,
  WinstonModule,
} from 'nest-winston';
import { isPlainObject, isString } from 'lodash';

const jsonStringify = (input: any) => {
  try {
    const str = JSON.stringify(input);
    return str;
  } catch (e) {
    return '';
  }
};

// internal types
export type HdxLog = {
  b: string; // message body
  h: string; // hostname
  sn?: number;
  st: string; // level in text
  sv: string; // service name
  ts: Date; // timestamp
};

export class Logger {
  private readonly HDX_PLATFORM = 'nodejs';

  private readonly INGESTOR_API_URL = 'https://in.hyperdx.io';

  private readonly service: string;

  private readonly client: ReturnType<typeof axios.create>;

  constructor({
    apiKey,
    baseUrl,
    service,
  }: {
    apiKey: string;
    baseUrl?: string;
    service?: string;
  }) {
    this.service = service ?? 'default app';
    this.client = axios.create({
      baseURL: baseUrl ?? this.INGESTOR_API_URL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: exponentialDelay,
    });
  }

  private buildHdxLog(level: string, body: string): HdxLog {
    return {
      b: stripAnsi(body),
      h: os.hostname(),
      sn: 0, // TODO: set up the correct number
      st: stripAnsi(level),
      sv: stripAnsi(this.service),
      ts: new Date(),
    };
  }

  postMessage(level: string, body: string, meta: Record<string, any> = {}) {
    this.client
      .post(
        '/',
        {
          ...meta,
          __hdx: this.buildHdxLog(level, body),
        },
        {
          params: {
            hdx_platform: this.HDX_PLATFORM,
          },
        },
      )
      .catch((e) => {
        console.error(e);
      });
  }
}

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
    const level = info.level;
    const bodyMsg = isString(info.message)
      ? info.message
      : jsonStringify(info.message);

    const meta = {
      ...info,
      ...(isPlainObject(info.message) &&
        (info.message as Record<string, unknown>)), // spread the message if its object type
    };

    this.logger.postMessage(level, bodyMsg, meta);
    callback();
  }
}
