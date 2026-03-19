import {
  LoggerlessTransport,
  type LogLayerTransportParams,
  LogLevel,
  type LogLevelType,
} from '@loglayer/transport';
import { Attributes, diag } from '@opentelemetry/api';

import type { LoggerOptions } from './';
import { Logger } from './';

// Map LogLayer levels to their numeric values for comparison
const LOG_LEVEL_PRIORITY = {
  [LogLevel.trace]: 0,
  [LogLevel.debug]: 1,
  [LogLevel.info]: 2,
  [LogLevel.warn]: 3,
  [LogLevel.error]: 4,
  [LogLevel.fatal]: 5,
};

export type HyperDXLogLayerOptions = LoggerOptions & {
  apiKey?: string;
  getCustomMeta?: () => Attributes;
  maxLevel?: LogLevelType;
};

export default class HyperDXLogLayer
  extends LoggerlessTransport
  implements Disposable
{
  private readonly logger: Logger;
  private readonly getCustomMeta: (() => Attributes) | undefined;
  private readonly maxLevel: LogLevelType;
  private isDisposed = false;

  constructor({
    getCustomMeta,
    apiKey,
    maxLevel = 'info',
    ...options
  }: HyperDXLogLayerOptions) {
    diag.debug('Initializing HyperDX LogLayer transport...');
    super({ level: maxLevel });
    this.getCustomMeta = getCustomMeta;
    this.maxLevel = maxLevel;
    this.logger = new Logger({
      ...(apiKey && {
        headers: {
          Authorization: apiKey,
        },
      }),
      ...options,
    });
    diag.debug('HyperDX LogLayer transport initialized!');
  }

  shipToLogger({
    logLevel,
    messages,
    data,
    hasData,
  }: LogLayerTransportParams): string[] {
    if (this.isDisposed) return messages;

    // Skip logs below maxLevel
    if (LOG_LEVEL_PRIORITY[logLevel] < LOG_LEVEL_PRIORITY[this.maxLevel]) {
      return messages;
    }

    diag.debug('Received log from LogLayer');
    const message = messages.join(' ');
    const meta = {
      ...(data && hasData ? data : {}),
      ...this.getCustomMeta?.(),
    };

    diag.debug('Sending log to HyperDX');
    this.logger.postMessage(logLevel, message, meta);
    diag.debug('Log sent to HyperDX');

    return messages;
  }

  [Symbol.dispose](): void {
    if (this.isDisposed) return;

    diag.debug('Closing HyperDX LogLayer transport...');
    this.logger
      .shutdown()
      .then(() => {
        diag.debug('HyperDX LogLayer transport closed!');
        this.isDisposed = true;
      })
      .catch((err) => {
        console.error('Error closing HyperDX LogLayer transport:', err);
        this.isDisposed = true;
      });
  }
}
