import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

import {
  DEFAULT_OTEL_METRICS_EXPORTER_URL,
  DEFAULT_OTEL_METRICS_EXPORTER_EXPORT_INTERVAL,
} from './constants';

export const getHyperDXMetricReader = () =>
  new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: DEFAULT_OTEL_METRICS_EXPORTER_URL,
    }),
    exportIntervalMillis: DEFAULT_OTEL_METRICS_EXPORTER_EXPORT_INTERVAL,
  });
