import os from 'os';

import axios from 'axios';
import axiosRetry, { exponentialDelay } from 'axios-retry';
import stripAnsi from 'strip-ansi';
import { isPlainObject, isString } from 'lodash';

// internal types
export type HdxLog = {
  b: string; // message body
  h: string; // hostname
  sn?: number;
  st: string; // level in text
  sv: string; // service name
  ts: Date; // timestamp
};

const jsonStringify = (input: any) => {
  try {
    const str = JSON.stringify(input);
    return str;
  } catch (e) {
    return '';
  }
};

export const parseWinstonLog = (log: {
  message: string | Record<string, any>;
  level: string;
}) => {
  const level = log.level;
  const bodyMsg = isString(log.message)
    ? log.message
    : jsonStringify(log.message);

  const meta = {
    ...log,
    ...(isPlainObject(log.message) && (log.message as Record<string, unknown>)), // spread the message if its object type
  };

  return {
    level,
    message: bodyMsg,
    meta,
  };
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
