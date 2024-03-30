import { SpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';

const DEFAULT_INTERNAL_URL = 'https://in.hyperdx.io/?hdx_platform=nodejs';

export default class FilterSpanExporter implements SpanExporter {
  constructor(private wrappedExporter: SpanExporter) {}

  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    const filteredSpans = spans.filter((span) => {
      return !(
        span.attributes['http.url'] === DEFAULT_INTERNAL_URL &&
        (span.attributes['http.status_code'] === 502 ||
          span.attributes['http.status_code'] === 504)
      );
    });

    if (filteredSpans.length > 0) {
      this.wrappedExporter.export(filteredSpans, resultCallback);
    } else {
      resultCallback({ code: ExportResultCode.SUCCESS });
    }
  }

  shutdown(): Promise<void> {
    return this.wrappedExporter.shutdown();
  }
}
