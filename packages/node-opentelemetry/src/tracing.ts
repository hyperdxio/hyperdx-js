import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

import { patchConsoleLog } from './patch';
import { version as PKG_VERSION } from '../package.json';

const env = process.env;

// set default OTEL_EXPORTER_OTLP_ENDPOINT
env.OTEL_EXPORTER_OTLP_ENDPOINT =
  env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'https://in-otel.hyperdx.io';

// patch OTEL_EXPORTER_OTLP_HEADERS to include API key
if (env.HYPERDX_API_KEY) {
  env.OTEL_EXPORTER_OTLP_HEADERS = `${env.OTEL_EXPORTER_OTLP_HEADERS},authorization=${env.HYPERDX_API_KEY}`;
}

if (env.OTEL_EXPORTER_OTLP_ENDPOINT && env.OTEL_EXPORTER_OTLP_HEADERS) {
  console.warn(`[v${PKG_VERSION}] Tracing is enabled...`);

  const resource = Resource.default().merge(
    new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: env.OTEL_SERVICE_NAME,
    }),
  );
  const provider = new NodeTracerProvider({
    resource: resource,
  });
  const exporter = new OTLPTraceExporter();
  const processor = new BatchSpanProcessor(exporter, {
    scheduledDelayMillis: 0,
    maxQueueSize: 8192,
    maxExportBatchSize: 512,
  });
  provider.addSpanProcessor(processor);
  provider.register();

  // This registers all instrumentation packages
  registerInstrumentations({
    instrumentations: [getNodeAutoInstrumentations()],
  });
} else {
  console.warn(
    'OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OTLP_HEADERS are not set, tracing is disabled',
  );
}

// patch console.log
patchConsoleLog();
