import { OTLPMetricExporter as OTLPMetricExporterGRPC } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPMetricExporter as OTLPMetricExporterHTTP } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

import {
  DEFAULT_OTEL_METRIC_EXPORT_INTERVAL,
  DEFAULT_OTEL_METRIC_EXPORT_TIMEOUT,
  DEFAULT_OTEL_METRICS_EXPORTER_URL,
} from './constants';

const env = process.env;

export const getHyperDXMetricReader = () =>
  new PeriodicExportingMetricReader({
    exporter:
      env.OTEL_EXPORTER_OTLP_PROTOCOL === 'grpc'
        ? new OTLPMetricExporterGRPC({
            url: DEFAULT_OTEL_METRICS_EXPORTER_URL,
          })
        : new OTLPMetricExporterHTTP({
            url: DEFAULT_OTEL_METRICS_EXPORTER_URL,
          }),
    exportIntervalMillis: DEFAULT_OTEL_METRIC_EXPORT_INTERVAL,
    exportTimeoutMillis: DEFAULT_OTEL_METRIC_EXPORT_TIMEOUT,
  });
