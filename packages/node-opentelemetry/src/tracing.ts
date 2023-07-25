import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

import hdx, { HDX_DEBUG_MODE_ENABLED, LOG_PREFIX } from './debug';
import { patchConsoleLog } from './patch';

const env = process.env;

// enable otel debug mode if HDX_DEBUG_MODE_ENABLED is set
if (HDX_DEBUG_MODE_ENABLED) {
  env.OTEL_LOG_LEVEL = 'debug';
}

// set default otel env vars
env.OTEL_EXPORTER_OTLP_ENDPOINT =
  env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'https://in-otel.hyperdx.io';
env.OTEL_NODE_RESOURCE_DETECTORS = env.OTEL_NODE_RESOURCE_DETECTORS ?? 'all';
env.OTEL_LOG_LEVEL = env.OTEL_LOG_LEVEL ?? 'info';
env.OTEL_TRACES_SAMPLER = env.OTEL_TRACES_SAMPLER ?? 'parentbased_always_on';
env.OTEL_TRACES_SAMPLER_ARG = env.OTEL_TRACES_SAMPLER_ARG ?? '1';

// patch OTEL_EXPORTER_OTLP_HEADERS to include API key
if (env.HYPERDX_API_KEY) {
  env.OTEL_EXPORTER_OTLP_HEADERS = `${env.OTEL_EXPORTER_OTLP_HEADERS},authorization=${env.HYPERDX_API_KEY}`;
} else {
  console.warn(`⚠️  ${LOG_PREFIX} HYPERDX_API_KEY is not set`);
}

hdx('Initializing opentelemetry SDK');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    timeoutMillis: 60000,
  }),
  // metricReader: metricReader,
  instrumentations: [
    getNodeAutoInstrumentations({
      // FIXME: issue detected with fs instrumentation (infinite loop)
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
  ],
});

if (env.OTEL_EXPORTER_OTLP_ENDPOINT && env.OTEL_EXPORTER_OTLP_HEADERS) {
  console.warn(
    `${LOG_PREFIX} Tracing is enabled with configs (${JSON.stringify(
      {
        endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
        logLevel: env.OTEL_LOG_LEVEL,
        propagators: env.OTEL_PROPAGATORS,
        resourceAttributes: env.OTEL_RESOURCE_ATTRIBUTES,
        resourceDetectors: env.OTEL_NODE_RESOURCE_DETECTORS,
        sampler: env.OTEL_TRACES_SAMPLER,
        samplerArg: env.OTEL_TRACES_SAMPLER_ARG,
        serviceName: env.OTEL_SERVICE_NAME,
      },
      null,
      2,
    )})...`,
  );
  hdx('Starting opentelemetry SDK');
  sdk.start();
} else {
  console.warn(
    `⚠️  ${LOG_PREFIX} OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OTLP_HEADERS are not set, tracing is disabled`,
  );
}

// patch console.log
patchConsoleLog();

// Graceful shutdown
process.on('SIGTERM', () => {
  hdx('SIGTERM received, shutting down');
  sdk
    .shutdown()
    .then(
      () => console.log(`${LOG_PREFIX} otel SDK shut down successfully`),
      (err) => console.log(`${LOG_PREFIX} Error shutting down otel SDK`, err),
    )
    .finally(() => process.exit(0));
});
