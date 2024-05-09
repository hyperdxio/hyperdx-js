import { InstrumentationBase } from '@opentelemetry/instrumentation';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { Resource } from '@opentelemetry/resources';
import {
  getNodeAutoInstrumentations,
  InstrumentationConfigMap,
} from '@opentelemetry/auto-instrumentations-node';

import HyperDXConsoleInstrumentation from './instrumentations/console';
import HyperDXSpanProcessor from './spanProcessor';
import hdx, {
  HDX_DEBUG_MODE_ENABLED,
  LOG_PREFIX as _LOG_PREFIX,
} from './debug';
import { getHyperDXHTTPInstrumentationConfig } from './instrumentations/http';
import {
  DEFAULT_OTEL_EXPORTER_OTLP_TRACES_TIMEOUT,
  DEFAULT_OTEL_LOGS_EXPORTER_URL,
  DEFAULT_OTEL_TRACES_EXPORTER_URL,
  DEFAULT_OTEL_TRACES_SAMPLER,
  DEFAULT_OTEL_TRACES_SAMPLER_ARG,
  DEFAULT_SERVICE_NAME,
  DEFAULT_OTEL_LOG_LEVEL,
} from './constants';
import { hyperDXGlobalContext } from './context';
import { version as PKG_VERSION } from '../package.json';

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

const setOtelEnvs = () => {
  // set default otel env vars
  env.OTEL_NODE_RESOURCE_DETECTORS = env.OTEL_NODE_RESOURCE_DETECTORS ?? 'all';
  env.OTEL_LOG_LEVEL = DEFAULT_OTEL_LOG_LEVEL;
  env.OTEL_TRACES_SAMPLER = DEFAULT_OTEL_TRACES_SAMPLER;
  env.OTEL_TRACES_SAMPLER_ARG = DEFAULT_OTEL_TRACES_SAMPLER_ARG;
};

let sdk: NodeSDK;
let hdxConsoleInstrumentation: HyperDXConsoleInstrumentation;

export const initSDK = (config: SDKConfig) => {
  hdx('Setting otel envs');
  setOtelEnvs();

  const stopOnTerminationSignals = config.stopOnTerminationSignals ?? true; // Stop by default

  let exporterHeaders;
  if (env.HYPERDX_API_KEY) {
    exporterHeaders = {
      Authorization: env.HYPERDX_API_KEY,
    };
  } else {
    console.warn(`${LOG_PREFIX} HYPERDX_API_KEY is not set`);
  }

  hdx('Initializing OpenTelemetry SDK');
  const consoleInstrumentationEnabled = config.consoleCapture ?? true;
  hdxConsoleInstrumentation = new HyperDXConsoleInstrumentation({
    baseUrl: DEFAULT_OTEL_LOGS_EXPORTER_URL,
    betaMode: config.betaMode,
    service: DEFAULT_SERVICE_NAME,
    headers: exporterHeaders,
  });

  sdk = new NodeSDK({
    resource: new Resource({
      // TODO: should use otel semantic conventions
      'hyperdx.distro.version': PKG_VERSION,
      'hyperdx.distro.runtime_version': process.versions.node,
    }),
    // metricReader: metricReader,
    ...(config.betaMode
      ? {
          spanProcessor: new HyperDXSpanProcessor(
            new OTLPTraceExporter({
              timeoutMillis: DEFAULT_OTEL_EXPORTER_OTLP_TRACES_TIMEOUT,
              url: DEFAULT_OTEL_TRACES_EXPORTER_URL,
              headers: exporterHeaders,
            }),
          ) as any,
        }
      : {
          traceExporter: new OTLPTraceExporter({
            timeoutMillis: DEFAULT_OTEL_EXPORTER_OTLP_TRACES_TIMEOUT,
            url: DEFAULT_OTEL_TRACES_EXPORTER_URL,
            headers: exporterHeaders,
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
        ...config.instrumentations,
      }),
      ...(config.additionalInstrumentations ?? []),
    ],
  });

  if (env.OTEL_EXPORTER_OTLP_HEADERS || env.HYPERDX_API_KEY) {
    console.warn(
      `${LOG_PREFIX} Tracing is enabled with configs (${JSON.stringify(
        {
          advancedNetworkCapture: config.advancedNetworkCapture,
          betaMode: config.betaMode,
          consoleCapture: consoleInstrumentationEnabled,
          endpoint: DEFAULT_OTEL_TRACES_EXPORTER_URL,
          logLevel: DEFAULT_OTEL_LOG_LEVEL,
          propagators: env.OTEL_PROPAGATORS,
          resourceAttributes: env.OTEL_RESOURCE_ATTRIBUTES,
          resourceDetectors: env.OTEL_NODE_RESOURCE_DETECTORS,
          sampler: DEFAULT_OTEL_TRACES_SAMPLER,
          samplerArg: DEFAULT_OTEL_TRACES_SAMPLER_ARG,
          serviceName: DEFAULT_SERVICE_NAME,
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
