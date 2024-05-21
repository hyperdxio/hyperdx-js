import { BatchSpanProcessor, Span } from '@opentelemetry/sdk-trace-base';
import { Context } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';

import { hyperDXGlobalContext } from './context';

export default class HyperDXSpanProcessor extends BatchSpanProcessor {
  private readonly enableHDXGlobalContext: boolean;

  constructor({
    exporter,
    enableHDXGlobalContext,
  }: {
    exporter: OTLPTraceExporter;
    enableHDXGlobalContext: boolean;
  }) {
    super(exporter);
    this.enableHDXGlobalContext = enableHDXGlobalContext;
  }

  onStart(_span: Span, _parentContext: Context): void {
    if (this.enableHDXGlobalContext) {
      const traceId = _span.spanContext().traceId;
      hyperDXGlobalContext.addTraceSpan(traceId, _span);
    }
  }
}
