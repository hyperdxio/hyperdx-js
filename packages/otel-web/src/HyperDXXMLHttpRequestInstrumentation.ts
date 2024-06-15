import * as api from '@opentelemetry/api';
import * as shimmer from 'shimmer';
import {
  XMLHttpRequestInstrumentation,
  XMLHttpRequestInstrumentationConfig,
} from '@opentelemetry/instrumentation-xml-http-request';

import { captureTraceParent } from './servertiming';
import { headerCapture } from './utils';

type ExposedSuper = {
  _addResourceObserver: (xhr: XMLHttpRequest, spanUrl: string) => void;
  _createSpan: (
    xhr: XMLHttpRequest,
    url: string,
    method: string,
  ) => api.Span | undefined;
};

export type HyperDXXMLHttpRequestInstrumentationConfig =
  XMLHttpRequestInstrumentationConfig & {
    advancedNetworkCapture?: () => boolean;
  };

export class HyperDXXMLHttpRequestInstrumentation extends XMLHttpRequestInstrumentation {
  constructor(config: HyperDXXMLHttpRequestInstrumentationConfig = {}) {
    super(config);

    // TODO: fix when upstream exposes this method
    const _superCreateSpan = (this as any as ExposedSuper)._createSpan.bind(
      this,
    ) as ExposedSuper['_createSpan'];
    (this as any as ExposedSuper)._createSpan = (xhr, url, method) => {
      const span = _superCreateSpan(xhr, url, method);

      if (span) {
        if (config.advancedNetworkCapture?.()) {
          xhr.addEventListener('readystatechange', function () {
            if (xhr.readyState === xhr.OPENED) {
              shimmer.wrap(xhr, 'setRequestHeader', (original) => {
                return function (header, value) {
                  headerCapture('request', [header])(span, () => value);
                  return original.apply(this, arguments);
                };
              });
              shimmer.wrap(xhr, 'send', (original) => {
                return function (body) {
                  if (body) {
                    span.setAttribute('http.request.body', body.toString());
                  }
                  return original.apply(this, arguments);
                };
              });
            } else if (xhr.readyState === xhr.DONE) {
              const headers = xhr
                .getAllResponseHeaders()
                .split('\r\n')
                .reduce((result, current) => {
                  let [name, value] = current.split(': ');
                  if (name && value) {
                    result[name] = value;
                  }
                  return result;
                }, {});
              headerCapture('response', Object.keys(headers))(
                span,
                (header) => headers[header],
              );
              span.setAttribute('http.response.body', xhr.responseText);

              shimmer.unwrap(xhr, 'setRequestHeader');
              shimmer.unwrap(xhr, 'send');
            }
          });
        }

        // don't care about success/failure, just want to see response headers if they exist
        xhr.addEventListener('readystatechange', function () {
          if (xhr.readyState === xhr.HEADERS_RECEIVED) {
            const headers = xhr.getAllResponseHeaders().toLowerCase();
            if (headers.indexOf('server-timing') !== -1) {
              const st = xhr.getResponseHeader('server-timing');
              if (st !== null) {
                captureTraceParent(st, span);
              }
            }
          }
        });

        // FIXME long-term answer for deprecating attributes.component?
        span.setAttribute('component', this.moduleName);
        // Temporary return to old span name until cleared by backend
        span.updateName(`HTTP ${method.toUpperCase()}`);
      }

      return span;
    };

    const _superAddResourceObserver = (
      this as unknown as ExposedSuper
    )._addResourceObserver.bind(this) as ExposedSuper['_addResourceObserver'];
    (this as any as ExposedSuper)._addResourceObserver = (
      xhr: XMLHttpRequest,
      spanUrl: string,
    ) => {
      // Fix: PerformanceObserver feature detection is broken and crashes in IE
      // Is fixed in 0.29.0 but contrib isn't updated yet
      if (
        typeof PerformanceObserver !== 'function' ||
        typeof PerformanceResourceTiming !== 'function'
      ) {
        return;
      }

      _superAddResourceObserver(xhr, spanUrl);
    };
  }
}
