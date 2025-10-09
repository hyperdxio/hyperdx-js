/*
Copyright 2020 Splunk Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { recordException as _recordException } from '@hyperdx/instrumentation-exception/build/src/browser';
import {
  ERROR_INSTRUMENTATION_NAME,
  HyperDXErrorInstrumentation,
} from '@hyperdx/instrumentation-exception/build/src/browser/instrumentations/HyperDXErrorInstrumentation';
import {
  InstrumentationConfig,
  registerInstrumentations,
} from '@opentelemetry/instrumentation';
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  // BatchSpanProcessor,
  ReadableSpan,
  SpanExporter,
  SpanProcessor,
  BufferConfig,
  AlwaysOffSampler,
  AlwaysOnSampler,
  ParentBasedSampler,
} from '@opentelemetry/sdk-trace-base';
import { WebTracerConfig } from '@opentelemetry/sdk-trace-web';
import {
  Attributes,
  DiagConsoleLogger,
  DiagLogLevel,
  Span,
  diag,
} from '@opentelemetry/api';
import { SplunkDocumentLoadInstrumentation } from './SplunkDocumentLoadInstrumentation';
import {
  SplunkUserInteractionInstrumentation,
  SplunkUserInteractionInstrumentationConfig,
  DEFAULT_AUTO_INSTRUMENTED_EVENTS,
  DEFAULT_AUTO_INSTRUMENTED_EVENT_NAMES,
  UserInteractionEventsConfig,
} from './SplunkUserInteractionInstrumentation';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { generateId, getPluginConfig } from './utils';
import { getRumSessionId, initSessionTracking, SessionIdType } from './session';
import { SplunkWebSocketInstrumentation } from './SplunkWebSocketInstrumentation';
import { initWebVitals } from './webvitals';
import { SplunkLongTaskInstrumentation } from './SplunkLongTaskInstrumentation';
import { SplunkPageVisibilityInstrumentation } from './SplunkPageVisibilityInstrumentation';
import { SplunkConnectivityInstrumentation } from './SplunkConnectivityInstrumentation';
import {
  SplunkPostDocLoadResourceInstrumentation,
  SplunkPostDocLoadResourceInstrumentationConfig,
} from './SplunkPostDocLoadResourceInstrumentation';
import { SplunkWebTracerProvider } from './SplunkWebTracerProvider';
import { InternalEventTarget, RumOtelWebEventTarget } from './EventTarget';
import {
  ContextManagerConfig,
  SplunkContextManager,
} from './SplunkContextManager';
import { Resource, ResourceAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SDK_INFO, _globalThis } from '@opentelemetry/core';
import { VERSION } from './version';
import { getSyntheticsRunId, SYNTHETICS_RUN_ID_ATTRIBUTE } from './synthetics';
import { SplunkSpanAttributesProcessor } from './SplunkSpanAttributesProcessor';
import { SessionBasedSampler } from './SessionBasedSampler';
import {
  SocketIoClientInstrumentationConfig,
  SplunkSocketIoClientInstrumentation,
} from './SplunkSocketIoClientInstrumentation';
import { HyperDXBatchSpanProcessor } from './HyperDXBatchSpanProcessor';
import { HyperDXConsoleInstrumentation } from './HyperDXConsoleInstrumentation';
import { HyperDXFetchInstrumentation } from './HyperDXFetchInstrumentation';
import { HyperDXXMLHttpRequestInstrumentation } from './HyperDXXMLHttpRequestInstrumentation';

import type { HyperDXFetchInstrumentationConfig } from './HyperDXFetchInstrumentation';
import type { HyperDXXMLHttpRequestInstrumentationConfig } from './HyperDXXMLHttpRequestInstrumentation';

export * from './SessionBasedSampler';
export * from './SplunkWebTracerProvider';

interface SplunkOtelWebOptionsInstrumentations {
  console?: boolean | HyperDXConsoleInstrumentation;
  document?: boolean | InstrumentationConfig;
  errors?: boolean;
  fetch?: boolean | HyperDXFetchInstrumentationConfig;
  interactions?: boolean | SplunkUserInteractionInstrumentationConfig;
  longtask?: boolean | InstrumentationConfig;
  visibility?: boolean | InstrumentationConfig;
  connectivity?: boolean | InstrumentationConfig;
  postload?: boolean | SplunkPostDocLoadResourceInstrumentationConfig;
  socketio?: boolean | SocketIoClientInstrumentationConfig;
  websocket?: boolean | InstrumentationConfig;
  webvitals?: boolean;
  xhr?: boolean | HyperDXXMLHttpRequestInstrumentationConfig;
}

export interface RumOtelWebExporterOptions {
  /**
   * Allows remapping Span's attributes right before they're serialized.
   * One potential use case of this method is to remove PII from the attributes.
   */
  onAttributesSerializing?: (
    attributes: Attributes,
    span: ReadableSpan,
  ) => Attributes;
}

