import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// Resources
import { envDetector, processDetector } from '@opentelemetry/resources';
import { alibabaCloudEcsDetector } from '@opentelemetry/resource-detector-alibaba-cloud';
import { awsEc2Detector } from '@opentelemetry/resource-detector-aws';
import { containerDetector } from '@opentelemetry/resource-detector-container';
import { dockerCGroupV1Detector } from '@opentelemetry/resource-detector-docker';
import { gcpDetector } from '@opentelemetry/resource-detector-gcp';

import { patchConsoleLog } from './patch';
import { name as PKG_NAME, version as PKG_VERSION } from '../package.json';

const LOG_PREFIX = `[${PKG_NAME} v${PKG_VERSION}]`;

const env = process.env;

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
  resourceDetectors: [
    alibabaCloudEcsDetector,
    awsEc2Detector,
    containerDetector,
    dockerCGroupV1Detector,
    envDetector,
    gcpDetector,
    processDetector,
  ],
});

// set default OTEL_EXPORTER_OTLP_ENDPOINT
env.OTEL_EXPORTER_OTLP_ENDPOINT =
  env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'https://in-otel.hyperdx.io';

// patch OTEL_EXPORTER_OTLP_HEADERS to include API key
if (env.HYPERDX_API_KEY) {
  env.OTEL_EXPORTER_OTLP_HEADERS = `${env.OTEL_EXPORTER_OTLP_HEADERS},authorization=${env.HYPERDX_API_KEY}`;
}

if (env.OTEL_EXPORTER_OTLP_ENDPOINT && env.OTEL_EXPORTER_OTLP_HEADERS) {
  console.warn(`${LOG_PREFIX} Tracing is enabled...`);
  sdk.start();
} else {
  console.warn(
    `${LOG_PREFIX} OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OTLP_HEADERS are not set, tracing is disabled`,
  );
}

// patch console.log
patchConsoleLog();

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(
      () => console.log(`${LOG_PREFIX} otel SDK shut down successfully`),
      (err) => console.log(`${LOG_PREFIX} Error shutting down otel SDK`, err),
    )
    .finally(() => process.exit(0));
});
