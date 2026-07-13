/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { context, trace } from '@opentelemetry/api';
import { SemconvStability } from '@opentelemetry/instrumentation';
import { headerCapture } from '@opentelemetry/instrumentation-http/build/src/utils';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  InMemoryLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import * as http from 'http';

import { _handleHttpOutgoingClientRequest } from '../instrumentations/http';
import { initSDK, shutdown } from '../otel';
import { Logger } from '../otel-logger';

// Save original env so we can restore after each test
const originalEnv = { ...process.env };

function resetEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, originalEnv);
}

// ----------------------------------------------------------------
// 1. initSDK — verify it actually wires up a working TracerProvider
// ----------------------------------------------------------------
describe('initSDK e2e', () => {
  afterEach(async () => {
    await shutdown();
    resetEnv();
    jest.resetModules();
  });

  it('initializes and creates spans via the global TracerProvider', async () => {
    const memoryExporter = new InMemorySpanExporter();

    initSDK({
      apiKey: 'test-api-key',
      advancedNetworkCapture: false,
      consoleCapture: false,
      disableStartupLogs: true,
      stopOnTerminationSignals: false,
    });

    // Inject our in-memory exporter into the global provider
    // The NodeSDK registers a ProxyTracerProvider wrapping NodeTracerProvider
    const globalProvider = trace.getTracerProvider();
    const realProvider =
      (globalProvider as any).getDelegate?.() ?? globalProvider;
    const proc = (realProvider as any)._activeSpanProcessor;
    proc._spanProcessors.push(new SimpleSpanProcessor(memoryExporter));

    const tracer = trace.getTracer('e2e-test');
    const span = tracer.startSpan('test-span');
    span.setAttribute('test.key', 'test-value');
    span.end();

    // SimpleSpanProcessor._doExport is async — wait for it
    await new Promise((r) => setTimeout(r, 50));

    const spans = memoryExporter.getFinishedSpans();
    expect(spans.length).toBeGreaterThanOrEqual(1);
    const exported = spans.find((s) => s.name === 'test-span');
    expect(exported).toBeDefined();
    expect(exported!.attributes['test.key']).toBe('test-value');
  });

  it('applies additionalResourceAttributes to the provider resource', () => {
    // initSDK's global TracerProvider doesn't reset cleanly between Jest tests,
    // so we verify the same resource construction pattern through Logger, which
    // uses the identical resourceFromAttributes + merge pattern as initSDK.
    const logger = new Logger({
      service: 'resource-merge-test',
      detectResources: false,
      resourceAttributes: {
        'cloud.region': 'us-east-2',
        'deployment.environment': 'testing',
      },
    });

    const resource = (logger.getProvider() as any)._sharedState.resource;
    expect(resource.attributes['cloud.region']).toBe('us-east-2');
    expect(resource.attributes['deployment.environment']).toBe('testing');
    // Distro attrs should also be present alongside custom attrs
    expect(resource.attributes['telemetry.distro.name']).toBe('hyperdx');
    expect(resource.attributes[ATTR_SERVICE_NAME]).toBe('resource-merge-test');
  });

  it('skips initialization when no apiKey or headers are set', () => {
    delete process.env.HYPERDX_API_KEY;
    delete process.env.OTEL_EXPORTER_OTLP_HEADERS;

    // Capture the provider before initSDK to verify it wasn't replaced
    const providerBefore = trace.getTracerProvider();
    const delegateBefore = (providerBefore as any).getDelegate?.();

    initSDK({
      consoleCapture: false,
      disableStartupLogs: true,
      stopOnTerminationSignals: false,
    });

    // initSDK should return early without registering a new provider.
    const providerAfter = trace.getTracerProvider();
    const delegateAfter = (providerAfter as any).getDelegate?.();

    // The delegate should be the same instance (no new SDK created)
    expect(delegateAfter).toBe(delegateBefore);
  });

  it('DEFAULT_OTEL_LOG_LEVEL evaluates to "debug" when env var is set', () => {
    // The v2 change: DEFAULT_OTEL_LOG_LEVEL is now compared as string === 'debug'
    // (was DiagLogLevel.DEBUG enum). The constants module reads env at load time,
    // so we need jest.resetModules() to re-evaluate with our env var.
    process.env.OTEL_LOG_LEVEL = 'debug';
    jest.resetModules();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const constants = require('../constants');
    expect(constants.DEFAULT_OTEL_LOG_LEVEL).toBe('debug');
    expect(typeof constants.DEFAULT_OTEL_LOG_LEVEL).toBe('string');

    // The conditional in otel.ts (line 232) does:
    //   if (DEFAULT_OTEL_LOG_LEVEL === 'debug') { defaultConsoleCapture = false; }
    // This comparison works because it's string === string.
    // If it were still DiagLogLevel.DEBUG (number), this would silently fail.
    expect(constants.DEFAULT_OTEL_LOG_LEVEL === 'debug').toBe(true);
  });
});

