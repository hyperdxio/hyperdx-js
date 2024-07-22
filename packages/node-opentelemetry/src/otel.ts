import { ExceptionInstrumentation } from '@hyperdx/instrumentation-exception';
import { SentryNodeInstrumentation } from '@hyperdx/instrumentation-sentry-node';
import { Attributes, diag, DiagLogLevel } from '@opentelemetry/api';
import {
  getNodeAutoInstrumentations,
  InstrumentationConfigMap,
} from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import {
  InstrumentationBase,
  InstrumentationModuleDefinition,
} from '@opentelemetry/instrumentation';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';
import { Resource } from '@opentelemetry/resources';
import { MetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import cliSpinners from 'cli-spinners';
import fetch from 'node-fetch';
import ora from 'ora';
import path from 'path';
import * as semver from 'semver';
import { wrap } from 'shimmer';

import { version as PKG_VERSION } from '../package.json';
import {
  DEFAULT_HDX_API_KEY,
  DEFAULT_HDX_NODE_ADVANCED_NETWORK_CAPTURE,
  DEFAULT_HDX_NODE_BETA_MODE,
  DEFAULT_HDX_NODE_CONSOLE_CAPTURE,
  DEFAULT_HDX_NODE_EXPERIMENTAL_EXCEPTION_CAPTURE,
  DEFAULT_HDX_NODE_SENTRY_INTEGRATION_ENABLED,
  DEFAULT_HDX_NODE_STOP_ON_TERMINATION_SIGNALS,
  DEFAULT_HDX_STARTUP_LOGS,
  DEFAULT_OTEL_EXPORTER_OTLP_TRACES_TIMEOUT,
  DEFAULT_OTEL_LOG_LEVEL,
  DEFAULT_OTEL_LOGS_EXPORTER,
  DEFAULT_OTEL_METRICS_EXPORTER,
  DEFAULT_OTEL_METRICS_EXPORTER_URL,
  DEFAULT_OTEL_TRACES_EXPORTER,
  DEFAULT_OTEL_TRACES_EXPORTER_URL,
  DEFAULT_OTEL_TRACES_SAMPLER,
  DEFAULT_OTEL_TRACES_SAMPLER_ARG,
  DEFAULT_SERVICE_NAME,
} from './constants';
import HyperDXConsoleInstrumentation from './instrumentations/console';
import { getHyperDXHTTPInstrumentationConfig } from './instrumentations/http';
import { getHyperDXMetricReader } from './metrics';
import { MutableAsyncLocalStorageContextManager } from './MutableAsyncLocalStorageContextManager';
import { Logger as OtelLogger } from './otel-logger';
import HyperDXSpanProcessor from './spanProcessor';

const UI_LOG_PREFIX = '[⚡HyperDX]';

const env = process.env;

const IS_LOCAL = env.NODE_ENV === 'development' || !env.NODE_ENV;

export type SDKConfig = {
  additionalInstrumentations?: InstrumentationBase[];
  advancedNetworkCapture?: boolean;
  apiKey?: string;
  betaMode?: boolean;
  consoleCapture?: boolean;
  detectResources?: boolean;
  disableLogs?: boolean;
  disableMetrics?: boolean;
  disableStartupLogs?: boolean;
  disableTracing?: boolean;
  enableInternalProfiling?: boolean;
  experimentalExceptionCapture?: boolean;
  instrumentations?: InstrumentationConfigMap;
  metricReader?: MetricReader;
  programmaticImports?: boolean; // TEMP
  sentryIntegrationEnabled?: boolean;
  service?: string;
  stopOnTerminationSignals?: boolean;
};

const setOtelEnvs = ({
  apiKey,
  disableLogs,
  disableMetrics,
  disableTracing,
  service,
}: {
  apiKey?: string;
  disableLogs: boolean;
  disableMetrics: boolean;
  disableTracing: boolean;
  service: string;
}) => {
  // set default otel env vars
  env.OTEL_NODE_RESOURCE_DETECTORS = env.OTEL_NODE_RESOURCE_DETECTORS ?? 'all';
  env.OTEL_TRACES_SAMPLER = DEFAULT_OTEL_TRACES_SAMPLER;
  env.OTEL_TRACES_SAMPLER_ARG = DEFAULT_OTEL_TRACES_SAMPLER_ARG;
  env.OTEL_SERVICE_NAME = service;
  if (disableLogs) {
    env.OTEL_LOGS_EXPORTER = 'none';
  }
  if (disableTracing) {
    env.OTEL_TRACES_EXPORTER = 'none';
  }
  if (disableMetrics) {
    env.OTEL_METRICS_EXPORTER = 'none';
  }
  if (apiKey) {
    if (env.OTEL_EXPORTER_OTLP_HEADERS) {
      env.OTEL_EXPORTER_OTLP_HEADERS = `${env.OTEL_EXPORTER_OTLP_HEADERS},Authorization=${apiKey}`;
    } else {
      env.OTEL_EXPORTER_OTLP_HEADERS = `Authorization=${apiKey}`;
    }
  }
};

let sdk: NodeSDK;
let contextManager: MutableAsyncLocalStorageContextManager | undefined;

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
    return semver.satisfies(version, supportedVersion, { includePrerelease });
  });
};

