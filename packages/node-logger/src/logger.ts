import { isPlainObject, isString } from 'lodash';
import { Attributes } from '@opentelemetry/api';
import {
  BatchLogRecordProcessor,
  BufferConfig,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import {
  logs,
  SeverityNumber,
  Logger as OtelLogger,
} from '@opentelemetry/api-logs';
import {
  Resource,
  detectResourcesSync,
  envDetectorSync,
  hostDetectorSync,
  osDetectorSync,
  processDetector,
} from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

import { LOG_PREFIX as _LOG_PREFIX } from './debug';
import { jsonToString } from './_logger';
import { version as PKG_VERSION } from '../package.json';

const DEFAULT_EXPORTER_BATCH_SIZE = 512;
const DEFAULT_EXPORTER_TIMEOUT_MS = 30000;
const DEFAULT_MAX_QUEUE_SIZE = 2048;
const DEFAULT_OTEL_LOGS_EXPORTER_URL = 'https://in-otel.hyperdx.io/v1/logs';
const DEFAULT_SEND_INTERVAL_MS = 5000;
const DEFAULT_SERVICE_NAME = 'default app';

const LOG_PREFIX = `⚠️  ${_LOG_PREFIX}`;

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
  message: string | Attributes;
  level: string;
}) => {
  const level = log.level;
  const bodyMsg = isString(log.message)
    ? log.message
    : jsonToString(log.message);

  const meta = (isPlainObject(log.message) ? log.message : {}) as Attributes;

  return {
    level,
    message: bodyMsg,
    meta,
  };
};

export type LoggerOptions = {
  apiKey: string;
  baseUrl?: string;
  bufferSize?: number;
  detectResources?: boolean;
  queueSize?: number;
  sendIntervalMs?: number;
  service?: string;
  timeout?: number; // The read/write/connection timeout in milliseconds
};

export class Logger {
  private readonly service: string;

  private readonly logger: OtelLogger | undefined;

  private readonly processor: BatchLogRecordProcessor;

  constructor({
    apiKey,
    baseUrl,
    bufferSize,
    detectResources,
    queueSize,
    resourceAttributes,
    sendIntervalMs,
    service,
    timeout,
  }: {
    apiKey: string;
    baseUrl?: string;
    bufferSize?: number;
    detectResources?: boolean;
    queueSize?: number;
    resourceAttributes?: Attributes;
    sendIntervalMs?: number;
    service?: string;
    timeout?: number;
  }) {
    if (!apiKey) {
      console.error(`${LOG_PREFIX} API key not found`);
    }
    if (!service) {
      console.warn(
        `${LOG_PREFIX} Service name not found. Use "${DEFAULT_SERVICE_NAME}"`,
      );
    }

    const detectedResource = detectResourcesSync({
      detectors:
        // This will require a few extra deno permissions
        detectResources === false
          ? []
          : [
              envDetectorSync,
              hostDetectorSync,
              osDetectorSync,
              processDetector,
            ],
    });

    const _url = baseUrl ?? DEFAULT_OTEL_LOGS_EXPORTER_URL;

    console.warn(`${LOG_PREFIX} Sending logs to ${_url}`);

    const exporter = new OTLPLogExporter({
      url: _url,
      headers: {
        Authorization: apiKey,
      },
    });
    this.processor = new BatchLogRecordProcessor(exporter, {
      maxExportBatchSize: bufferSize ?? DEFAULT_EXPORTER_BATCH_SIZE,
      scheduledDelayMillis: sendIntervalMs ?? DEFAULT_SEND_INTERVAL_MS,
      exportTimeoutMillis: timeout ?? DEFAULT_EXPORTER_TIMEOUT_MS,
      maxQueueSize: queueSize ?? DEFAULT_MAX_QUEUE_SIZE,
    });
    const loggerProvider = new LoggerProvider({
      resource: detectedResource.merge(
        new Resource({
          'hyperdx.distro.version': PKG_VERSION,
          'hyperdx.distro.runtime_version': process.versions.node,
          [SEMRESATTRS_SERVICE_NAME]: service ?? DEFAULT_SERVICE_NAME,
          ...resourceAttributes,
        }),
      ),
    });
    loggerProvider.addLogRecordProcessor(this.processor);
    logs.setGlobalLoggerProvider(loggerProvider);

    if (apiKey) {
      this.logger = logs.getLogger('node-logger');
      console.log(`${LOG_PREFIX} started!`);
    } else {
      console.error(
        `${LOG_PREFIX} failed to start! Please check your API key.`,
      );
    }
  }

  private parseTimestamp(meta: Record<string, any>): Date {
    // pino
    if (meta.time) {
      return new Date(meta.time);
    }
    // set to current time if not provided
    return new Date();
  }

  shutdown() {
    return this.processor.shutdown();
  }

  forceFlush() {
    return this.processor.forceFlush();
  }

  postMessage(level: string, body: string, attributes: Attributes = {}): void {
    this.logger?.emit({
      severityNumber: 0,
      // TODO: set up the mapping between different downstream log levels
      severityText: level,
      body,
      attributes,
      timestamp: this.parseTimestamp(attributes),
    });
  }
}
