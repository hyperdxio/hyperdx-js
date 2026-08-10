import Rum from '@hyperdx/otel-web';
import { ReadableSpan, SpanProcessor } from '@opentelemetry/sdk-trace-base';

// Mock session recorder to avoid protobuf/protobufjs dependency issues in jsdom
jest.mock('@hyperdx/otel-web-session-recorder', () => ({
  __esModule: true,
  default: { init: jest.fn(), stop: jest.fn(), resume: jest.fn() },
}));

// Mock the OTLP exporter to avoid dynamic import() issues in Jest
// (OTel SDK v2's HTTP transport uses dynamic import which isn't supported in Jest VM)
jest.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: class MockOTLPTraceExporter {
    export(_spans: any, resultCallback: (result: any) => void) {
      resultCallback({ code: 0 });
    }
    shutdown() {
      return Promise.resolve();
    }
    forceFlush() {
      return Promise.resolve();
    }
  },
}));

import SessionRecorder from '@hyperdx/otel-web-session-recorder';

import HyperDX from '../src/index';

// Handle to the mocked SessionRecorder.init (see jest.mock above).
const mockRecorderInit = SessionRecorder.init as jest.Mock;

// ---------------------------------------------------------------------------
// SpanCapturer -- mirrors the one in otel-web/test/utils.ts
// ---------------------------------------------------------------------------
class SpanCapturer implements SpanProcessor {
  public readonly spans: ReadableSpan[] = [];
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onStart(): void {}
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
  onEnd(span: ReadableSpan): void {
    this.spans.push(span);
  }
  clear(): void {
    this.spans.length = 0;
  }
}

/**
 * In OTel SDK v2, addSpanProcessor was removed from BasicTracerProvider.
 * Push a processor into the internal list for test use only.
 *
 * NOTE: This reaches into OTel internals (_activeSpanProcessor._spanProcessors).
 * It's necessary because the provider is already constructed by Rum.init() and
 * v2 removed the public addSpanProcessor() method. This is test-only scaffolding.
 */
