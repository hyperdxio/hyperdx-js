import { isPlainObject, isString } from 'lodash';
import stringifySafe from 'json-stringify-safe';
import { Attributes } from '@opentelemetry/api';
import {
  BatchLogRecordProcessor,
  BufferConfig,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Logger as OtelLogger, SeverityNumber } from '@opentelemetry/api-logs';
import {
  Resource,
  defaultServiceName,
  detectResourcesSync,
  envDetectorSync,
  hostDetectorSync,
  osDetectorSync,
  processDetector,
} from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

import hdx, { LOG_PREFIX as _LOG_PREFIX } from './debug';
import { version as PKG_VERSION } from '../package.json';

const DEFAULT_EXPORTER_BATCH_SIZE = 512;
const DEFAULT_EXPORTER_TIMEOUT_MS = 30000;
const DEFAULT_MAX_QUEUE_SIZE = 2048;
const DEFAULT_OTEL_LOGS_EXPORTER_URL =
  process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT ??
  `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs` ??
  'https://in-otel.hyperdx.io/v1/logs';
const DEFAULT_SEND_INTERVAL_MS = 5000;
const DEFAULT_SERVICE_NAME =
  process.env.OTEL_SERVICE_NAME ?? defaultServiceName();

const LOG_PREFIX = `⚠️  ${_LOG_PREFIX}`;

export type PinoLogLine = {
  level: number;
  time: number;
  pid: number;
  hostname: string;
  msg: string;
} & Attributes;

const jsonToString = (json) => {
  try {
    return JSON.stringify(json);
  } catch (ex) {
    hdx(`Failed to stringify json. e = ${ex}`);
    return stringifySafe(json);
  }
};

export const parsePinoLog = (log: PinoLogLine) => {
  const { level, msg, message, ...meta } = log;
  const targetMessage = msg || message;
  let bodyMsg = '';
  if (targetMessage) {
    bodyMsg = isString(targetMessage)
      ? targetMessage
      : jsonToString(targetMessage);
  } else {
    bodyMsg = jsonToString(log);
  }
  return {
    level,
    message: bodyMsg,
    meta,
  };
};

export const parseWinstonLog = (
  log: {
    message: string | Attributes;
    level: string;
  } & Attributes,
) => {
  const { level, message, ...attributes } = log;
  const bodyMsg = isString(message) ? message : jsonToString(message);

  let meta = attributes;

  if (isPlainObject(message)) {
    // FIXME: attributes conflict ??
    meta = {
      ...attributes,
      ...(message as Attributes),
    };
  }

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

    // sanity check bufferSize and queueSize
    const maxExportBatchSize = bufferSize ?? DEFAULT_EXPORTER_BATCH_SIZE;
    let maxQueueSize = queueSize ?? DEFAULT_MAX_QUEUE_SIZE;
    if (maxExportBatchSize > maxQueueSize) {
      console.error(
        `${LOG_PREFIX} bufferSize must be smaller or equal to queueSize. Setting queueSize to ${maxExportBatchSize}`,
      );
      maxQueueSize = maxExportBatchSize;
    }

    const detectedResource = detectResourcesSync({
      detectors: detectResources
        ? [envDetectorSync, hostDetectorSync, osDetectorSync, processDetector]
        : [],
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
      /** The maximum batch size of every export. It must be smaller or equal to
       * maxQueueSize. The default value is 512. */
      maxExportBatchSize,
      scheduledDelayMillis: sendIntervalMs ?? DEFAULT_SEND_INTERVAL_MS,
      exportTimeoutMillis: timeout ?? DEFAULT_EXPORTER_TIMEOUT_MS,
      maxQueueSize,
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

    if (apiKey) {
      this.logger = loggerProvider.getLogger('node-logger');
      console.log(`${LOG_PREFIX} started!`);
    } else {
      console.error(
        `${LOG_PREFIX} failed to start! Please check your API key.`,
      );
    }
  }

  private parseTimestamp(meta: Attributes): Date {
    // pino
    if (Number.isInteger(meta.time)) {
      return new Date(meta.time as number);
    }
    // set to current time if not provided
    return new Date();
  }

  shutdown() {
    hdx('Shutting down HyperDX node logger...');
    return this.processor.shutdown();
  }

  forceFlush() {
    hdx('Forcing flush of HyperDX node logger...');
    return this.processor.forceFlush();
  }

  postMessage(level: string, body: string, attributes: Attributes = {}): void {
    hdx('Emittiing log from HyperDX node logger...');
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