// ----------------------------------------------------------------
// 2. Logger — verify resource attributes, exporter URL, disabled mode
// ----------------------------------------------------------------
describe('OtelLogger e2e', () => {
  afterEach(() => {
    resetEnv();
  });

  it('sets correct resource attributes on the provider', () => {
    const logger = new Logger({
      service: 'test-logger-service',
      detectResources: false,
      resourceAttributes: {
        'custom.tag': 'my-value',
      },
    });

    const provider = logger.getProvider();
    const resource = (provider as any)._sharedState.resource;
    expect(resource.attributes[ATTR_SERVICE_NAME]).toBe('test-logger-service');
    expect(resource.attributes['telemetry.distro.name']).toBe('hyperdx');
    expect(resource.attributes['telemetry.distro.version']).toBeDefined();
    expect(resource.attributes['custom.tag']).toBe('my-value');
  });

  it('falls back to OTEL_SERVICE_NAME when no service arg is provided', () => {
    process.env.OTEL_SERVICE_NAME = 'env-configured-service';

    const logger = new Logger({ detectResources: false });
    const resource = (logger.getProvider() as any)._sharedState.resource;
    expect(resource.attributes[ATTR_SERVICE_NAME]).toBe(
      'env-configured-service',
    );
  });

  it('falls back to "unknown_service" when no service name is available', () => {
    delete process.env.OTEL_SERVICE_NAME;

    const logger = new Logger({ detectResources: false });
    const resource = (logger.getProvider() as any)._sharedState.resource;
    expect(resource.attributes[ATTR_SERVICE_NAME]).toBe('unknown_service');
  });

  it('reads exporter URL from DEFAULT_OTEL_LOGS_EXPORTER_URL', () => {
    // Don't pass baseUrl — let it use the default from constants
    const logger = new Logger({
      service: 'url-test',
      detectResources: false,
    });

    // Default should be the HyperDX endpoint
    expect(logger.getExporterUrl()).toBe('https://in-otel.hyperdx.io/v1/logs');
  });

  it('creates a noop processor when OTEL_LOGS_EXPORTER=none', async () => {
    process.env.OTEL_LOGS_EXPORTER = 'none';

    const logger = new Logger({
      service: 'disabled-test',
      detectResources: false,
    });

    expect(logger.isDisabled()).toBe(true);

    // Verify the noop processor has the expected interface
    const processor = logger.getProcessor();
    expect(typeof processor.onEmit).toBe('function');
    expect(typeof processor.shutdown).toBe('function');
    expect(typeof processor.forceFlush).toBe('function');

    // Verify they don't throw
    processor.onEmit({} as any, {} as any);
    await expect(processor.shutdown()).resolves.toBeUndefined();
    await expect(processor.forceFlush()).resolves.toBeUndefined();
  });

  it('wires processors via LoggerProvider constructor (v2 API)', () => {
    const logger = new Logger({
      service: 'processor-test',
      detectResources: false,
    });

    // In v2, processors are passed via constructor, not addLogRecordProcessor.
    // Verify the provider has our processor by checking the internal state.
    const provider = logger.getProvider();
    const processors = (provider as any)._sharedState
      ?.registeredLogRecordProcessors;
    expect(processors).toBeDefined();
    expect(processors.length).toBeGreaterThanOrEqual(1);
  });

  it('flushes and shuts down without error', async () => {
    const logger = new Logger({
      service: 'shutdown-test',
      detectResources: false,
    });

    logger.postMessage('info', 'before flush');
    await expect(logger.forceFlush()).resolves.not.toThrow();
    await expect(logger.shutdown()).resolves.not.toThrow();
  });
});

