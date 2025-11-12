import { getEnv, getEnvWithoutDefaults } from '@opentelemetry/core';
import { defaultServiceName } from '@opentelemetry/resources';

import { stringToBoolean } from './utils';

const env = process.env;

// enable otel debug mode if HDX_DEBUG_MODE_ENABLED is set
const otelEnv = getEnvWithoutDefaults();
const otelEnvWithDefaults = getEnv();

// TO EXTRACT ENV VARS [https://github.com/open-telemetry/opentelemetry-js/blob/3ab4f765d8d696327b7d139ae6a45e7bd7edd924/experimental/packages/sdk-logs/src/export/BatchLogRecordProcessorBase.ts#L50]
// TO EXTRACT DEFAULTS [https://github.com/open-telemetry/opentelemetry-js/blob/3ab4f765d8d696327b7d139ae6a45e7bd7edd924/experimental/packages/sdk-logs/src/types.ts#L49]
export const DEFAULT_EXPORTER_BATCH_SIZE =
  otelEnv.OTEL_BLRP_MAX_EXPORT_BATCH_SIZE ?? 512;
export const DEFAULT_EXPORTER_TIMEOUT_MS =
  otelEnv.OTEL_BLRP_EXPORT_TIMEOUT ?? 30000;
export const DEFAULT_MAX_QUEUE_SIZE = otelEnv.OTEL_BLRP_MAX_QUEUE_SIZE ?? 2048;
export const DEFAULT_OTEL_TRACES_EXPORTER = otelEnv.OTEL_TRACES_EXPORTER;
export const DEFAULT_OTEL_TRACES_EXPORTER_URL =
  otelEnv.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
  (otelEnv.OTEL_EXPORTER_OTLP_ENDPOINT
    ? otelEnv.OTEL_EXPORTER_OTLP_PROTOCOL === 'grpc'
      ? otelEnv.OTEL_EXPORTER_OTLP_ENDPOINT
      : `${otelEnv.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`
    : 'https://in-otel.hyperdx.io/v1/traces');
export const DEFAULT_OTEL_TRACES_SAMPLER =
  otelEnv.OTEL_TRACES_SAMPLER ?? 'parentbased_always_on';
export const DEFAULT_OTEL_TRACES_SAMPLER_ARG =
  otelEnv.OTEL_TRACES_SAMPLER_ARG ?? '1';
export const DEFAULT_OTEL_EXPORTER_OTLP_TRACES_TIMEOUT =
  otelEnv.OTEL_EXPORTER_OTLP_TRACES_TIMEOUT ?? 60000;
export const DEFAULT_SEND_INTERVAL_MS =
  otelEnv.OTEL_BLRP_SCHEDULE_DELAY ?? 2000;
export const DEFAULT_OTEL_LOGS_EXPORTER = otelEnv.OTEL_LOGS_EXPORTER;
export const DEFAULT_OTEL_LOGS_EXPORTER_URL =
  otelEnv.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT ??
  (otelEnv.OTEL_EXPORTER_OTLP_ENDPOINT
    ? otelEnv.OTEL_EXPORTER_OTLP_PROTOCOL === 'grpc'
      ? otelEnv.OTEL_EXPORTER_OTLP_ENDPOINT
      : `${otelEnv.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs`
    : 'https://in-otel.hyperdx.io/v1/logs');
export const DEFAULT_OTEL_METRICS_EXPORTER = env.OTEL_METRICS_EXPORTER; // not exist yet
export const DEFAULT_OTEL_METRICS_EXPORTER_URL =
  otelEnv.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ??
  (otelEnv.OTEL_EXPORTER_OTLP_ENDPOINT
    ? otelEnv.OTEL_EXPORTER_OTLP_PROTOCOL === 'grpc'
      ? otelEnv.OTEL_EXPORTER_OTLP_ENDPOINT
      : `${otelEnv.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`
    : 'https://in-otel.hyperdx.io/v1/metrics');
export const DEFAULT_OTEL_METRIC_EXPORT_INTERVAL =
  env.OTEL_METRIC_EXPORT_INTERVAL
    ? Number(env.OTEL_METRIC_EXPORT_INTERVAL)
    : 60000; // not exist yet
export const DEFAULT_OTEL_METRIC_EXPORT_TIMEOUT = env.OTEL_METRIC_EXPORT_TIMEOUT
  ? Number(env.OTEL_METRIC_EXPORT_TIMEOUT)
  : 30000; // not exist yet
export const DEFAULT_SERVICE_NAME = () =>
  getEnvWithoutDefaults().OTEL_SERVICE_NAME ?? defaultServiceName();
export const DEFAULT_OTEL_LOG_LEVEL = otelEnvWithDefaults.OTEL_LOG_LEVEL;

// HyperDX SDK specific configuration
export const DEFAULT_HDX_API_KEY = () => env.HYPERDX_API_KEY;
export const DEFAULT_HDX_NODE_BETA_MODE = () =>
  stringToBoolean(env.HDX_NODE_BETA_MODE) ?? false;
export const DEFAULT_HDX_NODE_CONSOLE_CAPTURE =
  stringToBoolean(env.HDX_NODE_CONSOLE_CAPTURE) ?? true;
export const DEFAULT_HDX_NODE_ADVANCED_NETWORK_CAPTURE =
  stringToBoolean(env.HDX_NODE_ADVANCED_NETWORK_CAPTURE) ?? false;
export const DEFAULT_HDX_NODE_STOP_ON_TERMINATION_SIGNALS =
  stringToBoolean(env.HDX_NODE_STOP_ON_TERMINATION_SIGNALS) ?? true;
export const DEFAULT_HDX_NODE_EXPERIMENTAL_EXCEPTION_CAPTURE =
  stringToBoolean(env.HDX_NODE_EXPERIMENTAL_EXCEPTION_CAPTURE) ?? false;
export const DEFAULT_HDX_NODE_SENTRY_INTEGRATION_ENABLED =
  stringToBoolean(env.HDX_NODE_SENTRY_INTEGRATION_ENABLED) ?? false;
export const DEFAULT_HDX_NODE_ENABLE_INTERNAL_PROFILING =
  stringToBoolean(env.HDX_NODE_ENABLE_INTERNAL_PROFILING) ?? false;
export const DEFAULT_HDX_STARTUP_LOGS =
  stringToBoolean(env.HDX_STARTUP_LOGS) ?? true;