export interface RumOtelWebConfig {
  /** Allows http beacon urls */
  allowInsecureUrl?: boolean;

  /** Application name
   * @deprecated Renamed to `applicationName`
   */
  app?: string;

  /** Application name */
  applicationName?: string;

  /**
   * Destination for the captured data
   * @deprecated Renamed to `beaconEndpoint`, or use realm
   */
  beaconUrl?: string;

  /** Destination for the captured data */
  url: string | undefined;

  /** Options for context manager */
  context?: ContextManagerConfig;

  /** Sets session cookie to this domain */
  cookieDomain?: string;

  /** Turns on/off internal debug logging */
  debug?: boolean;

  /**
   * Sets a value for the `environment` attribute (persists through calls to `setGlobalAttributes()`)
   * */
  deploymentEnvironment?: string;

  /**
   * Sets a value for the `environment` attribute (persists through calls to `setGlobalAttributes()`)
   * @deprecated Renamed to `deploymentEnvironment`
   */
  environment?: string;

  /**
   * Sets a value for the 'app.version' attribute
   */
  version?: string;

  /** Allows configuring how telemetry data is sent to the backend */
  exporter?: RumOtelWebExporterOptions;

  /** Sets attributes added to every Span. */
  globalAttributes?: Attributes;

  /**
   * Applies for XHR, Fetch and Websocket URLs. URLs that partially match any regex in ignoreUrls will not be traced.
   * In addition, URLs that are _exact matches_ of strings in ignoreUrls will also not be traced.
   * */
  ignoreUrls?: Array<string | RegExp>;

  /** Configuration for instrumentation modules. */
  instrumentations?: SplunkOtelWebOptionsInstrumentations;

  /**
   * Publicly-visible `apiKey` value.  Please do not paste any other access token or auth value into here, as this
   * will be visible to every user of your app
   * */
  apiKey: string | undefined;

  /**
   * Config options passed to web tracer
   */
  tracer?: WebTracerConfig;

  /**
   * Additional resource attributes to be added to all spans.
   * These will be merged with default SDK resource attributes.
   */
  resourceAttributes?: ResourceAttributes;
}

interface RumOtelWebConfigInternal extends RumOtelWebConfig {
  bufferSize?: number;
  bufferTimeout?: number;

  exporter: RumOtelWebExporterOptions & {
    factory: (config: { url: string; authHeader?: string }) => SpanExporter;
  };

  instrumentations: SplunkOtelWebOptionsInstrumentations;

  spanProcessor: {
    factory: <T extends BufferConfig>(
      exporter: SpanExporter,
      config: T,
    ) => SpanProcessor;
  };
}

const OPTIONS_DEFAULTS: RumOtelWebConfigInternal = {
  app: 'unknown-browser-app',
  url: undefined,
  bufferTimeout: 4000, //millis, tradeoff between batching and loss of spans by not sending before page close
  bufferSize: 50, // spans, tradeoff between batching and hitting sendBeacon invididual limits
  instrumentations: {},
  exporter: {
    factory: (options) =>
      new OTLPTraceExporter({
        url: options.url,
        headers: {
          authorization: options.authHeader,
        },
      }),
  },
  spanProcessor: {
    factory: (exporter, config) =>
      new HyperDXBatchSpanProcessor(exporter, config),
  },
  apiKey: undefined,
};

