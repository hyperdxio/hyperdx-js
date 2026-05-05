import * as assert from 'assert';
import * as sinon from 'sinon';
import * as webVitals from 'web-vitals';
import { Span, Tracer, TracerProvider } from '@opentelemetry/api';

import { initWebVitals } from '../src/webvitals';

type Metric = webVitals.Metric;

interface CapturedSpan {
  name: string;
  attrs: Record<string, unknown>;
}

function makeCapturingProvider(captured: CapturedSpan[]): TracerProvider {
  const tracer = {
    startSpan: (name: string) => {
      const entry: CapturedSpan = { name, attrs: {} };
      captured.push(entry);
      const span: Partial<Span> = {
        setAttribute: (key: string, value: unknown) => {
          entry.attrs[key] = value;
          return span as Span;
        },
        end: () => {
          // no-op
        },
      };
      return span as Span;
    },
  } as unknown as Tracer;
  return { getTracer: () => tracer };
}

const callbackNames = [
  'onFID',
  'onCLS',
  'onLCP',
  'onINP',
  'onFCP',
  'onTTFB',
] as const;
type CallbackName = (typeof callbackNames)[number];

function makeFakeCallbacks(): Record<CallbackName, sinon.SinonSpy> {
  return {
    onFID: sinon.fake(),
    onCLS: sinon.fake(),
    onLCP: sinon.fake(),
    onINP: sinon.fake(),
    onFCP: sinon.fake(),
    onTTFB: sinon.fake(),
  };
}

describe('webvitals', () => {
  it('registers a callback for every Core Web Vital', () => {
    const fakes = makeFakeCallbacks();
    initWebVitals(makeCapturingProvider([]), fakes as never);
    for (const name of callbackNames) {
      assert.strictEqual(
        fakes[name].calledOnce,
        true,
        `${name} should be registered exactly once`,
      );
      assert.strictEqual(
        typeof fakes[name].firstCall.args[0],
        'function',
        `${name} should receive a callback function`,
      );
    }
  });

  it('emits a webvitals span with the metric attribute when each callback fires', () => {
    const captured: CapturedSpan[] = [];
    const fakes = makeFakeCallbacks();
    initWebVitals(makeCapturingProvider(captured), fakes as never);

    const cases: Array<{
      callback: CallbackName;
      attribute: string;
      value: number;
    }> = [
      { callback: 'onFID', attribute: 'fid', value: 12 },
      { callback: 'onCLS', attribute: 'cls', value: 0.05 },
      { callback: 'onLCP', attribute: 'lcp', value: 1234 },
      { callback: 'onINP', attribute: 'inp', value: 56 },
      { callback: 'onFCP', attribute: 'fcp', value: 789 },
      { callback: 'onTTFB', attribute: 'ttfb', value: 100 },
    ];

    for (const c of cases) {
      const cb = fakes[c.callback].firstCall.args[0] as (m: Metric) => void;
      cb({ name: c.attribute.toUpperCase(), value: c.value } as Metric);
    }

    assert.strictEqual(captured.length, cases.length);
    for (const c of cases) {
      const span = captured.find(
        (s) => s.name === 'webvitals' && c.attribute in s.attrs,
      );
      assert.ok(span, `Expected a 'webvitals' span carrying '${c.attribute}'`);
      assert.strictEqual(span.attrs[c.attribute], c.value);
    }
  });

  it('reports each metric only once even if its callback fires repeatedly', () => {
    const captured: CapturedSpan[] = [];
    const fakes = makeFakeCallbacks();
    initWebVitals(makeCapturingProvider(captured), fakes as never);

    const cb = fakes.onLCP.firstCall.args[0] as (m: Metric) => void;
    cb({ name: 'LCP', value: 1234 } as Metric);
    cb({ name: 'LCP', value: 5678 } as Metric);

    const lcpSpans = captured.filter((s) => 'lcp' in s.attrs);
    assert.strictEqual(lcpSpans.length, 1);
    assert.strictEqual(lcpSpans[0].attrs.lcp, 1234);
  });
});

describe('webvitals (real browser)', function () {
  // Karma runs the suite in real headless Chrome. Both FCP (first paint of
  // the karma runner page) and TTFB (response start of the navigation
  // request that loaded that page) fire deterministically. LCP / FID /
  // INP / CLS depend on user interaction or layout shifts and are
  // non-deterministic in this environment, so we only assert on the two
  // that the browser produces on its own.
  this.timeout(10_000);

  function waitFor(
    predicate: () => boolean,
    timeoutMs: number,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const deadline = Date.now() + timeoutMs;
      const tick = () => {
        if (predicate()) return resolve(true);
        if (Date.now() >= deadline) return resolve(false);
        setTimeout(tick, 50);
      };
      tick();
    });
  }

  it('captures real FCP and TTFB values from the headless browser', async () => {
    const captured: CapturedSpan[] = [];
    // Note: no fakes here — we exercise the real `web-vitals` callbacks,
    // which read out actual PerformanceObserver entries recorded while
    // karma loaded this page.
    initWebVitals(makeCapturingProvider(captured));

    const ready = await waitFor(
      () =>
        captured.some((s) => 'fcp' in s.attrs) &&
        captured.some((s) => 'ttfb' in s.attrs),
      8_000,
    );
    assert.strictEqual(
      ready,
      true,
      `Timed out waiting for FCP+TTFB. Captured: ${JSON.stringify(captured)}`,
    );

    const fcpSpan = captured.find((s) => 'fcp' in s.attrs);
    const ttfbSpan = captured.find((s) => 'ttfb' in s.attrs);

    assert.ok(fcpSpan, 'FCP span should be emitted');
    assert.strictEqual(fcpSpan.name, 'webvitals');
    assert.strictEqual(typeof fcpSpan.attrs.fcp, 'number');
    assert.ok(
      (fcpSpan.attrs.fcp as number) > 0,
      `FCP should be a positive duration in ms, got ${fcpSpan.attrs.fcp}`,
    );

    assert.ok(ttfbSpan, 'TTFB span should be emitted');
    assert.strictEqual(ttfbSpan.name, 'webvitals');
    assert.strictEqual(typeof ttfbSpan.attrs.ttfb, 'number');
    assert.ok(
      (ttfbSpan.attrs.ttfb as number) >= 0,
      `TTFB should be a non-negative duration in ms, got ${ttfbSpan.attrs.ttfb}`,
    );
  });
});
