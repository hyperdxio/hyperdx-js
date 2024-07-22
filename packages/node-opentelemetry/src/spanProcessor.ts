import { Context } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { BatchSpanProcessor, Span } from '@opentelemetry/sdk-trace-base';

import type { MutableAsyncLocalStorageContextManager } from './MutableAsyncLocalStorageContextManager';

export default class HyperDXSpanProcessor extends BatchSpanProcessor {
  private readonly enableHDXGlobalContext: boolean;
  private readonly contextManager:
    | MutableAsyncLocalStorageContextManager
    | undefined;

  constructor({
    exporter,
    enableHDXGlobalContext,
    contextManager,
  }: {
    exporter: OTLPTraceExporter;
    enableHDXGlobalContext: boolean;
    contextManager?: MutableAsyncLocalStorageContextManager;
  }) {
    super(exporter);
    this.enableHDXGlobalContext = enableHDXGlobalContext;
    this.contextManager = contextManager;
  }

  private _setTraceAttributes(span: Span): void {
    if (
      this.enableHDXGlobalContext &&
      this.contextManager != null &&
      typeof this.contextManager.getMutableContext === 'function'
    ) {
      const spanAttributes = span.attributes;

      // We should only update attributes that aren't set already.
      // This ensures that we don't overwrite attributes set by the user.
      // Additionally in onEnd, some instrumentations such as mongodb will have
      // the "wrong" context defined and we won't have accurate trace attributes.
      const mutableContext = this.contextManager.getMutableContext();

      const traceAttributes = mutableContext?.traceAttributes;
      if (traceAttributes != null) {
        traceAttributes.forEach((value, key) => {
          if (spanAttributes[key] == null) {
            span.setAttribute(key, value);
          }
        });
      }
    }
  }

  onStart(_span: Span, _parentContext: Context): void {
    this._setTraceAttributes(_span);

    super.onStart(_span, _parentContext);
  }

  // This is done on a best-effort basis, and we can't guarantee that the attributes
  // will get set successfully at this point due to instrumentation-specific quirks
  onEnd(_span: Span): void {
    // Allow us to set attributes on the span after it is ended from the span itself
    // @ts-ignore
    _span._ended = false;

    this._setTraceAttributes(_span);

    // @ts-ignore
    _span._ended = true;

    super.onEnd(_span);
  }
}
