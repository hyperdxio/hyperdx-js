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

import { TracerProvider } from '@opentelemetry/api';
import * as webVitalsLib from 'web-vitals';

type WebVitalsCallbacks = Pick<
  typeof webVitalsLib,
  'onCLS' | 'onFCP' | 'onFID' | 'onINP' | 'onLCP' | 'onTTFB'
>;

export function initWebVitals(
  provider: TracerProvider,
  // The web-vitals callbacks are accepted as an injected dependency so
  // tests can drive them synchronously. Defaults to the real library
  // for normal use.
  callbacks: WebVitalsCallbacks = webVitalsLib,
): void {
  const tracer = provider.getTracer('webvitals');
  // Per-init cache: each Core Web Vital callback may fire more than once
  // in a page's lifetime (CLS in particular), and we only want to report
  // each metric once. Scoped to this call so callers that re-init get a
  // fresh cache instead of inheriting module-level state.
  const reported: Record<string, true> = {};

  function report(name: string, metric: webVitalsLib.Metric): void {
    if (reported[name]) {
      return;
    }
    reported[name] = true;

    const now = Date.now();
    const span = tracer.startSpan('webvitals', { startTime: now });
    span.setAttribute(name, metric.value);
    span.end(now);
  }

  callbacks.onFID((metric) => report('fid', metric));
  callbacks.onCLS((metric) => report('cls', metric));
  callbacks.onLCP((metric) => report('lcp', metric));
  callbacks.onINP((metric) => report('inp', metric));
  callbacks.onFCP((metric) => report('fcp', metric));
  callbacks.onTTFB((metric) => report('ttfb', metric));
}
