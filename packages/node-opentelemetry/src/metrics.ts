import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

import { DEFAULT_OTEL_METRICS_EXPORTER_URL } from './constants';

export const hyprdxMetricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter({
    url: DEFAULT_OTEL_METRICS_EXPORTER_URL,
  }),
  exportIntervalMillis: 1000,
});
