import { Attributes, diag } from '@opentelemetry/api';
import {
  LogAttributes,
  Logger as OtelLogger,
  logs,
  SeverityNumber,
} from '@opentelemetry/api-logs';
import { getEnvWithoutDefaults } from '@opentelemetry/core';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import {
  detectResourcesSync,
  envDetectorSync,
  hostDetectorSync,
  osDetectorSync,
  processDetector,
  Resource,
} from '@opentelemetry/resources';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
  NoopLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import isPlainObject from 'lodash.isplainobject';

import { version as PKG_VERSION } from '../../package.json';
import {
  DEFAULT_EXPORTER_BATCH_SIZE,
  DEFAULT_EXPORTER_TIMEOUT_MS,
  DEFAULT_MAX_QUEUE_SIZE,
  DEFAULT_OTEL_LOGS_EXPORTER_URL,
  DEFAULT_SEND_INTERVAL_MS,
  DEFAULT_SERVICE_NAME,
} from '../constants';
import { jsonToString } from '../utils';

const LOG_PREFIX = `⚠️  [LOGGER]`;

export type LoggerOptions = {
  baseUrl?: string;
  bufferSize?: number;
  detectResources?: boolean;
  headers?: Record<string, string>;
  queueSize?: number;
  resourceAttributes?: Attributes;
  sendIntervalMs?: number;
  service?: string;
  timeout?: number; // The read/write/connection timeout in milliseconds
};

// https://github.com/open-telemetry/opentelemetry-js-contrib/blob/afccd0d62a0ea81afb8f5609f3ee802c038d11c6/packages/winston-transport/src/utils.ts
const npmLevels: Record<string, number> = {
  error: SeverityNumber.ERROR,
  warn: SeverityNumber.WARN,
  info: SeverityNumber.INFO,
  http: SeverityNumber.DEBUG3,
  verbose: SeverityNumber.DEBUG2,
  debug: SeverityNumber.DEBUG,
  silly: SeverityNumber.TRACE,
};

const sysLoglevels: Record<string, number> = {
  emerg: SeverityNumber.FATAL3,
  alert: SeverityNumber.FATAL2,
  crit: SeverityNumber.FATAL,
  error: SeverityNumber.ERROR,
  warning: SeverityNumber.WARN,
  notice: SeverityNumber.INFO2,
  info: SeverityNumber.INFO,
  debug: SeverityNumber.DEBUG,
};

const cliLevels: Record<string, number> = {
  error: SeverityNumber.ERROR,
  warn: SeverityNumber.WARN,
  help: SeverityNumber.INFO3,
  data: SeverityNumber.INFO2,
  info: SeverityNumber.INFO,
  debug: SeverityNumber.DEBUG,
  prompt: SeverityNumber.TRACE4,
  verbose: SeverityNumber.TRACE3,
  input: SeverityNumber.TRACE2,
  silly: SeverityNumber.TRACE,
};

export function getSeverityNumber(level: string): SeverityNumber | undefined {
  return npmLevels[level] ?? sysLoglevels[level] ?? cliLevels[level];
}

export const parseLogAttributes = (
  meta: Record<string, any>,
): LogAttributes => {
  try {
    const attributes: LogAttributes = {};
    for (const key in meta) {
      if (Object.prototype.hasOwnProperty.call(meta, key)) {
        const value = meta[key];
        // stringify array of objects
        if (Array.isArray(value)) {
          const firstItem = value[0];
          if (isPlainObject(firstItem)) {
            attributes[key] = jsonToString(value);
          }
        }

        if (attributes[key] === undefined) {
          attributes[key] = value;
        }
      }
    }
    return attributes;
  } catch (error) {
    diag.error(`${LOG_PREFIX} Failed to parse log attributes. e = ${error}`);
    return meta;
  }
};

export class Logger {
  private readonly _url: string;

  private readonly logger: OtelLogger;

  private readonly processor: BatchLogRecordProcessor | NoopLogRecordProcessor;

  private readonly provider: LoggerProvider;

  constructor({
    baseUrl,
    bufferSize,
    detectResources,
    headers,
    queueSize,
    resourceAttributes,
    sendIntervalMs,
    service,
    timeout,
  }: LoggerOptions) {
    const _serviceName = DEFAULT_SERVICE_NAME();
    if (!service) {
      diag.warn(`${LOG_PREFIX} Service name not found. Use "${_serviceName}"`);
    }

    // sanity check bufferSize and queueSize
    const maxExportBatchSize = bufferSize ?? DEFAULT_EXPORTER_BATCH_SIZE;
    let maxQueueSize = queueSize ?? DEFAULT_MAX_QUEUE_SIZE;
    if (maxExportBatchSize > maxQueueSize) {
      diag.error(
        `${LOG_PREFIX} bufferSize must be smaller or equal to queueSize. Setting queueSize to ${maxExportBatchSize}`,
      );
      maxQueueSize = maxExportBatchSize;
    }

    const detectedResource = detectResourcesSync({
      detectors: detectResources
        ? [envDetectorSync, hostDetectorSync, osDetectorSync, processDetector]
        : [],
    });

    this._url = baseUrl ?? DEFAULT_OTEL_LOGS_EXPORTER_URL;

    diag.warn(`${LOG_PREFIX} Sending logs to ${this._url}`);

    const exporter = new OTLPLogExporter({
      url: this._url,
      ...(headers && { headers }),
    });
    this.processor = this.isDisabled()
      ? new NoopLogRecordProcessor()
      : new BatchLogRecordProcessor(exporter, {
          /** The maximum batch size of every export. It must be smaller or equal to
           * maxQueueSize. The default value is 512. */
          maxExportBatchSize,
          scheduledDelayMillis: sendIntervalMs ?? DEFAULT_SEND_INTERVAL_MS,
          exportTimeoutMillis: timeout ?? DEFAULT_EXPORTER_TIMEOUT_MS,
          maxQueueSize,
        });
    this.provider = new LoggerProvider({
      resource: detectedResource.merge(
        new Resource({
          'telemetry.distro.name': 'hyperdx',
          'telemetry.distro.version': PKG_VERSION,
          [SEMRESATTRS_SERVICE_NAME]: service ?? _serviceName,
          ...resourceAttributes,
        }),
      ),
    });
    this.provider.addLogRecordProcessor(this.processor);

    this.logger = this.provider.getLogger('node-logger');
  }

  private parseTimestamp(meta: Attributes): Date {
    // pino
    if (Number.isInteger(meta.time)) {
      return new Date(meta.time as number);
    }
    // set to current time if not provided
    return new Date();
  }

  isDisabled() {
    return getEnvWithoutDefaults().OTEL_LOGS_EXPORTER === 'none';
  }

  setGlobalLoggerProvider() {
    diag.debug('Setting global logger provider...');
    logs.setGlobalLoggerProvider(this.provider);
  }

  getExporterUrl() {
    return this._url;
  }

  getProvider() {
    return this.provider;
  }

  getProcessor() {
    return this.processor;
  }

  shutdown() {
    diag.debug('Shutting down HyperDX node logger...');
    return this.processor.shutdown();
  }

  forceFlush() {
    diag.debug('Forcing flush of HyperDX node logger...');
    return this.processor.forceFlush();
  }

  postMessage(
    level: string,
    body: string,
    meta: Record<string, any> = {},
  ): void {
    this.logger.emit({
      severityNumber: getSeverityNumber(level),
      // TODO: set up the mapping between different downstream log levels
      severityText: level,
      body,
      attributes: parseLogAttributes(meta),
      timestamp: this.parseTimestamp(meta),
    });
  }
}
