import os from 'os';
import { URL } from 'url';

import stripAnsi from 'strip-ansi';
import { isPlainObject, isString } from 'lodash';

import { ILogger, createLogger, jsonToString } from './_logger';

// internal types
export type HdxLog = {
  b: string; // message body
  h: string; // hostname
  sn?: number;
  st: string; // level in text
  sv: string; // service name
  ts: Date; // timestamp
};

export type PinoLogLine = {
  level: number;
  time: number;
  pid: number;
  hostname: string;
  msg: string;
};

export const parsePinoLog = (log: PinoLogLine) => {
  const { level, msg, ...meta } = log;
  const bodyMsg = isString(msg) ? msg : jsonToString(log);
  return {
    level,
    message: bodyMsg,
    meta: log,
  };
};

export const parseWinstonLog = (log: {
  message: string | Record<string, any>;
  level: string;
}) => {
  const level = log.level;
  const bodyMsg = isString(log.message)
    ? log.message
    : jsonToString(log.message);

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
  private readonly service: string;

  private readonly client: ILogger | null;

  constructor({
    apiKey,
    baseUrl,
    service,
  }: {
    apiKey: string;
    baseUrl?: string;
    service?: string;
  }) {
    if (!apiKey) {
      console.error('⚠️  [HyperDX Logger] API key not found');
    }
    if (!service) {
      console.warn(
        '⚠️  [HyperDX Logger] Service name not found. Use "default app"',
      );
    }
    this.service = service ?? 'default app';
    let protocol;
    let host;
    let port;
    if (baseUrl) {
      const url = new URL(baseUrl);
      protocol = url.protocol.replace(':', '');
      host = url.hostname;
      port = url.port;
      console.warn(
        `⚠️  [HyperDX Logger] Sending logs to ${protocol}://${host}:${port} `,
      );
    }

    this.client = apiKey
      ? createLogger({
          token: apiKey,
          host,
          port,
          protocol,
        })
      : null;
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

  postMessage(
    level: string,
    body: string,
    meta: Record<string, any> = {},
  ): void {
    this.client?.log({
      ...meta,
      __hdx: this.buildHdxLog(level, body),
    });
  }
}
