import { Attributes, diag } from '@opentelemetry/api';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import { Logger as OtelLogger } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import {
  Resource,
  detectResourcesSync,
  envDetectorSync,
  hostDetectorSync,
  osDetectorSync,
  processDetector,
} from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

import {
  DEFAULT_EXPORTER_BATCH_SIZE,
  DEFAULT_EXPORTER_TIMEOUT_MS,
  DEFAULT_MAX_QUEUE_SIZE,
  DEFAULT_OTEL_LOGS_EXPORTER_URL,
  DEFAULT_SEND_INTERVAL_MS,
  DEFAULT_SERVICE_NAME,
} from '../constants';
import { version as PKG_VERSION } from '../../package.json';

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

export class Logger {
  private readonly logger: OtelLogger;

  private readonly processor: BatchLogRecordProcessor;

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
      ...(headers && { headers }),
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
          // TODO: should use otel semantic conventions
          'hyperdx.distro.version': PKG_VERSION,
          [SEMRESATTRS_SERVICE_NAME]: service ?? DEFAULT_SERVICE_NAME,
          ...resourceAttributes,
        }),
      ),
    });
    loggerProvider.addLogRecordProcessor(this.processor);

    this.logger = loggerProvider.getLogger('node-logger');
    console.log(`${LOG_PREFIX} started!`);
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
    diag.debug('Shutting down HyperDX node logger...');
    return this.processor.shutdown();
  }

  forceFlush() {
    diag.debug('Forcing flush of HyperDX node logger...');
    return this.processor.forceFlush();
  }

  postMessage(level: string, body: string, attributes: Attributes = {}): void {
    this.logger.emit({
      // TODO: should map to otel severity number
      severityNumber: 0,
      // TODO: set up the mapping between different downstream log levels
      severityText: level,
      body,
      attributes,
      timestamp: this.parseTimestamp(attributes),
    });
  }
}