function addTestSpanProcessor(provider: any, processor: SpanProcessor): void {
  provider._activeSpanProcessor._spanProcessors.push(processor);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const MINIMAL_CONFIG = {
  apiKey: 'test-api-key',
  service: 'test-service',
  disableReplay: true,
  disableIntercom: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Browser SDK (@hyperdx/browser)', () => {
  let capturer: SpanCapturer;

  afterEach(() => {
    try {
      Rum.deinit();
    } catch {
      // ignore if not inited
    }
  });

  // -- 1. init succeeds -------------------------------------------------------
  describe('init', () => {
    it('should initialise with minimal config (apiKey + service)', () => {
      HyperDX.init(MINIMAL_CONFIG);

      expect(Rum.inited).toBe(true);
      expect(Rum.provider).toBeDefined();
    });

    it('should not throw when called with all optional fields at defaults', () => {
      expect(() => {
        HyperDX.init(MINIMAL_CONFIG);
      }).not.toThrow();
    });
  });

  // -- 2. span creation & export -----------------------------------------------
  describe('span creation', () => {
    beforeEach(() => {
      capturer = new SpanCapturer();
      HyperDX.init(MINIMAL_CONFIG);
      addTestSpanProcessor(Rum.provider, capturer);
    });

    it('should create and finish a span via the OTel API', () => {
      const tracer = Rum.provider!.getTracer('test');
      const span = tracer.startSpan('manual-span');
      span.setAttribute('test.key', 'test-value');
      span.end();

      const found = capturer.spans.find((s) => s.name === 'manual-span');
      expect(found).toBeDefined();
      expect(found!.attributes['test.key']).toBe('test-value');
    });
  });

  // -- 3. recordException -------------------------------------------------------
  describe('recordException', () => {
    beforeEach(() => {
      capturer = new SpanCapturer();
      HyperDX.init(MINIMAL_CONFIG);
      addTestSpanProcessor(Rum.provider, capturer);
    });

    it('should produce a span with an exception event', async () => {
      HyperDX.recordException(new Error('kaboom'), { extra: 'info' });

      // recordException may be async internally; give it a tick
      await new Promise((r) => setTimeout(r, 100));

      const exceptionSpan = capturer.spans.find((s) =>
        (s.events || []).some((e) => e.name === 'exception'),
      );
      expect(exceptionSpan).toBeDefined();

      const exceptionEvent = exceptionSpan!.events.find(
        (e) => e.name === 'exception',
      );
      expect(exceptionEvent).toBeDefined();
      // The exception message should be captured
      expect(exceptionEvent!.attributes?.['exception.message']).toBe('kaboom');
    });
  });

  // -- 4. addAction -------------------------------------------------------------
  describe('addAction', () => {
    beforeEach(() => {
      capturer = new SpanCapturer();
      HyperDX.init(MINIMAL_CONFIG);
      addTestSpanProcessor(Rum.provider, capturer);
    });

    it('should create a span with the given name and attributes', () => {
      HyperDX.addAction('button-click', { buttonId: 'submit' });

      const actionSpan = capturer.spans.find((s) => s.name === 'button-click');
      expect(actionSpan).toBeDefined();
      expect(actionSpan!.attributes['buttonId']).toBe('submit');
    });

    it('should create a zero-duration span', () => {
      HyperDX.addAction('instant-action');

      const span = capturer.spans.find((s) => s.name === 'instant-action');
      expect(span).toBeDefined();
      expect(span!.startTime).toEqual(span!.endTime);
    });
  });

  // -- 5. resource attributes ---------------------------------------------------
  describe('resource attributes', () => {
    it('should set service.name from the service config', () => {
      HyperDX.init(MINIMAL_CONFIG);

      const resource = Rum.provider!.resource;
      expect(resource.attributes['service.name']).toBe('test-service');
    });

    it('should set telemetry.sdk.name to @hyperdx/otel-web', () => {
      HyperDX.init(MINIMAL_CONFIG);

      const resource = Rum.provider!.resource;
      expect(resource.attributes['telemetry.sdk.name']).toBe(
        '@hyperdx/otel-web',
      );
    });

    it('should set telemetry.distro attributes from SDK_INFO', () => {
      HyperDX.init(MINIMAL_CONFIG);

      const resource = Rum.provider!.resource;
      // These come from SDK_INFO which is set by the OTel SDK
      expect(resource.attributes['telemetry.sdk.language']).toBeDefined();
    });
  });

  // -- 6. custom otelResourceAttributes -----------------------------------------
  describe('otelResourceAttributes', () => {
    it('should pass custom resource attributes through to the provider', () => {
      HyperDX.init({
        ...MINIMAL_CONFIG,
        otelResourceAttributes: {
          'custom.attr': 'custom-value',
          'deployment.environment': 'staging',
        },
      });

      const resource = Rum.provider!.resource;
      expect(resource.attributes['custom.attr']).toBe('custom-value');
      expect(resource.attributes['deployment.environment']).toBe('staging');
    });

    it('should not override SDK-set attributes with custom ones', () => {
      HyperDX.init({
        ...MINIMAL_CONFIG,
        otelResourceAttributes: {
          'telemetry.sdk.name': 'should-be-overridden',
        },
      });

      const resource = Rum.provider!.resource;
      expect(resource.attributes['telemetry.sdk.name']).toBe(
        '@hyperdx/otel-web',
      );
    });
  });

  // -- 7. SplunkWebTracerProvider.resource getter (v2) --------------------------
  describe('provider.resource getter', () => {
    it('should expose resource via the public getter (v2: _resource is private)', () => {
      HyperDX.init(MINIMAL_CONFIG);

      // In v2, BasicTracerProvider made `resource` private.
      // SplunkWebTracerProvider re-exposes it via a getter.
      const resource = Rum.provider!.resource;
      expect(resource).toBeDefined();
      expect(resource.attributes).toBeDefined();
      expect(typeof resource.attributes).toBe('object');
      // Verify it returns actual resource data, not undefined
      expect(resource.attributes['service.name']).toBe('test-service');
    });
  });

  // -- 8. spanProcessors via constructor (v2) -----------------------------------
  describe('span processors wiring', () => {
    it('should have span processors wired via constructor', () => {
      HyperDX.init(MINIMAL_CONFIG);

      // Verify the provider has processors set up internally
      const proc = (Rum.provider as any)._activeSpanProcessor;
      expect(proc).toBeDefined();
      // The composite processor should have sub-processors
      // (at minimum: SplunkSpanAttributesProcessor + BatchSpanProcessor)
      expect(proc._spanProcessors).toBeDefined();
      expect(proc._spanProcessors.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -- 9. session recorder config -----------------------------------------------
  describe('session recorder config', () => {
    const REPLAY_CONFIG = {
      apiKey: 'test-api-key',
      service: 'test-service',
      disableIntercom: true,
      disableReplay: false,
    };

    beforeEach(() => mockRecorderInit.mockClear());

    it('does not init the recorder when replay is disabled', () => {
      HyperDX.init({ ...REPLAY_CONFIG, disableReplay: true });

      expect(mockRecorderInit).not.toHaveBeenCalled();
    });

    it('forwards blocking/masking config to SessionRecorder.init', () => {
      HyperDX.init({
        ...REPLAY_CONFIG,
        blockSelector: '.sensitive',
        blockClass: 'hdx-block',
        ignoreClass: 'hdx-ignore',
        maskAllInputs: true,
        recordCanvas: true,
      });

      expect(mockRecorderInit).toHaveBeenCalledTimes(1);
      expect(mockRecorderInit).toHaveBeenCalledWith(
        expect.objectContaining({
          blockSelector: '.sensitive',
          blockClass: 'hdx-block',
          ignoreClass: 'hdx-ignore',
          maskAllInputs: true,
          recordCanvas: true,
        }),
      );
    });

    it('omits optional selectors when not provided', () => {
      HyperDX.init(REPLAY_CONFIG);

      expect(mockRecorderInit).toHaveBeenCalledWith(
        expect.objectContaining({
          blockSelector: undefined,
          blockClass: undefined,
          maskTextSelector: undefined,
        }),
      );
    });

    // Testing the mapping logic
    it('maps maskClass onto maskTextClass', () => {
      HyperDX.init({ ...REPLAY_CONFIG, maskClass: 'hdx-mask' });

      expect(mockRecorderInit).toHaveBeenCalledWith(
        expect.objectContaining({ maskTextClass: 'hdx-mask' }),
      );
    });

    it('maps maskAllText onto a wildcard maskTextSelector', () => {
      HyperDX.init({ ...REPLAY_CONFIG, maskAllText: true });

      expect(mockRecorderInit).toHaveBeenCalledWith(
        expect.objectContaining({ maskTextSelector: '*' }),
      );
    });
  });

  // -- 10. deinit ----------------------------------------------------------------
  describe('deinit', () => {
    it('should mark the SDK as not inited after deinit', () => {
      HyperDX.init(MINIMAL_CONFIG);
      expect(Rum.inited).toBe(true);

      Rum.deinit();
      expect(Rum.inited).toBe(false);
    });

    it('should remove the provider after deinit', () => {
      HyperDX.init(MINIMAL_CONFIG);
      expect(Rum.provider).toBeDefined();

      Rum.deinit();
      expect(Rum.provider).toBeUndefined();
    });

    it('should allow re-init after deinit', () => {
      HyperDX.init(MINIMAL_CONFIG);
      Rum.deinit();

      expect(() => {
        HyperDX.init(MINIMAL_CONFIG);
      }).not.toThrow();
      expect(Rum.inited).toBe(true);
    });
  });
});
