import { DiagLogLevel } from '@opentelemetry/api';
import { defaultServiceName } from '@opentelemetry/resources';
import { getEnvWithoutDefaults } from '@opentelemetry/core';

import { HDX_DEBUG_MODE_ENABLED } from './debug';

// enable otel debug mode if HDX_DEBUG_MODE_ENABLED is set
const otelEnv = getEnvWithoutDefaults();

// TO EXTRACT ENV VARS [https://github.com/open-telemetry/opentelemetry-js/blob/3ab4f765d8d696327b7d139ae6a45e7bd7edd924/experimental/packages/sdk-logs/src/export/BatchLogRecordProcessorBase.ts#L50]
// TO EXTRACT DEFAULTS [https://github.com/open-telemetry/opentelemetry-js/blob/3ab4f765d8d696327b7d139ae6a45e7bd7edd924/experimental/packages/sdk-logs/src/types.ts#L49]
export const DEFAULT_EXPORTER_BATCH_SIZE =
  otelEnv.OTEL_BLRP_MAX_EXPORT_BATCH_SIZE ?? 512;
export const DEFAULT_EXPORTER_TIMEOUT_MS =
  otelEnv.OTEL_BLRP_EXPORT_TIMEOUT ?? 30000;
export const DEFAULT_MAX_QUEUE_SIZE = otelEnv.OTEL_BLRP_MAX_QUEUE_SIZE ?? 2048;
export const DEFAULT_OTEL_TRACES_EXPORTER_URL =
  otelEnv.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
  (otelEnv.OTEL_EXPORTER_OTLP_ENDPOINT
    ? `${otelEnv.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`
    : 'https://in-otel.hyperdx.io/v1/traces');
export const DEFAULT_OTEL_LOGS_EXPORTER_URL =
  otelEnv.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT ??
  (otelEnv.OTEL_EXPORTER_OTLP_ENDPOINT
    ? `${otelEnv.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs`
    : 'https://in-otel.hyperdx.io/v1/logs');
export const DEFAULT_SEND_INTERVAL_MS =
  otelEnv.OTEL_BLRP_SCHEDULE_DELAY ?? 2000;
export const DEFAULT_SERVICE_NAME =
  otelEnv.OTEL_SERVICE_NAME ?? defaultServiceName();
export const DEFAULT_OTEL_TRACES_SAMPLER =
  otelEnv.OTEL_TRACES_SAMPLER ?? 'parentbased_always_on';
export const DEFAULT_OTEL_TRACES_SAMPLER_ARG =
  otelEnv.OTEL_TRACES_SAMPLER_ARG ?? '1';
export const DEFAULT_OTEL_EXPORTER_OTLP_TRACES_TIMEOUT =
  otelEnv.OTEL_EXPORTER_OTLP_TRACES_TIMEOUT ?? 60000;
export const DEFAULT_OTEL_LOG_LEVEL =
  (otelEnv.OTEL_LOG_LEVEL as unknown as string | undefined) ?? // need to be string not number bruh...
  (HDX_DEBUG_MODE_ENABLED ? 'debug' : 'none');
