import { diag, Span } from '@opentelemetry/api';
import { headerCapture } from '@opentelemetry/instrumentation-http/build/src/utils';
import * as http from 'http';
import { PassThrough, Readable } from 'stream';
import zlib from 'zlib';

const SENSITIVE_DATA_SUBSTITUTE = '[Filtered]';
// https://github.com/getsentry/sentry-python/blob/1.18.0/sentry_sdk/scrubber.py#L17
const DEFAULT_DENYLIST = [
  // stolen from relay
  'password',
  'passwd',
  'secret',
  'api_key',
  'apikey',
  'auth',
  'credentials',
  'mysql_pwd',
  'privatekey',
  'private_key',
  'token',
  'session',
  // django
  'csrftoken',
  'sessionid',
  // wsgi
  'x_csrftoken',
  'set_cookie',
  'cookie',
  'authorization',
  'x_api_key',
  // other common names used in the wild
  'aiohttp_session', // aiohttp
  'connect.sid', // Express
  'csrf_token', // Pyramid
  'csrf', // (this is a cookie name used in accepted answers on stack overflow)
  '_csrf', // Express
  '_csrf_token', // Bottle
  'PHPSESSID', // PHP
  '_session', // Sanic
  'symfony', // Symfony
  'user_session', // Vue
  '_xsrf', // Tornado
  'XSRF-TOKEN', // Angular, Laravel
];

// used for env like OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_SERVER_REQUEST
export const splitCommaSeparatedStrings = (headers?: string) =>
  headers?.split(',').map((header) => header.trim());

export const getShouldRecordBody =
  (defaultFilter?: string) => (body: string) => {
    const lowerCaseBody = body.toLowerCase();
    const keywords =
      splitCommaSeparatedStrings(defaultFilter) ??
      DEFAULT_DENYLIST.map((keyword) => keyword.toLowerCase());

    // if body contains any of the keywords, drop it
    if (keywords?.some((keyword) => lowerCaseBody.includes(keyword))) {
      return false;
    }
    return true;
  };

export const interceptReadableStream = (stream: Readable, pt: PassThrough) => {
  const originalState = stream.readableFlowing;
  stream.pipe(pt);
  // FIXME: this might not work properly for 'readable' event handler
  // bacause the state is becoming 'true' after detaching the handler
  // and the pipe would stream the data and cause data loss
  // @ts-ignore (readonly)
  stream.readableFlowing = originalState;
  return stream;
};

export const _handleHttpOutgoingClientRequest = (
  request: http.ClientRequest,
  span: Span,
  shouldRecordBody: (body: string) => boolean,
  httpCaptureHeadersClientRequest?: string,
) => {
  /* Capture Headers */
  try {
    const headers =
      splitCommaSeparatedStrings(httpCaptureHeadersClientRequest) ??
      request.getRawHeaderNames();
    headerCapture('request', headers)(span, (header) =>
      request.getHeader(header),
    );
  } catch (e) {
    diag.debug(`error parsing outgoing-request headers in requestHook: ${e}`);
  }

  /* Capture Body */
  const chunks: Buffer[] = [];
  const oldWrite = request.write.bind(request);
  request.write = (data: any) => {
    try {
      if (typeof data === 'string') {
        chunks.push(Buffer.from(data));
      } else {
        chunks.push(data);
      }
    } catch (e) {
      diag.debug(`error in request.write: ${e}`);
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
        if (shouldRecordBody(body)) {
          span.setAttribute('http.request.body', body);
        } else {
          span.setAttribute('http.request.body', SENSITIVE_DATA_SUBSTITUTE);
        }
      }
    } catch (e) {
      diag.debug(`error in request.end: ${e}`);
    }
    return oldEnd(data);
  };
};

export const _handleHttpIncomingServerRequest = (
  request: http.IncomingMessage,
  span: Span,
  shouldRecordBody: (body: string) => boolean,
  httpCaptureHeadersServerRequest?: string,
) => {
  /* Capture Headers */
  try {
    const headers =
      splitCommaSeparatedStrings(httpCaptureHeadersServerRequest) ??
      request.headers;
    headerCapture('request', Object.keys(headers))(
      span,
      (header) => headers[header],
    );
  } catch (e) {
    diag.debug(`error parsing incoming-request headers in requestHook: ${e}`);
  }

  /* Capture Body */
  const chunks: Buffer[] = [];
  const pt = new PassThrough();
  pt.on('data', (chunk) => {
    try {
      if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk));
      } else {
        chunks.push(chunk);
      }
    } catch (e) {
      diag.debug(`error in request.on('data'): ${e}`);
    }
  }).on('end', () => {
    try {
      if (chunks.length > 0) {
        const body = Buffer.concat(chunks).toString('utf8');
        if (shouldRecordBody(body)) {
          span.setAttribute('http.request.body', body);
        } else {
          span.setAttribute('http.request.body', SENSITIVE_DATA_SUBSTITUTE);
        }
      }
    } catch (e) {
      diag.debug(`error in request.on('end'): ${e}`);
    }
  });
  interceptReadableStream(request, pt);
};

