import { Attributes, Context, context, trace } from '@opentelemetry/api';
import { BatchSpanProcessor, Span } from '@opentelemetry/sdk-trace-base';
import { suppressTracing } from '@opentelemetry/core';

import hdx from './debug';

const HDX_CONTEXT_REFRESHER_INTERVAL = 10000;
const HDX_CONTEXT_TRACE_ATTRIBUTES_EXPIRATION = 5 * 60 * 1000;

class HyperDXContext {
  private readonly _traceAttributes = new Map<string, Attributes>();
  private readonly _traceMap = new Map<
    string,
    {
      spans: Span[];
      lastUpdateAt: number;
    }
  >();

  constructor() {
    // expires after 5 minutes
    setInterval(() => {
      hdx(`Running _traceMap expiration check`);
      const now = Date.now();
      for (const [traceId, data] of this._traceMap.entries()) {
        if (now - data.lastUpdateAt > HDX_CONTEXT_TRACE_ATTRIBUTES_EXPIRATION) {
          this._traceMap.delete(traceId);
          this._traceAttributes.delete(traceId);
          hdx(`Deleted traceId ${traceId} from _traceMap and _traceAttributes`);
        }
      }
    }, HDX_CONTEXT_REFRESHER_INTERVAL);
  }

  private _getActiveSpanTraceId = (): string | undefined => {
    const activeSpan = trace.getActiveSpan();
    if (!activeSpan) {
      return undefined;
    }
    return activeSpan.spanContext().traceId;
  };

  private _setTraceAttributesForAllSpans = (traceId: string): void => {
    const attributes = this.getTraceAttributes(traceId);
    if (!attributes) {
      return;
    }
    const traceData = this._traceMap.get(traceId);
    if (traceData) {
      for (const span of traceData.spans) {
        if (!span.ended) {
          span.setAttributes(attributes);
        }
      }
    }
  };

  addTraceSpan = (traceId: string, span: Span): void => {
    // prevent downstream exporter calls from generating spans
    context.with(suppressTracing(context.active()), () => {
      hdx(`Adding traceId ${traceId} to _traceMap`);
      const traceData = this._traceMap.get(traceId);
      if (!traceData) {
        this._traceMap.set(traceId, {
          spans: [span],
          lastUpdateAt: Date.now(),
        });
      } else {
        traceData.spans.push(span);
        traceData.lastUpdateAt = Date.now();
      }
      this._setTraceAttributesForAllSpans(traceId);
    });
  };

  getTraceAttributes = (traceId: string): Attributes | undefined => {
    return this._traceAttributes.get(traceId);
  };

  // user facing API
  setTraceAttributes = (attributes: Attributes): void => {
    // prevent downstream exporter calls from generating spans
    context.with(suppressTracing(context.active()), () => {
      const currentActiveSpanTraceId = this._getActiveSpanTraceId();
      if (!currentActiveSpanTraceId) {
        return;
      }
      this._traceAttributes.set(currentActiveSpanTraceId, attributes);
      this._setTraceAttributesForAllSpans(currentActiveSpanTraceId);
    });
  };
}

export const hyperDXContext = new HyperDXContext();

export default class HyperDXSpanProcessor extends BatchSpanProcessor {
  onStart(_span: Span, _parentContext: Context): void {
    const traceId = _span.spanContext().traceId;
    hyperDXContext.addTraceSpan(traceId, _span);
  }
}
