import {
  FetchInstrumentation,
  FetchInstrumentationConfig,
} from '@opentelemetry/instrumentation-fetch';

import { captureTraceParent } from './servertiming';
import { headerCapture } from './utils';

export type HyperDXFetchInstrumentationConfig = FetchInstrumentationConfig & {
  advancedNetworkCapture?: () => boolean;
};

// not used yet
async function readStream(stream: ReadableStream): Promise<string> {
  const chunks: string[] = [];
  const queuingStrategy = new CountQueuingStrategy({ highWaterMark: 1 });
  const decoder = new TextDecoder();
  try {
    await stream.pipeTo(
      new WritableStream(
        {
          write(chunk) {
            chunks.push(decoder.decode(chunk, { stream: true }));
          },
        },
        queuingStrategy,
      ),
    );
  } catch (e) {
    // Ignore
  } finally {
    return chunks.join('');
  }
}

export class HyperDXFetchInstrumentation extends FetchInstrumentation {
  constructor(config: HyperDXFetchInstrumentationConfig = {}) {
    const origCustomAttrs = config.applyCustomAttributesOnSpan;
    config.applyCustomAttributesOnSpan = function (span, request, response) {
      // Temporary return to old span name until cleared by backend
      span.updateName(`HTTP ${(request.method || 'GET').toUpperCase()}`);
      span.setAttribute('component', 'fetch');

      if (config.advancedNetworkCapture?.() && span) {
        if (request.headers) {
          headerCapture('request', Object.keys(request.headers))(
            span,
            (header) => request.headers?.[header],
          );
        }
        if (request.body) {
          if (request.body instanceof ReadableStream) {
            span.setAttribute('http.request.body', '[ReadableStream]');
            // FIXME: This is not working yet
            // readStream(request.body).then((body) => {
            //   span.setAttribute('http.request.body', body);
            // });
          } else {
            span.setAttribute('http.request.body', request.body.toString());
          }
        }

        if (response instanceof Response) {
          if (response.headers) {
            const headerNames: string[] = [];
            response.headers.forEach((value, name) => {
              headerNames.push(name);
            });
            headerCapture('response', headerNames)(
              span,
              (header) => response.headers.get(header) ?? '',
            );
          }
          response
            .clone()
            .text()
            .then((body) => {
              span.setAttribute('http.response.body', body);
            })
            .catch(() => {
              // Ignore
            });
        }
      }

      if (span && response instanceof Response && response.headers) {
        const st = response.headers.get('Server-Timing');
        if (st) {
          captureTraceParent(st, span);
        }
      }
      if (origCustomAttrs) {
        origCustomAttrs(span, request, response);
      }
    };

    super(config);
  }

  enable(): void {
    // Don't attempt in browsers where there's no fetch API
    if (!window.fetch) {
      return;
    }

    super.enable();
  }
}
