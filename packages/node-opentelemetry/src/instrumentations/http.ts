import * as http from 'http';
import zlib from 'zlib';
import { PassThrough } from 'stream';

import { Span } from '@opentelemetry/api';
import { headerCapture } from '@opentelemetry/instrumentation-http';

import hdx from '../debug';

// used for env like OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_SERVER_REQUEST
export const splitHttpCaptureHeadersString = (headers?: string) =>
  headers?.split(',').map((header) => header.trim());

export const getHyperDXHTTPInstrumentationConfig = ({
  httpCaptureHeadersClientRequest,
  httpCaptureHeadersClientResponse,
  httpCaptureHeadersServerRequest,
  httpCaptureHeadersServerResponse,
}: {
  httpCaptureHeadersClientRequest?: string;
  httpCaptureHeadersClientResponse?: string;
  httpCaptureHeadersServerRequest?: string;
  httpCaptureHeadersServerResponse?: string;
}) => ({
  requestHook: (
    span: Span,
    request: http.ClientRequest | http.IncomingMessage,
  ) => {
    if (request instanceof http.ClientRequest) {
      // outgoing request (client)
      /* Capture Headers */
      try {
        const headers =
          splitHttpCaptureHeadersString(httpCaptureHeadersClientRequest) ??
          request.getRawHeaderNames();
        headerCapture('request', headers)(span, (header) =>
          request.getHeader(header),
        );
      } catch (e) {
        hdx(`error parsing outgoing-request headers in requestHook: ${e}`);
      }

      /* Capture Body */
      const chunks = [];
      const oldWrite = request.write.bind(request);
      request.write = (data: any) => {
        try {
          if (typeof data === 'string') {
            chunks.push(Buffer.from(data));
          } else {
            chunks.push(data);
          }
        } catch (e) {
          hdx(`error in request.write: ${e}`);
        }
        return oldWrite(data);
      };
      const oldEnd = request.end.bind(request);
      request.end = (data: any) => {
        try {
          if (data) {
            if (typeof data === 'string') {
              chunks.push(Buffer.from(data));
            } else {
              chunks.push(data);
            }
          }
          if (chunks.length > 0) {
            const body = Buffer.concat(chunks).toString('utf8');
            span.setAttribute('http.request.body', body);
          }
        } catch (e) {
          hdx(`error in request.end: ${e}`);
        }
        return oldEnd(data);
      };
    } else {
      // incoming request (server)
      /* Capture Headers */
      try {
        const headers =
          splitHttpCaptureHeadersString(httpCaptureHeadersServerRequest) ??
          request.headers;
        headerCapture('request', Object.keys(headers))(
          span,
          (header) => headers[header],
        );
      } catch (e) {
        hdx(`error parsing incoming-request headers in requestHook: ${e}`);
      }

      /* Capture Body */
      const chunks = [];
      const pt = new PassThrough();
      pt.on('data', (chunk) => {
        try {
          if (typeof chunk === 'string') {
            chunks.push(Buffer.from(chunk));
          } else {
            chunks.push(chunk);
          }
        } catch (e) {
          hdx(`error in request.on('data'): ${e}`);
        }
      }).on('end', () => {
        try {
          if (chunks.length > 0) {
            const body = Buffer.concat(chunks).toString('utf8');
            span.setAttribute('http.request.body', body);
          }
        } catch (e) {
          hdx(`error in request.on('end'): ${e}`);
        }
      });
      request.pipe(pt);
    }
  },
  responseHook: (
    span: Span,
    response: http.ServerResponse | http.IncomingMessage,
  ) => {
    if (response instanceof http.ServerResponse) {
      // incoming response (server)
      /* Capture Body */
      const chunks = [];
      const oldWrite = response.write.bind(response);
      response.write = (data: any) => {
        try {
          if (typeof data === 'string') {
            chunks.push(Buffer.from(data));
          } else {
            chunks.push(data);
          }
        } catch (e) {
          hdx(`error in response.write: ${e}`);
        }
        return oldWrite(data);
      };
      const oldEnd = response.end.bind(response);
      response.end = (data: any) => {
        try {
          if (data) {
            if (typeof data === 'string') {
              chunks.push(Buffer.from(data));
            } else {
              chunks.push(data);
            }
          }
          if (chunks.length > 0) {
            const buffers = Buffer.concat(chunks);
            let body = buffers.toString('utf8');
            const isGzip = response.getHeader('content-encoding') === 'gzip';
            if (isGzip) {
              body = zlib.gunzipSync(buffers).toString('utf8');
            }
            span.setAttribute('http.response.body', body);
          }
        } catch (e) {
          hdx(`error in response.end: ${e}`);
        }

        /* Capture Headers */
        try {
          const headers =
            splitHttpCaptureHeadersString(httpCaptureHeadersServerResponse) ??
            response.getHeaderNames();
          headerCapture('response', headers)(span, (header) =>
            response.getHeader(header),
          );
        } catch (e) {
          hdx(`error parsing incoming-response headers in responseHook: ${e}`);
        }
        return oldEnd(data);
      };
    } else {
      // outgoing request (client)
      /* Capture Headers */
      try {
        const headers =
          splitHttpCaptureHeadersString(httpCaptureHeadersClientResponse) ??
          response.headers;
        headerCapture('response', Object.keys(headers))(
          span,
          (header) => headers[header],
        );
      } catch (e) {
        hdx(`error parsing outgoing-response headers in responseHook: ${e}`);
      }

      /* Capture Body */
      const chunks = [];
      const pt = new PassThrough();
      pt.on('data', (chunk) => {
        try {
          if (typeof chunk === 'string') {
            chunks.push(Buffer.from(chunk));
          } else {
            chunks.push(chunk);
          }
        } catch (e) {
          hdx(`error in response.on('data'): ${e}`);
        }
      }).on('end', () => {
        try {
          if (chunks.length > 0) {
            const buffers = Buffer.concat(chunks);
            let body = buffers.toString('utf8');
            const isGzip = response.headers['content-encoding'] === 'gzip';
            if (isGzip) {
              body = zlib.gunzipSync(buffers).toString('utf8');
            }
            span.setAttribute('http.response.body', body);
          }
        } catch (e) {
          hdx(`error in response.on('end'): ${e}`);
        }
      });
      // FIXME: this might cause issues with some libraries (ex: clickhouse/client)
      // response.pipe(pt);
    }
  },
});
