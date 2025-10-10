import {
  Attributes,
  context as apiContext,
  diag,
  trace,
} from '@opentelemetry/api';
import { Logger as OtelLogger, LogRecord, logs } from '@opentelemetry/api-logs';
import { getStringFromEnv } from '@opentelemetry/core';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import {
  detectResources,
  envDetector,
  hostDetector,
  osDetector,
  processDetector,
  resourceFromAttributes,
} from '@opentelemetry/resources';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
  NoopLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

import { version as PKG_VERSION } from '../../package.json';
import {
  DEFAULT_EXPORTER_BATCH_SIZE,
  DEFAULT_EXPORTER_TIMEOUT_MS,
  DEFAULT_MAX_QUEUE_SIZE,
  DEFAULT_OTEL_LOGS_EXPORTER_URL,
  DEFAULT_SEND_INTERVAL_MS,
  DEFAULT_SERVICE_NAME,
} from '../constants';

const LOG_PREFIX = `⚠️  [LOGGER]`;

/**
 * Load context from attributes and set it to logRecord.context
 *
 * @param {LogRecord} logRecord
 * @returns {LogRecord}
 */
function loadContext(logRecord: LogRecord): LogRecord {
  let context = apiContext.active();
  let attributes = logRecord.attributes;

  if (typeof attributes !== 'undefined') {
    const { trace_id, span_id, trace_flags, ...otherAttributes } =
      logRecord.attributes as Attributes & {
        trace_id?: string;
        span_id?: string;
        trace_flags?: number;
      };

    if (
      typeof trace_id !== 'undefined' &&
      typeof span_id !== 'undefined' &&
      typeof trace_flags !== 'undefined'
    ) {
      context = trace.setSpanContext(context, {
        traceId: trace_id,
        spanId: span_id,
        traceFlags: trace_flags,
        isRemote: true,
      });
    }

    attributes = otherAttributes;
  }

  return {
    ...logRecord,
    attributes,
    context,
  };
}

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

export class Logger {
  private readonly _url: string;

  private readonly logger: OtelLogger;

  private readonly processor: BatchLogRecordProcessor | NoopLogRecordProcessor;

  private readonly provider: LoggerProvider;

  constructor({
    baseUrl,
    bufferSize,
    detectResources: shouldDetectResources,
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

    const detectedResource = detectResources({
      detectors: shouldDetectResources
        ? [envDetector, hostDetector, osDetector, processDetector]
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
        resourceFromAttributes({
          // TODO: should use otel semantic conventions
          'hyperdx.distro.version': PKG_VERSION,
          [SEMRESATTRS_SERVICE_NAME]: service ?? _serviceName,
          ...resourceAttributes,
        }),
      ),
      processors: [this.processor],
    });

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
    return getStringFromEnv('OTEL_LOGS_EXPORTER') === 'none';
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

  postMessage(level: string, body: string, attributes: Attributes = {}): void {
    this.logger.emit(
      loadContext({
        // TODO: should map to otel severity number
        severityNumber: 0,
        // TODO: set up the mapping between different downstream log levels
        severityText: level,
        body,
        attributes,
        timestamp: this.parseTimestamp(attributes),
      }),
    );
  }
}
