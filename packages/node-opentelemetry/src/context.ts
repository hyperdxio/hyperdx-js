import { Attributes, context, trace } from '@opentelemetry/api';
import { Span } from '@opentelemetry/sdk-trace-base';
import { suppressTracing } from '@opentelemetry/core';

import hdx from './debug';

const HDX_CONTEXT_MAX_SPANS_PER_TRACE = 100;
const HDX_CONTEXT_MAX_TRACKED_TRACE_IDS = 50000; // ~ 500 MB of memory (10 spans / trace, 1k per span)
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

  start(): void {
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
        if (this._traceMap.size >= HDX_CONTEXT_MAX_TRACKED_TRACE_IDS) {
          hdx(
            `Exceeded max tracked trace ids: ${HDX_CONTEXT_MAX_TRACKED_TRACE_IDS}`,
          );
          return;
        }
        this._traceMap.set(traceId, {
          spans: [span],
          lastUpdateAt: Date.now(),
        });
      } else {
        if (traceData.spans.length >= HDX_CONTEXT_MAX_SPANS_PER_TRACE) {
          hdx(
            `Exceeded max spans per trace: ${HDX_CONTEXT_MAX_SPANS_PER_TRACE}`,
          );
          return;
        }
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
      if (this._traceAttributes.size >= HDX_CONTEXT_MAX_TRACKED_TRACE_IDS) {
        hdx(
          `Exceeded max tracked trace ids: ${HDX_CONTEXT_MAX_TRACKED_TRACE_IDS}`,
        );
        return;
      }
      this._traceAttributes.set(currentActiveSpanTraceId, attributes);
      this._setTraceAttributesForAllSpans(currentActiveSpanTraceId);
    });
  };
}

export const hyperDXGlobalContext = new HyperDXContext();