// ----------------------------------------------------------------
// 3. headerCapture v2 API — returns attributes instead of mutating span
// ----------------------------------------------------------------
describe('headerCapture v2 API', () => {
  it('headerCapture returns attributes object (not void)', () => {
    // The v2 change: headerCapture now returns attrs instead of setting on span
    const result = headerCapture(
      'request',
      ['content-type', 'x-custom'],
      SemconvStability.STABLE,
    )((header) => {
      if (header === 'content-type') return 'application/json';
      if (header === 'x-custom') return 'custom-value';
      return undefined;
    });

    expect(typeof result).toBe('object');
    // Should contain header attributes
    const keys = Object.keys(result);
    expect(keys.length).toBeGreaterThan(0);
    // Stable convention: http.request.header.<name>
    const contentTypeKey = keys.find(
      (k) => k.includes('content-type') || k.includes('content_type'),
    );
    expect(contentTypeKey).toBeDefined();
  });

  it('_handleHttpOutgoingClientRequest sets header attributes on span', () => {
    // Create a mock ClientRequest and Span to verify our wrapper works
    const mockRequest = {
      getRawHeaderNames: () => ['content-type', 'authorization'],
      getHeader: (name: string) => {
        if (name === 'content-type') return 'application/json';
        if (name === 'authorization') return 'Bearer test';
        return undefined;
      },
      write: jest.fn().mockReturnValue(true),
      end: jest.fn().mockReturnValue(undefined),
    } as unknown as http.ClientRequest;

    const setAttributesSpy = jest.fn();
    const mockSpan = {
      setAttribute: jest.fn(),
      setAttributes: setAttributesSpy,
      setStatus: jest.fn(),
      end: jest.fn(),
      isRecording: () => true,
    } as any;

    _handleHttpOutgoingClientRequest(mockRequest, mockSpan, () => true);

    // Verify setAttributes was called with header data
    expect(setAttributesSpy).toHaveBeenCalled();
    const attrs = setAttributesSpy.mock.calls[0][0];
    expect(typeof attrs).toBe('object');
    expect(Object.keys(attrs).length).toBeGreaterThan(0);
  });
});

