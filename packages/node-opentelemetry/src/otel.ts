import path from 'path';

import { wrap } from 'shimmer';
import { satisfies } from 'semver';
import { ExceptionInstrumentation } from '@hyperdx/instrumentation-exception';
import { SentryNodeInstrumentation } from '@hyperdx/instrumentation-sentry-node';
import { DiagLogLevel, diag } from '@opentelemetry/api';
import {
  InstrumentationBase,
  Instrumentation,
  InstrumentationModuleDefinition,
} from '@opentelemetry/instrumentation';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { Resource } from '@opentelemetry/resources';
import {
  InstrumentationConfigMap,
  getNodeAutoInstrumentations,
} from '@opentelemetry/auto-instrumentations-node';

import HyperDXConsoleInstrumentation from './instrumentations/console';
import HyperDXSpanProcessor from './spanProcessor';
import { getHyperDXHTTPInstrumentationConfig } from './instrumentations/http';
import {
  DEFAULT_HDX_NODE_ADVANCED_NETWORK_CAPTURE,
  DEFAULT_HDX_NODE_BETA_MODE,
  DEFAULT_HDX_NODE_CONSOLE_CAPTURE,
  DEFAULT_HDX_NODE_ENABLE_INTERNAL_PROFILING,
  DEFAULT_HDX_NODE_EXPERIMENTAL_EXCEPTION_CAPTURE,
  DEFAULT_HDX_NODE_STOP_ON_TERMINATION_SIGNALS,
  DEFAULT_OTEL_EXPORTER_OTLP_TRACES_TIMEOUT,
  DEFAULT_OTEL_LOGS_EXPORTER_URL,
  DEFAULT_OTEL_LOG_LEVEL,
  DEFAULT_OTEL_TRACES_EXPORTER_URL,
  DEFAULT_OTEL_TRACES_SAMPLER,
  DEFAULT_OTEL_TRACES_SAMPLER_ARG,
  DEFAULT_SERVICE_NAME,
} from './constants';
import { hyperDXGlobalContext } from './context';
import { version as PKG_VERSION } from '../package.json';

const LOG_PREFIX = `⚠️  [INSTRUMENTOR]`;

const env = process.env;

export type SDKConfig = {
  additionalInstrumentations?: InstrumentationBase[];
  advancedNetworkCapture?: boolean;
  betaMode?: boolean;
  consoleCapture?: boolean;
  experimentalExceptionCapture?: boolean;
  instrumentations?: InstrumentationConfigMap;
  programmaticImports?: boolean; // TEMP
  stopOnTerminationSignals?: boolean;
};

export const setTraceAttributes = hyperDXGlobalContext.setTraceAttributes;

const setOtelEnvs = () => {
  // set default otel env vars
  env.OTEL_NODE_RESOURCE_DETECTORS = env.OTEL_NODE_RESOURCE_DETECTORS ?? 'all';
  env.OTEL_TRACES_SAMPLER = DEFAULT_OTEL_TRACES_SAMPLER;
  env.OTEL_TRACES_SAMPLER_ARG = DEFAULT_OTEL_TRACES_SAMPLER_ARG;
};

let sdk: NodeSDK;

const getModuleId = (moduleName: string) => {
  try {
    const moduleId = require.resolve(moduleName);
    return moduleId;
  } catch (e) {
    return null;
  }
};

// https://github.com/open-telemetry/opentelemetry-js/blob/e49c4c7f42c6c444da3f802687cfa4f2d6983f46/experimental/packages/opentelemetry-instrumentation/src/platform/node/instrumentation.ts#L360
const isSupported = (
  supportedVersions: string[],
  version?: string,
  includePrerelease?: boolean,
): boolean => {
  if (typeof version === 'undefined') {
    // If we don't have the version, accept the wildcard case only
    return supportedVersions.includes('*');
  }

  return supportedVersions.some((supportedVersion) => {
    return satisfies(version, supportedVersion, { includePrerelease });
  });
};

const hrtimeToMs = (hrtime: [number, number]) => {
  return hrtime[0] * 1e3 + hrtime[1] / 1e6;
};

const pickPerformanceIndicator = (hrt: [number, number]) => {
  const speedInMs = hrtimeToMs(hrt);
  if (speedInMs < 0.5) {
    return '🚀'.repeat(3);
  } else if (speedInMs < 1) {
    return '🐌'.repeat(3);
  } else {
    return '🐢'.repeat(3);
  }
};

