import { BatchSpanProcessor, Span } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';

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

  onEnd(_span: Span): void {
    if (
      this.enableHDXGlobalContext &&
      this.contextManager != null &&
      typeof this.contextManager.getMutableContext === 'function'
    ) {
      // Allow us to set attributes on the span after it is ended from the span itself
      // @ts-ignore
      _span._ended = false;
      const mutableContext = this.contextManager.getMutableContext();
      const traceAttributes = Object.fromEntries(
        mutableContext?.traceAttributes ?? [],
      );
      _span.setAttributes(traceAttributes);
      // @ts-ignore
      _span._ended = true;
    }

    super.onEnd(_span);
  }
}
