import {
  FetchInstrumentation,
  FetchInstrumentationConfig,
} from '@opentelemetry/instrumentation-fetch';

import { captureTraceParent } from './servertiming';
import { RedactableKey, headerCapture, shouldRedactKey } from './utils';

export type HyperDXFetchInstrumentationConfig = FetchInstrumentationConfig & {
  advancedNetworkCapture?: () => boolean;
  redactKeys?: {
    headers?: RedactableKey[];
    body?: RedactableKey[];
  };
};

function redactValue(): string {
  return '[REDACTED]';
}

function redactObject(obj: any, redactConfig: RedactableKey[] | undefined) {
  if (!redactConfig || !obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, redactConfig));
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (shouldRedactKey(key, redactConfig)) {
      result[key] = redactValue();
    } else if (value && typeof value === 'object') {
      result[key] = redactObject(value, redactConfig);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function redactFormData(
  formData: FormData,
  redactConfig: RedactableKey[] | undefined,
): string {
  if (!redactConfig) {
    return formData.toString();
  }

  const entries: Array<[string, string]> = [];
  formData.forEach((value, key) => {
    if (shouldRedactKey(key, redactConfig)) {
      entries.push([key, redactValue()]);
    } else {
      entries.push([key, value.toString()]);
    }
  });

  return JSON.stringify(Object.fromEntries(entries));
}

function redactURLSearchParams(
  params: URLSearchParams,
  redactConfig: RedactableKey[] | undefined,
): string {
  if (!redactConfig) {
    return params.toString();
  }

  const newParams = new URLSearchParams();
  params.forEach((value, key) => {
    if (shouldRedactKey(key, redactConfig)) {
      newParams.set(key, redactValue());
    } else {
      newParams.set(key, value);
    }
  });

  return newParams.toString();
}

function redactRequestBody(
  body: ReadableStream<Uint8Array> | BodyInit,
  redactConfig: RedactableKey[] | undefined,
): string {
  if (!body) return '';

  // Maintain backward compatibility with ReadableStream
  if (body instanceof ReadableStream) {
    return '[ReadableStream]';
  }

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return redactFormData(body, redactConfig);
  }

  if (
    typeof URLSearchParams !== 'undefined' &&
    body instanceof URLSearchParams
  ) {
    return redactURLSearchParams(body, redactConfig);
  }

  if (typeof body === 'string') {
    if (!redactConfig) {
      return body;
    }

    try {
      const parsed = JSON.parse(body);
      const redacted = redactObject(parsed, redactConfig);
      return JSON.stringify(redacted);
    } catch {
      // Not JSON, return as-is
      return body;
    }
  }

  return body.toString();
}

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
          headerCapture(
            'request',
            Object.keys(request.headers),
            config.redactKeys?.headers,
          )(span, (header) => request.headers?.[header]);
        }
        if (request.body) {
          const redactedBody = redactRequestBody(
            request.body,
            config.redactKeys?.body,
          );
          span.setAttribute('http.request.body', redactedBody);
        }

        if (response instanceof Response) {
          if (response.headers) {
            const headerNames: string[] = [];
            response.headers.forEach((value, name) => {
              headerNames.push(name);
            });
            headerCapture(
              'response',
              headerNames,
              config.redactKeys?.headers,
            )(span, (header) => response.headers.get(header) ?? '');
          }
          response
            .clone()
            .text()
            .then((body) => {
              // TODO: redact response body
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