function migrateConfigOption(
  config: RumOtelWebConfig,
  from: keyof RumOtelWebConfig,
  to: keyof RumOtelWebConfig,
) {
  if (
    from in config &&
    !(to in config && config[to] !== OPTIONS_DEFAULTS[to])
  ) {
    // @ts-expect-error There's no way to type this right
    config[to] = config[from];
  }
}

/**
 * Update configuration based on configuration option renames
 */
function migrateConfig(config: RumOtelWebConfig) {
  migrateConfigOption(config, 'app', 'applicationName');
  // migrateConfigOption(config, 'beaconUrl', 'beaconEndpoint');
  migrateConfigOption(config, 'environment', 'deploymentEnvironment');
  // migrateConfigOption(config, 'rumAuth', 'rumAccessToken');
  return config;
}

const INSTRUMENTATIONS = [
  {
    Instrument: SplunkDocumentLoadInstrumentation,
    confKey: 'document',
    disable: false,
  },
  {
    Instrument: HyperDXXMLHttpRequestInstrumentation,
    confKey: 'xhr',
    disable: false,
  },
  {
    Instrument: SplunkUserInteractionInstrumentation,
    confKey: 'interactions',
    disable: false,
  },
  {
    Instrument: SplunkPostDocLoadResourceInstrumentation,
    confKey: 'postload',
    disable: false,
  },
  { Instrument: HyperDXFetchInstrumentation, confKey: 'fetch', disable: false },
  {
    Instrument: SplunkWebSocketInstrumentation,
    confKey: 'websocket',
    disable: true,
  },
  {
    Instrument: SplunkLongTaskInstrumentation,
    confKey: 'longtask',
    disable: false,
  },
  {
    Instrument: HyperDXErrorInstrumentation,
    confKey: ERROR_INSTRUMENTATION_NAME,
    disable: false,
  },
  {
    Instrument: SplunkPageVisibilityInstrumentation,
    confKey: 'visibility',
    disable: true,
  },
  {
    Instrument: SplunkConnectivityInstrumentation,
    confKey: 'connectivity',
    disable: true,
  },
  {
    Instrument: SplunkSocketIoClientInstrumentation,
    confKey: 'socketio',
    disable: true,
  },
  {
    Instrument: HyperDXConsoleInstrumentation,
    confKey: 'console',
    disable: true,
  },
] as const;

export const INSTRUMENTATIONS_ALL_DISABLED: SplunkOtelWebOptionsInstrumentations =
  INSTRUMENTATIONS.map((instrumentation) => instrumentation.confKey).reduce(
    (acc, key) => {
      acc[key] = false;
      return acc;
    },
    { webvitals: false },
  );

function buildExporter(options) {
  return options.exporter.factory({
    url: options.url,
    onAttributesSerializing: options.exporter.onAttributesSerializing,
    authHeader: options.apiKey,
  });
}

export interface RumOtelWebType extends RumOtelWebEventTarget {
  deinit: () => void;

  error: (...args: Array<any>) => void;

  init: (options: RumOtelWebConfig) => void;

  /**
   * Allows experimental options to be passed. No versioning guarantees are given for this method.
   */
  _internalInit: (options: Partial<RumOtelWebConfigInternal>) => void;

  provider?: SplunkWebTracerProvider;

  attributesProcessor?: SplunkSpanAttributesProcessor;

  setGlobalAttributes: (attributes: Attributes) => void;

  /**
   * This method provides access to computed, final value of global attributes, which are applied to all created spans.
   */
  getGlobalAttributes: () => Attributes;

  /**
   * This method allows user to add custom action event
   */
  addAction: (name: string, attributes?: Attributes) => void;

