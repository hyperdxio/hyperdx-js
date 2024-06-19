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
import Rum, { ZipkinSpan } from '../src/index';

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

export function deinit(): void {
  Rum.deinit();
}