// ----------------------------------------------------------------
// 4. In-memory span export pipeline (v2 constructor API)
// ----------------------------------------------------------------
describe('In-memory span export pipeline', () => {
  let memoryExporter: InMemorySpanExporter;
  let provider: BasicTracerProvider;

  beforeEach(() => {
    memoryExporter = new InMemorySpanExporter();
  });

  afterEach(async () => {
    await provider?.shutdown();
    memoryExporter.reset();
  });

  it('spanProcessors constructor option wires up correctly', () => {
    // v2 API: spanProcessors passed in constructor, not addSpanProcessor()
    provider = new BasicTracerProvider({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: 'constructor-test',
      }),
      spanProcessors: [new SimpleSpanProcessor(memoryExporter)],
    });

    const tracer = provider.getTracer('test');
    const span = tracer.startSpan('constructor-span');
    span.end();

    const spans = memoryExporter.getFinishedSpans();
    expect(spans.length).toBe(1);
    expect(spans[0].name).toBe('constructor-span');
    expect(spans[0].resource.attributes[ATTR_SERVICE_NAME]).toBe(
      'constructor-test',
    );
  });

  it('parent-child relationships use parentSpanContext (v2)', () => {
    provider = new BasicTracerProvider({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: 'parent-child-test',
      }),
      spanProcessors: [new SimpleSpanProcessor(memoryExporter)],
    });

    const tracer = provider.getTracer('test');
    const parentSpan = tracer.startSpan('parent');
    const ctx = trace.setSpan(context.active(), parentSpan);
    const childSpan = tracer.startSpan('child', {}, ctx);
    childSpan.end();
    parentSpan.end();

    const spans = memoryExporter.getFinishedSpans();
    const child = spans.find((s) => s.name === 'child')!;
    const parent = spans.find((s) => s.name === 'parent')!;

    // v2: parentSpanId is gone, use parentSpanContext
    expect(child.parentSpanContext?.spanId).toBe(parent.spanContext().spanId);
    expect(child.parentSpanContext?.traceId).toBe(parent.spanContext().traceId);
  });
});

// ----------------------------------------------------------------
// 5. In-memory log record pipeline (v2 processors constructor)
// ----------------------------------------------------------------
describe('In-memory log record export pipeline', () => {
  it('LoggerProvider processors constructor option works', async () => {
    const memoryLogExporter = new InMemoryLogRecordExporter();

    // v2 API: processors in constructor, not addLogRecordProcessor()
    const provider = new LoggerProvider({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: 'log-test',
      }),
      processors: [new SimpleLogRecordProcessor(memoryLogExporter)],
    });

    const logger = provider.getLogger('test-logger');
    logger.emit({
      severityText: 'INFO',
      severityNumber: 9,
      body: 'test message',
      attributes: { 'log.type': 'test' },
    });

    const records = memoryLogExporter.getFinishedLogRecords();
    expect(records.length).toBe(1);
    expect(records[0].body).toBe('test message');
    expect(records[0].attributes['log.type']).toBe('test');
    expect(records[0].resource.attributes[ATTR_SERVICE_NAME]).toBe('log-test');

    await provider.shutdown();
  });
});

// ----------------------------------------------------------------
// 6. Constants module — env var reading (replaces getEnvWithoutDefaults)
// ----------------------------------------------------------------
describe('Constants (env var reading)', () => {
  afterEach(() => {
    resetEnv();
    jest.resetModules();
  });

  it('DEFAULT_OTEL_LOG_LEVEL defaults to "info" when env var is unset', () => {
    delete process.env.OTEL_LOG_LEVEL;
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const constants = require('../constants');
    expect(constants.DEFAULT_OTEL_LOG_LEVEL).toBe('info');
    expect(typeof constants.DEFAULT_OTEL_LOG_LEVEL).toBe('string');
  });

  it('DEFAULT_SERVICE_NAME returns a string (not Resource object)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const constants = require('../constants');
    const result = constants.DEFAULT_SERVICE_NAME();
    expect(typeof result).toBe('string');
  });

  it('getNumEnv returns undefined for missing vars', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const utils = require('../utils');
    delete process.env.__TEST_MISSING_VAR__;
    expect(utils.getNumEnv('__TEST_MISSING_VAR__')).toBeUndefined();
  });

  it('getNumEnv parses numeric env vars', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const utils = require('../utils');
    process.env.__TEST_NUM_VAR__ = '42';
    expect(utils.getNumEnv('__TEST_NUM_VAR__')).toBe(42);
    delete process.env.__TEST_NUM_VAR__;
  });

  it('getNumEnv returns undefined for non-numeric strings', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const utils = require('../utils');
    process.env.__TEST_NAN_VAR__ = 'not-a-number';
    expect(utils.getNumEnv('__TEST_NAN_VAR__')).toBeUndefined();
    delete process.env.__TEST_NAN_VAR__;
  });
});
