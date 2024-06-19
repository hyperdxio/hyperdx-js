/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  BatchSpanProcessor,
  BatchSpanProcessorBrowserConfig,
  SpanExporter,
} from '@opentelemetry/sdk-trace-base';
import { globalErrorHandler } from '@opentelemetry/core';

export class HyperDXBatchSpanProcessor extends BatchSpanProcessor {
  private _visibilityChangeListener?: () => void;
  private _pageHideListener?: () => void;

  constructor(
    _exporter: SpanExporter,
    config?: BatchSpanProcessorBrowserConfig,
  ) {
    super(_exporter, config);
  }

  // This currently overwrites the super onInit function
  // which is intentional to fix a bug in the super onInit
  // which fails to catch forceFlush exceptions
  private onInit(config?: BatchSpanProcessorBrowserConfig): void {
    if (
      config?.disableAutoFlushOnDocumentHide !== true &&
      typeof document !== 'undefined'
    ) {
      this._visibilityChangeListener = () => {
        if (document.visibilityState === 'hidden') {
          void this.forceFlush().catch((e) => globalErrorHandler(e));
        }
      };
      this._pageHideListener = () => {
        void this.forceFlush().catch((e) => globalErrorHandler(e));
      };
      document.addEventListener(
        'visibilitychange',
        this._visibilityChangeListener,
      );

      // use 'pagehide' event as a fallback for Safari; see https://bugs.webkit.org/show_bug.cgi?id=116769
      document.addEventListener('pagehide', this._pageHideListener);
    }
  }
}