const hrtimeToMs = (hrtime: [number, number]) => {
  return hrtime[0] * 1e3 + hrtime[1] / 1e6;
};

const healthCheckUrl = async (
  ui: ora.Ora,
  url: string,
  requestConfigs: {
    method: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => {
  ui.text = `Checking health of ${url}...`;
  try {
    const res = await fetch(url, requestConfigs);
    if (res.ok) {
      ui.succeed(`Health check passed for ${url}`);
    } else {
      ui.fail(`Health check failed for ${url}`);
    }
  } catch (e) {
    diag.error('Error checking health of url', e);
    ui.fail(`Health check failed for ${url}`);
  }
};

export const initSDK = (config: SDKConfig) => {
  const defaultDisableStartupLogs =
    config.disableStartupLogs ?? !DEFAULT_HDX_STARTUP_LOGS;

  const ui = ora({
    isSilent: defaultDisableStartupLogs,
    prefixText: UI_LOG_PREFIX,
    spinner: cliSpinners.dots,
    text: 'Initializing OpenTelemetry SDK...',
  }).start();

  const defaultApiKey = config.apiKey ?? DEFAULT_HDX_API_KEY();
  const defaultDetectResources = config.detectResources ?? true;
  const defaultDisableLogs =
    config.disableLogs ?? DEFAULT_OTEL_LOGS_EXPORTER === 'none';
  const defaultDisableMetrics =
    config.disableMetrics ?? DEFAULT_OTEL_METRICS_EXPORTER === 'none';
  const defaultDisableTracing =
    config.disableTracing ?? DEFAULT_OTEL_TRACES_EXPORTER === 'none';
  const defaultEnableInternalProfiling =
    config.enableInternalProfiling ?? false;
  const defaultServiceName = config.service ?? DEFAULT_SERVICE_NAME();

  ui.succeed(`Service name is configured to be "${defaultServiceName}"`);

  if (!env.OTEL_EXPORTER_OTLP_HEADERS && !defaultApiKey) {
    ui.fail(
      'apiKey or HYPERDX_API_KEY or OTEL_EXPORTER_OTLP_HEADERS is not set',
    );
    ui.stopAndPersist({
      text: 'OpenTelemetry SDK initialization skipped',
      symbol: '🚫',
    });
    return;
  }

  ui.text = 'Setting otel envs...';
  setOtelEnvs({
    apiKey: defaultApiKey,
    disableLogs: defaultDisableLogs,
    disableMetrics: defaultDisableMetrics,
    disableTracing: defaultDisableTracing,
    service: defaultServiceName,
  });
  ui.succeed('Set default otel envs');

  const stopOnTerminationSignals =
    config.stopOnTerminationSignals ??
    DEFAULT_HDX_NODE_STOP_ON_TERMINATION_SIGNALS; // Stop by default

  let defaultConsoleCapture =
    config.consoleCapture ?? DEFAULT_HDX_NODE_CONSOLE_CAPTURE;
  if (DEFAULT_OTEL_LOG_LEVEL === DiagLogLevel.DEBUG) {
    // FIXME: better to disable console instrumentation if otel log is enabled
    defaultConsoleCapture = false;
    ui.warn(
      `OTEL_LOG_LEVEL is set to 'debug', disabling console instrumentation`,
    );
  }

  //--------------------------------------------------
  // ------------------- LOGGER ----------------------
  //--------------------------------------------------
  ui.text = 'Initializing OpenTelemetry Logger...';
  const _logger = new OtelLogger({
    detectResources: defaultDetectResources,
    service: defaultServiceName,
  });
  ui.succeed('Initialized OpenTelemetry Logger');
  //--------------------------------------------------

  // Health check
  Promise.all([
    healthCheckUrl(ui, DEFAULT_OTEL_TRACES_EXPORTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }),
    healthCheckUrl(ui, _logger.getExporterUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }),
    healthCheckUrl(ui, DEFAULT_OTEL_METRICS_EXPORTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }),
  ]);

  const defaultBetaMode = config.betaMode ?? DEFAULT_HDX_NODE_BETA_MODE();
  const defaultAdvancedNetworkCapture =
    config.advancedNetworkCapture ?? DEFAULT_HDX_NODE_ADVANCED_NETWORK_CAPTURE;

  const defaultExceptionCapture =
    config.experimentalExceptionCapture ??
    DEFAULT_HDX_NODE_EXPERIMENTAL_EXCEPTION_CAPTURE;

  const defaultSentryIntegrationEnabled =
    config.sentryIntegrationEnabled ??
    DEFAULT_HDX_NODE_SENTRY_INTEGRATION_ENABLED;

  // Node 14.8.0+ has AsyncLocalStorage
  // ref: https://github.com/open-telemetry/opentelemetry-js/blob/fd911fb3a4b5b05250750e0c0773aa0fc1e37706/packages/opentelemetry-sdk-trace-node/src/NodeTracerProvider.ts#L61C30-L61C67
  contextManager = semver.gte(process.version, '14.8.0')
    ? new MutableAsyncLocalStorageContextManager()
    : undefined;

  ui.text = 'Initializing instrumentations packages...';
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
    new RuntimeNodeInstrumentation(),
    ...(defaultConsoleCapture
      ? [
          new HyperDXConsoleInstrumentation({
            betaMode: defaultBetaMode,
            loggerOptions: {
              baseUrl: _logger.getExporterUrl(),
              service: defaultServiceName,
            },
            contextManager,
          }),
        ]
      : []),
    ...(defaultSentryIntegrationEnabled
      ? [new SentryNodeInstrumentation()]
      : []),
    ...(defaultExceptionCapture
      ? [
          new ExceptionInstrumentation({
            _internalForceFlush: shutdown,
          }),
        ]
      : []),
    ...(config.additionalInstrumentations ?? []),
  ];

  sdk = new NodeSDK({
    resource: new Resource({
      // https://opentelemetry.io/docs/specs/semconv/resource/#telemetry-sdk-experimental
      'telemetry.distro.name': 'hyperdx',
      'telemetry.distro.version': PKG_VERSION,
    }),
    logRecordProcessor: defaultDisableLogs ? undefined : _logger.getProcessor(),
    metricReader:
      config.metricReader ??
      (defaultDisableMetrics ? undefined : getHyperDXMetricReader()),
    spanProcessors: [
      ...(defaultDisableTracing
        ? []
        : [
            new HyperDXSpanProcessor({
              exporter: new OTLPTraceExporter({
                timeoutMillis: DEFAULT_OTEL_EXPORTER_OTLP_TRACES_TIMEOUT,
                url: DEFAULT_OTEL_TRACES_EXPORTER_URL,
              }),
              enableHDXGlobalContext: defaultBetaMode,
              contextManager,
            }),
          ]),
    ],
    instrumentations: config.programmaticImports ? [] : allInstrumentations,
    contextManager: contextManager,
  });

  ui.succeed('Initialized instrumentations packages');

  if (defaultEnableInternalProfiling) {
    ui.text = 'Enabling internal profiling...';
    for (const instrumentation of allInstrumentations) {
      const _originalEnable = instrumentation.enable;
      instrumentation.enable = function (...args: any[]) {
        const start = process.hrtime();
        // @ts-ignore
        const result = _originalEnable.apply(this, args);
        const end = process.hrtime(start);
        ui.succeed(
          `Enabled instrumentation ${
            instrumentation.constructor.name
          } in ${hrtimeToMs(end)} ms`,
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
              ui.succeed(
                `Instrumented ${module.name}${
                  module.moduleVersion ? ` [v${module.moduleVersion}] ` : ' '
                }in ${hrtimeToMs(end)} ms`,
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
                ui.succeed(
                  `Instrumented ${module.name}${
                    module.moduleVersion ? ` [v${module.moduleVersion}] ` : ' '
                  }file ${file.name} in ${hrtimeToMs(end)} ms`,
                );
                return result;
              };
            });
          }
        }
      }
    }
  }

  ui.text = 'Starting OpenTelemetry Node SDK...';
  sdk.start();
  ui.succeed('Started OpenTelemetry Node SDK');

  if (config.programmaticImports) {
    ui.text = 'Repatching instrumentation packages...';
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
              diag.error('Error re-requiring moduleExports for nodejs module', {
                module: module.name,
                version: module.moduleVersion,
                error: e,
              });
            }
            try {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const _pkg = require(path.join(module.name, 'package.json'));
              module.moduleVersion = _pkg.version;
            } catch (e) {
              diag.error('Error re-requiring package.json for nodejs module', {
                module: module.name,
                version: module.moduleVersion,
                error: e,
              });
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
    ui.succeed('Repatched instrumentation packages');
  }

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

  // Print out the configuration
  if (defaultAdvancedNetworkCapture) {
    ui.succeed(`Enabled Advanced Network Capture`);
  }
  if (defaultBetaMode) {
    ui.succeed(`Enabled Beta Mode`);
  }
  if (defaultConsoleCapture) {
    ui.succeed(`Enabled Console Capture`);
  }
  if (defaultDetectResources) {
    ui.succeed(`Enabled Resource Detection`);
  }
  if (defaultExceptionCapture) {
    ui.succeed(`Enabled Exception Capture`);
  }
  if (DEFAULT_OTEL_LOG_LEVEL) {
    ui.succeed(`Enable SDK Logger with Level "${DEFAULT_OTEL_LOG_LEVEL}"`);
  }
  if (config.programmaticImports) {
    ui.succeed(`Enabled Programmatic Imports`);
  }
  if (env.OTEL_PROPAGATORS) {
    ui.succeed(`Using Propagators: "${env.OTEL_PROPAGATORS}"`);
  }
  if (env.OTEL_RESOURCE_ATTRIBUTES) {
    ui.succeed(`Resource Attributes: "${env.OTEL_RESOURCE_ATTRIBUTES}"`);
  }
  if (env.OTEL_NODE_RESOURCE_DETECTORS) {
    ui.succeed(`Resource Detectors: "${env.OTEL_NODE_RESOURCE_DETECTORS}"`);
  }
  if (DEFAULT_OTEL_TRACES_SAMPLER) {
    ui.succeed(`Traces Sampler: "${DEFAULT_OTEL_TRACES_SAMPLER}"`);
  }
  if (defaultSentryIntegrationEnabled) {
    ui.succeed(`Enabled Sentry Integration`);
  }

  if (stopOnTerminationSignals) {
    ui.succeed('Enabled stopOnTerminationSignals');
  } else {
    ui.warn(
      'Disabled stopOnTerminationSignals (user is responsible for graceful shutdown on termination signals)',
    );
  }

  if (defaultDisableLogs) {
    ui.warn('Logs are disabled');
  } else {
    ui.succeed(`Sending logs to "${_logger.getExporterUrl()}"`);
  }
  if (defaultDisableMetrics) {
    ui.warn('Metrics are disabled');
  } else {
    ui.succeed(`Sending metrics to "${DEFAULT_OTEL_METRICS_EXPORTER_URL}"`);
  }
  if (defaultDisableTracing) {
    ui.warn('Tracing is disabled');
  } else {
    ui.succeed(`Sending traces to "${DEFAULT_OTEL_TRACES_EXPORTER_URL}"`);
  }

  ui.stopAndPersist({
    text: `OpenTelemetry SDK initialized successfully`,
    symbol: '🦄',
  });

  if (!defaultDisableStartupLogs) {
    setTimeout(() => {
      const _targetUrl = `https://www.hyperdx.io/services?service=${encodeURIComponent(
        defaultServiceName,
      )}`;
      ui.info(`

View your app dashboard here:
${_targetUrl}
To disable these startup logs, set HDX_STARTUP_LOGS=false

`);
      // Todo: not sure if this is a good idea...
      // if (IS_LOCAL) {
      //   const _ui = ora({
      //     color: 'green',
      //     isSilent: !DEFAULT_HDX_STARTUP_LOGS,
      //     prefixText: UI_LOG_PREFIX,
      //     spinner: cliSpinners.arc,
      //     text: `Opening the dashboard...`,
      //   }).start();

      //   open(_targetUrl)
      //     .then(() => {
      //       _ui.succeed(`Opened dashboard in browser`);
      //     })
      //     .catch((e) => {
      //       _ui.fail(`Error opening browser: ${e}`);
      //     });
      // }
    }, 1000);
  }
};