  /**
   * @deprecated Use {@link getGlobalAttributes()}
   */
  _experimental_getGlobalAttributes: () => Attributes;

  /**
   * This method returns current session ID
   */
  getSessionId: () => SessionIdType | undefined;
  /**
   * @deprecated Use {@link getSessionId()}
   */
  _experimental_getSessionId: () => SessionIdType | undefined;

  DEFAULT_AUTO_INSTRUMENTED_EVENTS: UserInteractionEventsConfig;
  DEFAULT_AUTO_INSTRUMENTED_EVENT_NAMES: (keyof HTMLElementEventMap)[];

  AlwaysOnSampler: typeof AlwaysOnSampler;
  AlwaysOffSampler: typeof AlwaysOffSampler;
  ParentBasedSampler: typeof ParentBasedSampler;
  SessionBasedSampler: typeof SessionBasedSampler;

  readonly inited: boolean;

  recordException: (error: any, attributes?: Attributes) => void;
}

let inited = false;
let _deregisterInstrumentations: () => void | undefined;
let _deinitSessionTracking: () => void | undefined;
let _errorInstrumentation: HyperDXErrorInstrumentation | undefined;
let _postDocLoadInstrumentation:
  | SplunkPostDocLoadResourceInstrumentation
  | undefined;
let eventTarget: InternalEventTarget | undefined;
export const Rum: RumOtelWebType = {
  DEFAULT_AUTO_INSTRUMENTED_EVENTS,
  DEFAULT_AUTO_INSTRUMENTED_EVENT_NAMES,

  // Re-export samplers as properties for easier use in CDN build
  AlwaysOnSampler,
  AlwaysOffSampler,
  ParentBasedSampler,
  SessionBasedSampler,

  get inited(): boolean {
    return inited;
  },

  _internalInit: function (options: Partial<RumOtelWebConfigInternal>) {
    Rum.init({
      ...OPTIONS_DEFAULTS,
      ...options,
    });
  },

  init: function (options) {
    // "env" based config still a bad idea for web
    if (!('OTEL_TRACES_EXPORTER' in _globalThis)) {
      _globalThis.OTEL_TRACES_EXPORTER = 'none';
    }

    const isOriginalConsole = (fn: Function, name: string) => {
      // Sometimes __wrapped isn't defined on overwritten method, so we check if the fn name matches as a backup
      // I've only seen this occur in HMR environments
      return (
        typeof fn === 'function' && fn.__wrapped !== true && fn.name === name
      );
    };

    const consoleLog = isOriginalConsole(console?.log, 'log')
      ? console.log
      : () => {};
    const consoleWarn = isOriginalConsole(console?.warn, 'warn')
      ? console.warn
      : consoleLog;
    const consoleError = isOriginalConsole(console?.error, 'error')
      ? console.error
      : consoleLog;
    const consoleDebug = isOriginalConsole(console?.debug, 'debug')
      ? console.debug
      : consoleLog;
    const consoleTrace = isOriginalConsole(console?.trace, 'trace')
      ? console.trace
      : consoleLog;

    diag.setLogger(
      {
        error: (...args) => {
          if (isOriginalConsole(consoleError, 'error')) {
            consoleError(...args);
          }
        },
        warn: (...args) => {
          if (isOriginalConsole(consoleWarn, 'warn')) {
            consoleWarn(...args);
          }
        },
        info: (...args) => {
          if (isOriginalConsole(consoleLog, 'log')) {
            consoleLog(...args);
          }
        },
        debug: (...args) => {
          if (isOriginalConsole(consoleDebug, 'debug')) {
            consoleDebug(...args);
          }
        },
        verbose: (...args) => {
          if (isOriginalConsole(consoleTrace, 'trace')) {
            consoleTrace(...args);
          }
        },
      },
      {
        suppressOverrideMessage: true,
        logLevel: options?.debug ? DiagLogLevel.DEBUG : DiagLogLevel.NONE,
      },
    );

    if (typeof window !== 'object') {
      diag.error('Rum: Non-browser environment detected, aborting');
      return;
    }
    if (typeof Symbol !== 'function') {
      diag.error('Rum: browser not supported, disabling instrumentation.');
      return;
    }

    eventTarget = new InternalEventTarget();

    const processedOptions: RumOtelWebConfigInternal = Object.assign(
      {},
      OPTIONS_DEFAULTS,
      migrateConfig(options),
      {
        exporter: Object.assign(
          {},
          OPTIONS_DEFAULTS.exporter,
          options.exporter,
        ),
      },
    );

    if (inited) {
      diag.warn('Rum already init()ed.');
      return;
    }

    if (!processedOptions.debug) {
      if (!processedOptions.url) {
        // eslint-disable-next-line quotes
        throw new Error("Rum.init( {url: 'https://something'} ) is required.");
      } else if (
        !processedOptions.url.startsWith('https') &&
        !processedOptions.allowInsecureUrl
      ) {
        throw new Error(
          'Not using https is unsafe, if you want to force it use allowInsecureUrl option.',
        );
      }
    }

    const instanceId = generateId(64);
    _deinitSessionTracking = initSessionTracking(
      instanceId,
      eventTarget,
      processedOptions.cookieDomain,
    ).deinit;

    const { ignoreUrls, applicationName, deploymentEnvironment, version, resourceAttributes } =
      processedOptions;
    // enabled: false prevents registerInstrumentations from enabling instrumentations in constructor
    // they will be enabled in registerInstrumentations
    const pluginDefaults = { ignoreUrls, enabled: false };

    const resourceAttrs: ResourceAttributes = {
      ...SDK_INFO,
      [SemanticResourceAttributes.TELEMETRY_SDK_NAME]: '@hyperdx/otel-web',
      [SemanticResourceAttributes.TELEMETRY_SDK_VERSION]: VERSION,
      [SemanticResourceAttributes.SERVICE_NAME]: applicationName,
      // Splunk specific attributes
      'rum.version': VERSION,
      'rum.scriptInstance': instanceId,
      // User-provided resource attributes
      ...(resourceAttributes || {}),
    };

    const syntheticsRunId = getSyntheticsRunId();
    if (syntheticsRunId) {
      resourceAttrs[SYNTHETICS_RUN_ID_ATTRIBUTE] = syntheticsRunId;
    }

    const provider = new SplunkWebTracerProvider({
      ...processedOptions.tracer,
      resource: new Resource(resourceAttrs),
    });

    Object.defineProperty(provider.resource.attributes, 'rum.sessionId', {
      get() {
        return getRumSessionId();
      },
      configurable: true,
      enumerable: true,
    });

    const instrumentations = INSTRUMENTATIONS.map(
      ({ Instrument, confKey, disable }) => {
        const pluginConf = getPluginConfig(
          processedOptions.instrumentations[confKey],
          pluginDefaults,
          disable,
        );
        if (pluginConf) {
          // @ts-expect-error Can't mark in any way that processedOptions.instrumentations[confKey] is of specifc config type
          const instrumentation = new Instrument(pluginConf);
          if (
            confKey === ERROR_INSTRUMENTATION_NAME &&
            instrumentation instanceof HyperDXErrorInstrumentation
          ) {
            _errorInstrumentation = instrumentation;
          }
          if (
            confKey === 'postload' &&
            instrumentation instanceof SplunkPostDocLoadResourceInstrumentation
          ) {
            _postDocLoadInstrumentation = instrumentation;
          }
          return instrumentation;
        }

        return null;
      },
    ).filter((a): a is Exclude<typeof a, null> => Boolean(a));

    this.attributesProcessor = new SplunkSpanAttributesProcessor({
      ...(deploymentEnvironment
        ? {
            environment: deploymentEnvironment,
            'deployment.environment': deploymentEnvironment,
          }
        : {}),
      ...(version ? { 'app.version': version } : {}),
      ...(processedOptions.globalAttributes || {}),
    });
    provider.addSpanProcessor(this.attributesProcessor);

    if (processedOptions.url) {
      const exporter = buildExporter(processedOptions);
      const spanProcessor = processedOptions.spanProcessor.factory(exporter, {
        scheduledDelayMillis: processedOptions.bufferTimeout,
        maxExportBatchSize: processedOptions.bufferSize,
      });
      provider.addSpanProcessor(spanProcessor);
      this._processor = spanProcessor;
    }
    if (processedOptions.debug) {
      provider.addSpanProcessor(
        new SimpleSpanProcessor(new ConsoleSpanExporter()),
      );
    }

    window.addEventListener('visibilitychange', () => {
      // this condition applies when the page is hidden or when it's closed
      // see for more details: https://developers.google.com/web/updates/2018/07/page-lifecycle-api#developer-recommendations-for-each-state
      if (document.visibilityState === 'hidden') {
        this._processor.forceFlush();
      }
    });

    provider.register({
      contextManager: new SplunkContextManager({
        ...processedOptions.context,
        onBeforeContextStart: () =>
          _postDocLoadInstrumentation?.onBeforeContextChange(),
        onBeforeContextEnd: () =>
          _postDocLoadInstrumentation?.onBeforeContextChange(),
      }),
    });

    // After context manager registration so instrumentation event listeners are affected accordingly
    _deregisterInstrumentations = registerInstrumentations({
      tracerProvider: provider,
      instrumentations,
    });

    this.provider = provider;

    const vitalsConf = getPluginConfig(
      processedOptions.instrumentations.webvitals,
    );
    if (vitalsConf !== false) {
      initWebVitals(provider);
    }

    inited = true;
    diag.info('Rum.init() complete');
  },

  deinit() {
    if (!inited) {
      return;
    }

    _deregisterInstrumentations?.();
    _deregisterInstrumentations = undefined;

    _deinitSessionTracking?.();
    _deinitSessionTracking = undefined;

    this.provider.shutdown();
    delete this.provider;
    eventTarget = undefined;
    diag.disable();

    inited = false;
  },

  setGlobalAttributes(this: RumOtelWebType, attributes?: Attributes) {
    this.attributesProcessor?.setGlobalAttributes(attributes);
    eventTarget?.emit('global-attributes-changed', {
      attributes: this.attributesProcessor?.getGlobalAttributes() || {},
    });
  },

  getGlobalAttributes(this: RumOtelWebType) {
    return this.attributesProcessor?.getGlobalAttributes() || {};
  },

  // add custom action
  addAction(name: string, attributes?: Attributes) {
    if (!inited) {
      diag.debug('Rum not inited');
      return;
    }
    const now = Date.now();
    const tracer = this.provider.getTracer('custom-action');
    const span = tracer.startSpan(name, { startTime: now });
    span.setAttributes(attributes);
    span.end(now);
  },

  _experimental_getGlobalAttributes() {
    return this.getGlobalAttributes();
  },

  recordException(error, attributes) {
    if (!inited) {
      diag.debug('Rum not inited');
      return;
    }
    const tracer = this.provider.getTracer('record-exception');
    return _recordException(error, {
      tracer,
      attributes,
    });
  },

  error(...args) {
    if (!inited) {
      diag.debug('Rum not inited');
      return;
    }
    if (!_errorInstrumentation) {
      diag.error('Error was reported, but error instrumentation is disabled.');
      return;
    }

    _errorInstrumentation.hdxReport('Rum.error', args);
  },

  addEventListener(name, callback): void {
    eventTarget?.addEventListener(name, callback);
  },

  removeEventListener(name, callback): void {
    eventTarget?.removeEventListener(name, callback);
  },

  _experimental_addEventListener(name, callback): void {
    return this.addEventListener(name, callback);
  },

  _experimental_removeEventListener(name, callback): void {
    return this.removeEventListener(name, callback);
  },

  getSessionId() {
    return getRumSessionId();
  },
  _experimental_getSessionId() {
    return this.getSessionId();
  },
};

export default Rum;
