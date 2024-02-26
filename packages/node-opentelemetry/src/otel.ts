import { NetInstrumentation } from '@opentelemetry/instrumentation-net';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { Resource } from '@opentelemetry/resources';
import {
  getNodeAutoInstrumentations,
  InstrumentationConfigMap,
} from '@opentelemetry/auto-instrumentations-node';

import { version as PKG_VERSION } from '../package.json';
import hdx, {
  HDX_DEBUG_MODE_ENABLED,
  LOG_PREFIX as _LOG_PREFIX,
} from './debug';
import HyperDXConsoleInstrumentation from './instrumentations/console';
import HyperDXSpanProcessor from './spanProcessor';
import { getHyperDXHTTPInstrumentationConfig } from './instrumentations/http';
import { hyperDXGlobalContext } from './context';
import { InstrumentationBase } from '@opentelemetry/instrumentation';

const LOG_PREFIX = `⚠️  ${_LOG_PREFIX}`;

const env = process.env;

export type SDKConfig = {
  advancedNetworkCapture?: boolean;
  betaMode?: boolean;
  consoleCapture?: boolean;
  instrumentations?: InstrumentationConfigMap;
  additionalInstrumentations?: InstrumentationBase[];
  stopOnTerminationSignals?: boolean;
};

export const setTraceAttributes = hyperDXGlobalContext.setTraceAttributes;

let sdk: NodeSDK;
let hdxConsoleInstrumentation: HyperDXConsoleInstrumentation;

export const initSDK = (config: SDKConfig) => {
  // enable otel debug mode if HDX_DEBUG_MODE_ENABLED is set
  if (HDX_DEBUG_MODE_ENABLED) {
    env.OTEL_LOG_LEVEL = 'debug';
  }

  // set default otel env vars
  env.OTEL_EXPORTER_OTLP_ENDPOINT =
    env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'https://in-otel.hyperdx.io';
  env.OTEL_NODE_RESOURCE_DETECTORS = env.OTEL_NODE_RESOURCE_DETECTORS ?? 'all';
  env.OTEL_LOG_LEVEL = env.OTEL_LOG_LEVEL ?? 'none'; // silence by default
  env.OTEL_TRACES_SAMPLER = env.OTEL_TRACES_SAMPLER ?? 'parentbased_always_on';
  env.OTEL_TRACES_SAMPLER_ARG = env.OTEL_TRACES_SAMPLER_ARG ?? '1';

  // patch OTEL_EXPORTER_OTLP_HEADERS to include API key
  if (env.HYPERDX_API_KEY) {
    env.OTEL_EXPORTER_OTLP_HEADERS = `${env.OTEL_EXPORTER_OTLP_HEADERS},authorization=${env.HYPERDX_API_KEY}`;
  } else {
    console.warn(`${LOG_PREFIX} HYPERDX_API_KEY is not set`);
  }

  const stopOnTerminationSignals = config.stopOnTerminationSignals ?? true; // Stop by default

  hdx('Initializing OpenTelemetry SDK');
  const consoleInstrumentationEnabled = config.consoleCapture ?? true;
  const apiKey =
    env.HYPERDX_API_KEY ?? env.OTEL_EXPORTER_OTLP_HEADERS?.split('=')[1];
  hdxConsoleInstrumentation = new HyperDXConsoleInstrumentation({
    apiKey,
    betaMode: config.betaMode,
    service: env.OTEL_SERVICE_NAME,
  });

  sdk = new NodeSDK({
    resource: new Resource({
      'hyperdx.distro.version': PKG_VERSION,
      'hyperdx.distro.runtime_version': process.versions.node,
    }),
    // metricReader: metricReader,
    ...(config.betaMode
      ? {
          spanProcessor: new HyperDXSpanProcessor(
            new OTLPTraceExporter({
              timeoutMillis: 60000,
            }),
          ) as any,
        }
      : {
          traceExporter: new OTLPTraceExporter({
            timeoutMillis: 60000,
          }),
        }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': config.advancedNetworkCapture
          ? getHyperDXHTTPInstrumentationConfig({
              httpCaptureHeadersClientRequest:
                env.OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_CLIENT_REQUEST,
              httpCaptureHeadersClientResponse:
                env.OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_CLIENT_RESPONSE,
              httpCaptureHeadersServerRequest:
                env.OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_SERVER_REQUEST,
              httpCaptureHeadersServerResponse:
                env.OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_SERVER_RESPONSE,
            })
          : { enabled: true },
        // FIXME: issue detected with fs instrumentation (infinite loop)
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        // FIXME: enable this once auto instrumentation is upgraded to v0.40.2
        '@opentelemetry/instrumentation-net': {
          enabled: false,
        },
        ...config.instrumentations,
      }),
      // for fix: https://github.com/open-telemetry/opentelemetry-js-contrib/releases/tag/instrumentation-net-v0.32.4
      new NetInstrumentation(),
      ...(config.additionalInstrumentations ?? []),
    ],
  });

  if (env.OTEL_EXPORTER_OTLP_ENDPOINT && env.OTEL_EXPORTER_OTLP_HEADERS) {
    console.warn(
      `${LOG_PREFIX} Tracing is enabled with configs (${JSON.stringify(
        {
          advancedNetworkCapture: config.advancedNetworkCapture,
          betaMode: config.betaMode,
          consoleCapture: consoleInstrumentationEnabled,
          endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
          logLevel: env.OTEL_LOG_LEVEL,
          propagators: env.OTEL_PROPAGATORS,
          resourceAttributes: env.OTEL_RESOURCE_ATTRIBUTES,
          resourceDetectors: env.OTEL_NODE_RESOURCE_DETECTORS,
          sampler: env.OTEL_TRACES_SAMPLER,
          samplerArg: env.OTEL_TRACES_SAMPLER_ARG,
          serviceName: env.OTEL_SERVICE_NAME,
          stopOnTerminationSignals,
        },
        null,
        2,
      )})...`,
    );

    if (consoleInstrumentationEnabled) {
      hdx('Enabling console instrumentation');
      hdxConsoleInstrumentation.enable();
    }
    hdx('Starting opentelemetry SDK');
    sdk.start();

    if (config.betaMode) {
      hdx(`Beta mode enabled, starting global context`);
      hyperDXGlobalContext.start();
    }
  } else {
    console.warn(
      `${LOG_PREFIX} OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OTLP_HEADERS are not set, tracing is disabled`,
    );
  }

  hdx(
    stopOnTerminationSignals
      ? 'stopOnTerminationSignals enabled'
      : 'stopOnTerminationSignals disabled (user is responsible for graceful shutdown on termination signals)',
  );

  function handleTerminationSignal(signal: string) {
    hdx(`${signal} received, shutting down...`);
    _shutdown().finally(() => process.exit());
  }

  // Graceful shutdown
  if (stopOnTerminationSignals) {
    process.on('SIGTERM', () => {
      handleTerminationSignal('SIGTERM');
    });
    process.on('SIGINT', () => {
      handleTerminationSignal('SIGINT');
    });
  }
};

const _shutdown = () => {
  hdxConsoleInstrumentation?.disable();
  hyperDXGlobalContext?.shutdown();
  return (
    sdk?.shutdown()?.then(
      () => console.log(`${LOG_PREFIX} otel SDK shut down successfully`),
      (err) => console.log(`${LOG_PREFIX} Error shutting down otel SDK`, err),
    ) ?? Promise.resolve() // in case SDK isn't init'd yet
  );
};

export const shutdown = () => {
  hdx('shutdown() called');
  return _shutdown();
};