export const init = (config?: Omit<SDKConfig, 'programmaticImports'>) =>
  initSDK({
    consoleCapture: true,
    experimentalExceptionCapture: true,
    programmaticImports: true,
    sentryIntegrationEnabled: true,
    ...config,
  });

const _shutdown = () => {
  const ui = ora({
    spinner: cliSpinners.dots,
    text: 'Shutting down OpenTelemetry SDK...',
  }).start();
  return (
    sdk?.shutdown()?.then(
      () => {
        ui.succeed('OpenTelemetry SDK shut down successfully');
      },
      (err) => {
        ui.fail(`Error shutting down OpenTeLoader SDK: ${err}`);
      },
    ) ?? Promise.resolve() // in case SDK isn't init'd yet
  );
};

export const shutdown = () => {
  diag.debug('shutdown() called');
  return _shutdown();
};

export const setTraceAttributes = (attributes: Attributes) => {
  if (
    contextManager &&
    typeof contextManager.getMutableContext === 'function'
  ) {
    const mutableContext = contextManager.getMutableContext();
    if (mutableContext != null) {
      if (mutableContext.traceAttributes == null) {
        mutableContext.traceAttributes = new Map();
      }
      for (const [k, v] of Object.entries(attributes)) {
        mutableContext.traceAttributes.set(k, v);
      }
    }
  }
};
