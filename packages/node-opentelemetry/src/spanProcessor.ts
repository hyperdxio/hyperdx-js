import { Attributes, Context, trace } from '@opentelemetry/api';
import { BatchSpanProcessor, Span } from '@opentelemetry/sdk-trace-base';

import hdx from './debug';

const HDX_CONTEXT_REFRESHER_INTERVAL = 10000;
const HDX_CONTEXT_TRACE_ATTRIBUTES_EXPIRATION = 5 * 60 * 1000;

class HyperDXContext {
  private readonly _traceAttributes = new Map<
    string,
    {
      attributes: Attributes;
      lastReadAt: number;
    }
  >();

  constructor() {
    // expires after 5 minutes
    setInterval(() => {
      hdx('Clearing _traceAttributes...');
      const now = Date.now();
      for (const [traceId, data] of this._traceAttributes.entries()) {
        if (now - data.lastReadAt > HDX_CONTEXT_TRACE_ATTRIBUTES_EXPIRATION) {
          this._traceAttributes.delete(traceId);
          hdx(`Deleted traceId ${traceId} from _traceAttributes`);
        }
      }
    }, HDX_CONTEXT_REFRESHER_INTERVAL);
  }

  setTraceAttributes = (attributes: Attributes): void => {
    const currentSpan = trace.getActiveSpan();
    if (!currentSpan) {
      return;
    }
    const traceId = currentSpan.spanContext().traceId;
    this._traceAttributes.set(traceId, {
      attributes,
      lastReadAt: Date.now(),
    });
  };

  getTraceAttributes = (traceId: string): Attributes | undefined => {
    const traceAttributes = this._traceAttributes.get(traceId);
    if (traceAttributes) {
      traceAttributes.lastReadAt = Date.now();
      this._traceAttributes.set(traceId, traceAttributes);
    }
    return traceAttributes?.attributes;
  };
}

export const hyperDXContext = new HyperDXContext();

export default class HyperDXSpanProcessor extends BatchSpanProcessor {
  onStart(_span: Span, _parentContext: Context): void {
    const traceId = _span.spanContext().traceId;
    const traceAttributes = hyperDXContext.getTraceAttributes(traceId);
    if (traceAttributes) {
      _span.setAttributes(traceAttributes);
    }
  }
}
