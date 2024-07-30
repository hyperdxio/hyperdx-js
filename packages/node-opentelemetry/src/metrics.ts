import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

import {
  DEFAULT_OTEL_METRIC_EXPORT_INTERVAL,
  DEFAULT_OTEL_METRIC_EXPORT_TIMEOUT,
  DEFAULT_OTEL_METRICS_EXPORTER_URL,
} from './constants';

export const getHyperDXMetricReader = () =>
  new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: DEFAULT_OTEL_METRICS_EXPORTER_URL,
    }),
    exportIntervalMillis: DEFAULT_OTEL_METRIC_EXPORT_INTERVAL,
    exportTimeoutMillis: DEFAULT_OTEL_METRIC_EXPORT_TIMEOUT,
  });