export const initSDK = (config: SDKConfig) => {
  diag.debug('Setting otel envs');
  setOtelEnvs();

  const stopOnTerminationSignals =
    config.stopOnTerminationSignals ??
    DEFAULT_HDX_NODE_STOP_ON_TERMINATION_SIGNALS; // Stop by default

  let exporterHeaders;
  if (env.HYPERDX_API_KEY) {
    exporterHeaders = {
      Authorization: env.HYPERDX_API_KEY,
    };
  } else {
    console.warn(`${LOG_PREFIX} HYPERDX_API_KEY is not set`);
  }

  diag.debug('Initializing OpenTelemetry SDK');

  let defaultConsoleCapture =
    config.consoleCapture ?? DEFAULT_HDX_NODE_CONSOLE_CAPTURE;
  if (DEFAULT_OTEL_LOG_LEVEL === DiagLogLevel.DEBUG) {
    // FIXME: better to disable console instrumentation if otel log is enabled
    defaultConsoleCapture = false;
    console.warn(
      `${LOG_PREFIX} OTEL_LOG_LEVEL is set to 'debug', disabling console instrumentation`,
    );
  }

  const defaultBetaMode = config.betaMode ?? DEFAULT_HDX_NODE_BETA_MODE;
  const defaultAdvancedNetworkCapture =
    config.advancedNetworkCapture ?? DEFAULT_HDX_NODE_ADVANCED_NETWORK_CAPTURE;

  const defaultExceptionCapture =
    config.experimentalExceptionCapture ??
    DEFAULT_HDX_NODE_EXPERIMENTAL_EXCEPTION_CAPTURE;

  let _t = process.hrtime();
  const allInstrumentations = [
    ...getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': defaultAdvancedNetworkCapture
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
    ...(defaultConsoleCapture
      ? [
          new HyperDXConsoleInstrumentation({
            betaMode: defaultBetaMode,
            loggerOptions: {
              baseUrl: DEFAULT_OTEL_LOGS_EXPORTER_URL,
              service: DEFAULT_SERVICE_NAME,
              headers: exporterHeaders,
            },
          }),
        ]
      : []),
    ...(defaultExceptionCapture
      ? [new ExceptionInstrumentation(), new SentryNodeInstrumentation()]
      : []),
    ...(config.additionalInstrumentations ?? []),
  ];
  const t1 = process.hrtime(_t);
  if (DEFAULT_HDX_NODE_ENABLE_INTERNAL_PROFILING) {
    const indicator = pickPerformanceIndicator(t1);
    console.info(
      `${indicator} Initialized instrumentations in ${hrtimeToMs(
        t1,
      )} ms ${indicator}`,
    );
  }

  _t = process.hrtime();
  sdk = new NodeSDK({
    resource: new Resource({
      // https://opentelemetry.io/docs/specs/semconv/resource/#telemetry-sdk-experimental
      'telemetry.distro.name': 'hyperdx',
      'telemetry.distro.version': PKG_VERSION,
    }),
    // metricReader: metricReader,
    spanProcessors: [
      new HyperDXSpanProcessor({
        exporter: new OTLPTraceExporter({
          timeoutMillis: DEFAULT_OTEL_EXPORTER_OTLP_TRACES_TIMEOUT,
          url: DEFAULT_OTEL_TRACES_EXPORTER_URL,
          headers: exporterHeaders,
        }),
        enableHDXGlobalContext: defaultBetaMode,
      }),
    ],
    instrumentations: allInstrumentations,
  });
  const t2 = process.hrtime(_t);
  if (DEFAULT_HDX_NODE_ENABLE_INTERNAL_PROFILING) {
    const indicator = pickPerformanceIndicator(t2);
    console.info(
      `${indicator} Initialized NodeSDK in ${hrtimeToMs(t2)} ms ${indicator}`,
    );
  }

  if (env.OTEL_EXPORTER_OTLP_HEADERS || env.HYPERDX_API_KEY) {
    console.warn(
      `${LOG_PREFIX} Tracing is enabled with configs (${JSON.stringify(
        {
          advancedNetworkCapture: defaultAdvancedNetworkCapture,
          betaMode: defaultBetaMode,
          consoleCapture: defaultConsoleCapture,
          distroVersion: PKG_VERSION,
          endpoint: DEFAULT_OTEL_TRACES_EXPORTER_URL,
          logLevel: DEFAULT_OTEL_LOG_LEVEL,
          programmaticImports: config.programmaticImports,
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

    if (DEFAULT_HDX_NODE_ENABLE_INTERNAL_PROFILING) {
      diag.debug('Enabling internal profiling');
      for (const instrumentation of allInstrumentations) {
        const _originalEnable = instrumentation.enable;
        instrumentation.enable = function (...args: any[]) {
          const start = process.hrtime();
          // @ts-ignore
          const result = _originalEnable.apply(this, args);
          const end = process.hrtime(start);
          const indicator = pickPerformanceIndicator(end);
          console.info(
            `${indicator} Enabled instrumentation ${
              instrumentation.constructor.name
            } in ${hrtimeToMs(end)} ms ${indicator}`,
          );
          return result;
        };

        const modules = (instrumentation as any)
          ._modules as InstrumentationModuleDefinition[];
        for (const module of modules) {
          if (typeof module.patch === 'function') {
            // benchmark when patch gets called
            wrap(module, 'patch', (original) => {
              return (...args: any[]) => {
                const start = process.hrtime();
                // @ts-ignore
                const result = original.apply(this, args);
                const end = process.hrtime(start);
                const indicator = pickPerformanceIndicator(end);
                console.info(
                  `${indicator} Patched ${module.name}${
                    module.moduleVersion ? ` [v${module.moduleVersion}] ` : ' '
                  }in ${hrtimeToMs(end)} ms ${indicator}`,
                );
                return result;
              };
            });
          }
          for (const file of module.files) {
            if (typeof file.patch === 'function') {
              wrap(file, 'patch', (original) => {
                return (...args: any[]) => {
                  const start = process.hrtime();
                  // @ts-ignore
                  const result = original.apply(this, args);
                  const end = process.hrtime(start);
                  const indicator = pickPerformanceIndicator(end);
                  console.info(
                    `${indicator} Patched ${module.name}${
                      module.moduleVersion
                        ? ` [v${module.moduleVersion}] `
                        : ' '
                    }file ${file.name} in ${hrtimeToMs(end)} ms ${indicator}`,
                  );
                  return result;
                };
              });
            }
          }
        }
      }
    }

    diag.debug('Starting opentelemetry SDK');
    sdk.start();

    if (config.programmaticImports) {
      for (const instrumentation of allInstrumentations) {
        const modules = (instrumentation as any)
          ._modules as InstrumentationModuleDefinition[];
        if (Array.isArray(modules)) {
          // disable first before re-patching
          instrumentation.disable();

          for (const module of modules) {
            // re-require moduleExports
            if (getModuleId(module.name)) {
              try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const _m = require(module.name);
                module.moduleExports = _m;
              } catch (e) {
                diag.error(
                  'Error re-requiring moduleExports for nodejs module',
                  {
                    module: module.name,
                    version: module.moduleVersion,
                    error: e,
                  },
                );
              }
              try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const _pkg = require(path.join(module.name, 'package.json'));
                module.moduleVersion = _pkg.version;
              } catch (e) {
                diag.error(
                  'Error re-requiring package.json for nodejs module',
                  {
                    module: module.name,
                    version: module.moduleVersion,
                    error: e,
                  },
                );
              }

              // https://github.com/open-telemetry/opentelemetry-js/blob/e49c4c7f42c6c444da3f802687cfa4f2d6983f46/experimental/packages/opentelemetry-instrumentation/src/platform/node/instrumentation.ts#L265
              if (
                isSupported(
                  module.supportedVersions,
                  module.moduleVersion,
                  module.includePrerelease,
                ) &&
                typeof module.patch === 'function' &&
                module.moduleExports
              ) {
                diag.debug(
                  'Applying instrumentation patch for nodejs module on instrumentation enabled',
                  {
                    module: module.name,
                    version: module.moduleVersion,
                  },
                );
                try {
                  module.patch(module.moduleExports, module.moduleVersion);
                } catch (e) {
                  diag.error(
                    'Error applying instrumentation patch for nodejs module',
                    e,
                  );
                }
              }

              const files = module.files ?? [];
              const supportedFileInstrumentations = files.filter((f) =>
                isSupported(
                  f.supportedVersions,
                  module.moduleVersion,
                  module.includePrerelease,
                ),
              );

              for (const sfi of supportedFileInstrumentations) {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-var-requires
                  const _m = require(sfi.name);
                  sfi.moduleExports = _m;
                } catch (e) {
                  diag.error(
                    'Error re-requiring moduleExports for nodejs module file',
                    e,
                  );
                  continue;
                }

                diag.debug(
                  'Applying instrumentation patch for nodejs module file on require hook',
                  {
                    module: module.name,
                    version: module.moduleVersion,
                    fileName: sfi.name,
                  },
                );

                try {
                  // patch signature is not typed, so we cast it assuming it's correct
                  sfi.patch(sfi.moduleExports, module.moduleVersion);
                } catch (e) {
                  diag.error(
                    'Error applying instrumentation patch for nodejs module file',
                    e,
                  );
                }
              }
            }
          }
        }
      }
    }

    if (defaultBetaMode) {
      diag.debug(`Beta mode enabled, starting global context`);
      hyperDXGlobalContext.start();
    }
  } else {
    console.warn(
      `${LOG_PREFIX} HYPERDX_API_KEY or OTEL_EXPORTER_OTLP_HEADERS is not set, tracing is disabled`,
    );
  }

  diag.debug(
    stopOnTerminationSignals
      ? 'stopOnTerminationSignals enabled'
      : 'stopOnTerminationSignals disabled (user is responsible for graceful shutdown on termination signals)',
  );

  function handleTerminationSignal(signal: string) {
    diag.debug(`${signal} received, shutting down...`);
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
  hyperDXGlobalContext?.shutdown();
  return (
    sdk?.shutdown()?.then(
      () => console.log(`${LOG_PREFIX} otel SDK shut down successfully`),
      (err) => console.log(`${LOG_PREFIX} Error shutting down otel SDK`, err),
    ) ?? Promise.resolve() // in case SDK isn't init'd yet
  );
};

export const shutdown = () => {
  diag.debug('shutdown() called');
  return _shutdown();
};