export const _handleHttpIncomingServerResponse = (
  response: http.ServerResponse,
  span: Span,
  shouldRecordBody: (body: string) => boolean,
  httpCaptureHeadersServerResponse?: string,
) => {
  /* Capture Body */
  const chunks: Buffer[] = [];
  const oldWrite = response.write.bind(response);
  response.write = (data: any) => {
    try {
      if (typeof data === 'string') {
        chunks.push(Buffer.from(data));
      } else {
        chunks.push(data);
      }
    } catch (e) {
      diag.debug(`error in response.write: ${e}`);
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
        if (shouldRecordBody(body)) {
          span.setAttribute('http.response.body', body);
        } else {
          span.setAttribute('http.response.body', SENSITIVE_DATA_SUBSTITUTE);
        }
      }
    } catch (e) {
      diag.debug(`error in response.end: ${e}`);
    }

    /* Capture Headers */
    try {
      const headers =
        splitCommaSeparatedStrings(httpCaptureHeadersServerResponse) ??
        response.getHeaderNames();
      headerCapture('response', headers)(span, (header) =>
        response.getHeader(header),
      );
    } catch (e) {
      diag.debug(
        `error parsing incoming-response headers in responseHook: ${e}`,
      );
    }
    return oldEnd(data);
  };
};

export const _handleHttpOutgoingClientResponse = (
  response: http.IncomingMessage,
  span: Span,
  shouldRecordBody: (body: string) => boolean,
  httpCaptureHeadersClientResponse?: string,
) => {
  /* Capture Headers */
  try {
    const headers =
      splitCommaSeparatedStrings(httpCaptureHeadersClientResponse) ??
      response.headers;
    headerCapture('response', Object.keys(headers))(
      span,
      (header) => headers[header],
    );
  } catch (e) {
    diag.debug(`error parsing outgoing-response headers in responseHook: ${e}`);
  }

  /* Capture Body */
  const chunks: Buffer[] = [];
  const pt = new PassThrough();
  pt.on('data', (chunk) => {
    try {
      if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk));
      } else {
        chunks.push(chunk);
      }
    } catch (e) {
      diag.debug(`error in response.on('data'): ${e}`);
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
        if (shouldRecordBody(body)) {
          span.setAttribute('http.response.body', body);
        } else {
          span.setAttribute('http.response.body', SENSITIVE_DATA_SUBSTITUTE);
        }
      }
    } catch (e) {
      diag.debug(`error in response.on('end'): ${e}`);
    }
  });
  interceptReadableStream(response, pt);
};

export const getHyperDXHTTPInstrumentationConfig = ({
  httpCaptureBodyKeywordsFilter,
  httpCaptureHeadersClientRequest,
  httpCaptureHeadersClientResponse,
  httpCaptureHeadersServerRequest,
  httpCaptureHeadersServerResponse,
}: {
  httpCaptureBodyKeywordsFilter?: string;
  httpCaptureHeadersClientRequest?: string;
  httpCaptureHeadersClientResponse?: string;
  httpCaptureHeadersServerRequest?: string;
  httpCaptureHeadersServerResponse?: string;
}) => {
  const shouldRecordBody = getShouldRecordBody(httpCaptureBodyKeywordsFilter);
  return {
    requestHook: (
      span: Span,
      request: http.ClientRequest | http.IncomingMessage,
    ) => {
      if (request instanceof http.ClientRequest) {
        // outgoing request (client)
        _handleHttpOutgoingClientRequest(
          request,
          span,
          shouldRecordBody,
          httpCaptureHeadersClientRequest,
        );
      } else {
        // incoming request (server)
        _handleHttpIncomingServerRequest(
          request,
          span,
          shouldRecordBody,
          httpCaptureHeadersServerRequest,
        );
      }
    },
    responseHook: (
      span: Span,
      response: http.ServerResponse | http.IncomingMessage,
    ) => {
      if (response instanceof http.ServerResponse) {
        // incoming response (server)
        _handleHttpIncomingServerResponse(
          response,
          span,
          shouldRecordBody,
          httpCaptureHeadersServerResponse,
        );
      } else {
        // outgoing response (client)
        _handleHttpOutgoingClientResponse(
          response,
          span,
          shouldRecordBody,
          httpCaptureHeadersClientResponse,
        );
      }
    },
  };
};
