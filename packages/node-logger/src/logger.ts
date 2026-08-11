import stringifySafe from 'json-stringify-safe';
import { Attributes, diag, DiagConsoleLogger } from '@opentelemetry/api';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Logger as OtelLogger } from '@opentelemetry/api-logs';
import {
  resourceFromAttributes,
  detectResources as otelDetectResources,
  envDetector,
  hostDetector,
  osDetector,
  processDetector,
} from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

import hdx, { LOG_PREFIX as _LOG_PREFIX } from './debug';
import { version as PKG_VERSION } from '../package.json';

const env = process.env;

// Helper to parse numeric env vars
const getNumEnv = (key: string): number | undefined => {
  const val = env[key];
  if (val == null || val === '') return undefined;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
};

// DEBUG otel modules
if (env.OTEL_LOG_LEVEL) {
  diag.setLogger(new DiagConsoleLogger(), {
    logLevel: env.OTEL_LOG_LEVEL as any,
  });
}

// TO EXTRACT ENV VARS [https://github.com/open-telemetry/opentelemetry-js/blob/3ab4f765d8d696327b7d139ae6a45e7bd7edd924/experimental/packages/sdk-logs/src/export/BatchLogRecordProcessorBase.ts#L50]
// TO EXTRACT DEFAULTS [https://github.com/open-telemetry/opentelemetry-js/blob/3ab4f765d8d696327b7d139ae6a45e7bd7edd924/experimental/packages/sdk-logs/src/types.ts#L49]
const DEFAULT_EXPORTER_BATCH_SIZE =
  getNumEnv('OTEL_BLRP_MAX_EXPORT_BATCH_SIZE') ?? 512;
const DEFAULT_EXPORTER_TIMEOUT_MS =
  getNumEnv('OTEL_BLRP_EXPORT_TIMEOUT') ?? 30000;
const DEFAULT_MAX_QUEUE_SIZE = getNumEnv('OTEL_BLRP_MAX_QUEUE_SIZE') ?? 2048;
const DEFAULT_OTEL_LOGS_EXPORTER_URL =
  env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT ??
  (env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs`
    : 'https://in-otel.hyperdx.io/v1/logs');
const DEFAULT_SEND_INTERVAL_MS = getNumEnv('OTEL_BLRP_SCHEDULE_DELAY') ?? 2000;
const DEFAULT_SERVICE_NAME = env.OTEL_SERVICE_NAME ?? 'unknown_service';

const LOG_PREFIX = `⚠️  ${_LOG_PREFIX}`;

export const jsonToString = (json) => {
  try {
    return JSON.stringify(json);
  } catch (ex) {
    hdx(`Failed to stringify json. e = ${ex}`);
    return stringifySafe(json);
  }
};

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

    const detectedResource = otelDetectResources({
      detectors: detectResources
        ? [envDetector, hostDetector, osDetector, processDetector]
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
        resourceFromAttributes({
          // TODO: should use otel semantic conventions
          'hyperdx.distro.version': PKG_VERSION,
          [ATTR_SERVICE_NAME]: service ?? DEFAULT_SERVICE_NAME,
          ...resourceAttributes,
        }),
      ),
      processors: [this.processor],
    });

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
    hdx('Shutting down HyperDX node logger...');
    return this.processor.shutdown();
  }

  forceFlush() {
    hdx('Forcing flush of HyperDX node logger...');
    return this.processor.forceFlush();
  }

  postMessage(level: string, body: string, attributes: Attributes = {}): void {
    hdx('Emitting log from HyperDX node logger...');
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
