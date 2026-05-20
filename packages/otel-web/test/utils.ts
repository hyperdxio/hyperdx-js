/*
Copyright 2021 Splunk Inc.

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

import {
  ReadableSpan,
  SimpleSpanProcessor,
  SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import Rum from '../src/index';
import type { SplunkWebTracerProvider } from '../src/SplunkWebTracerProvider';

export class SpanCapturer implements SpanProcessor {
  public readonly spans: ReadableSpan[] = [];
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
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
 * Poll a SpanCapturer until a span matching `predicate` appears, then invoke
 * `done`.  Uses polling instead of a fixed timeout so tests are resilient to
 * async `recordException` completing at varying speeds (especially on CI).
 */
export function waitForSpan(
  capturer: SpanCapturer,
  predicate: (span: ReadableSpan) => boolean,
  done: (err?: Error) => void,
  assertions: (span: ReadableSpan) => void,
  timeoutMsg = 'Timed out waiting for span',
  { pollInterval = 50, maxWait = 5000 } = {},
): void {
  let elapsed = 0;
  const check = (): void => {
    const span = capturer.spans.find(predicate);
    if (span) {
      try {
        assertions(span);
        done();
      } catch (e) {
        done(e instanceof Error ? e : new Error(String(e)));
      }
    } else if (elapsed >= maxWait) {
      done(new Error(timeoutMsg));
    } else {
      elapsed += pollInterval;
      setTimeout(check, pollInterval);
    }
  };
  setTimeout(check, pollInterval);
}

export function deinit(): void {
  Rum.deinit();
}

export function initWithDefaultConfig(
  capturer: SpanCapturer,
  additionalConfig: Partial<Parameters<typeof Rum.init>[0]> = {},
): void {
  Rum.init({
    url: 'https://127.0.0.1:8888/v1/rum',
    applicationName: 'app',
    apiKey: undefined,
    ...additionalConfig,
  });
  if (Rum.provider) {
    addTestSpanProcessor(Rum.provider, capturer);
  }
}

/**
 * In OTel SDK v2, addSpanProcessor was removed from BasicTracerProvider.
 * This helper pushes a processor into the internal list for test use only.
 */
export function addTestSpanProcessor(
  provider: SplunkWebTracerProvider,
  processor: SpanProcessor,
): void {
  (provider as any)._activeSpanProcessor._spanProcessors.push(processor);
}
