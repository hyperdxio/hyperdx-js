import { BatchSpanProcessor, Span } from '@opentelemetry/sdk-trace-base';
import { Context } from '@opentelemetry/api';

import { hyperDXGlobalContext } from './context';

export default class HyperDXSpanProcessor extends BatchSpanProcessor {
  onStart(_span: Span, _parentContext: Context): void {
    const traceId = _span.spanContext().traceId;
    hyperDXGlobalContext.addTraceSpan(traceId, _span);
  }
}
