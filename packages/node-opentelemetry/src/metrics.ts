import { OTLPMetricExporter as OTLPMetricExporterGRPC } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPMetricExporter as OTLPMetricExporterHTTP } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

import {
  DEFAULT_OTEL_METRIC_EXPORT_INTERVAL,
  DEFAULT_OTEL_METRIC_EXPORT_TIMEOUT,
} from './constants';

const env = process.env;

export const getHyperDXMetricReader = (url: string) =>
  new PeriodicExportingMetricReader({
    exporter:
      env.OTEL_EXPORTER_OTLP_PROTOCOL === 'grpc'
        ? new OTLPMetricExporterGRPC({ url })
        : new OTLPMetricExporterHTTP({ url }),
    exportIntervalMillis: DEFAULT_OTEL_METRIC_EXPORT_INTERVAL,
    exportTimeoutMillis: DEFAULT_OTEL_METRIC_EXPORT_TIMEOUT,
  });
