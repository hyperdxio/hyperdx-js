import * as shimmer from 'shimmer';
import _ from 'lodash';

import {
  Logger,
  LoggerOptions,
  parseWinstonLog,
} from '@hyperdx/node-logger/build/src/logger';

export const _parseConsoleArgs = (args: any[]) => {
  const stringifiedArgs = [];
  let firstJson;
  for (const arg of args) {
    if (_.isObject(arg)) {
      if (firstJson == null && _.isPlainObject(arg)) {
        firstJson = arg;
      }
      try {
        const stringifiedArg = JSON.stringify(arg);
        if (stringifiedArg != null) {
          stringifiedArgs.push(stringifiedArg);
        }
      } catch (e) {
        // ignore
      }
    } else {
      stringifiedArgs.push(arg);
    }
  }

  return firstJson
    ? {
        ...firstJson,
        // FIXME: we probably don't want to override 'message' field in firstJson
        ...(args.length > 1 && { message: stringifiedArgs.join(' ') }),
      }
    : stringifiedArgs.join(' ');
};

const ALL_HTTP_REQUEST_HEADERS = [
  'Accept',
  'Accept-Encoding',
  'Authorization',
  'Baggage',
  'Cache-Control',
  'Content-Length',
  'Content-Type',
  'Cookie',
  'Host',
  'Origin',
  'Referer',
  'Traceparent',
  'User-Agent',
  'X-Requested-With',
];

const ALL_HTTP_RESPONSE_HEADERS = [
  'Accept-Ranges',
  'Access-Control-Allow-Origin',
  'Cache-Control',
  'Content-Encoding',
  'Content-Length',
  'Content-Type',
  'Date',
  'ETag',
  'Expires',
  'Last-Modified',
  'Location',
  'Server',
  'Set-Cookie',
  'Status',
  'Vary',
  'X-Powered-By',
];

export const HyperDXHTTPInstrumentationConfig = {
  headersToSpanAttributes: {
    client: {
      requestHeaders: ALL_HTTP_REQUEST_HEADERS,
      responseHeaders: ALL_HTTP_RESPONSE_HEADERS,
    },
    server: {
      requestHeaders: ALL_HTTP_REQUEST_HEADERS,
      responseHeaders: ALL_HTTP_RESPONSE_HEADERS,
    },
  },
  requestHook: (span, request: any) => {
    const chunks = [];
    const oldWrite = request.write.bind(request);
    request.write = (data: any) => {
      chunks.push(Buffer.from(data));
      return oldWrite(data);
    };
    const oldEnd = request.end.bind(request);
    request.end = (data: any) => {
      if (data) {
        chunks.push(Buffer.from(data));
      }
      if (chunks.length > 0) {
        const body = Buffer.concat(chunks).toString('utf8');
        span.setAttribute('http.request.body', body);
      }
      return oldEnd(data);
    };
  },
  responseHook: (span, response: any) => {
    const chunks = [];
    const oldWrite = response.write.bind(response);
    response.write = (data: any) => {
      chunks.push(Buffer.from(data));
      return oldWrite(data);
    };
    const oldEnd = response.end.bind(response);
    response.end = (data: any) => {
      if (data) {
        chunks.push(Buffer.from(data));
      }
      if (chunks.length > 0) {
        const body = Buffer.concat(chunks).toString('utf8');
        span.setAttribute('http.response.body', body);
      }
      return oldEnd(data);
    };
  },
};

export class HyperDXConsoleInstrumentation {
  private readonly _logger: Logger;

  private _patchConsole(type: string, ...args: any[]) {
    let level = type;
    if (type === 'log') {
      level = 'info';
    }
    const parsedLog = parseWinstonLog({
      message: _parseConsoleArgs(args),
      level,
    });
    this._logger.postMessage(
      parsedLog.level,
      parsedLog.message,
      parsedLog.meta,
    );
  }

  private readonly _consoleLogHandler = (original: Console['log']) => {
    return (...args: any[]) => {
      this._patchConsole('log', ...args);
      return original.apply(this, args);
    };
  };

  private readonly _consoleInfoHandler = (original: Console['info']) => {
    return (...args: any[]) => {
      this._patchConsole('info', ...args);
      return original.apply(this, args);
    };
  };

  private readonly _consoleWarnHandler = (original: Console['warn']) => {
    return (...args: any[]) => {
      this._patchConsole('warn', ...args);
      return original.apply(this, args);
    };
  };

  private readonly _consoleErrorHandler = (original: Console['error']) => {
    return (...args: any[]) => {
      this._patchConsole('error', ...args);
      return original.apply(this, args);
    };
  };

  private readonly _consoleDebugHandler = (original: Console['debug']) => {
    return (...args: any[]) => {
      this._patchConsole('debug', ...args);
      return original.apply(this, args);
    };
  };

  private _onPatch(moduleExports: Console) {
    shimmer.wrap(moduleExports, 'debug', this._consoleDebugHandler);
    shimmer.wrap(moduleExports, 'log', this._consoleLogHandler);
    shimmer.wrap(moduleExports, 'info', this._consoleInfoHandler);
    shimmer.wrap(moduleExports, 'warn', this._consoleWarnHandler);
    shimmer.wrap(moduleExports, 'error', this._consoleErrorHandler);
    return moduleExports;
  }

  private _onUnPatch(moduleExports: Console) {
    shimmer.unwrap(moduleExports, 'debug');
    shimmer.unwrap(moduleExports, 'log');
    shimmer.unwrap(moduleExports, 'info');
    shimmer.unwrap(moduleExports, 'warn');
    shimmer.unwrap(moduleExports, 'error');
  }

  constructor(config: LoggerOptions) {
    this._logger = new Logger(config);
  }

  /**
   * Init method will be called when the plugin is constructed.
   * It returns an `InstrumentationNodeModuleDefinition` which describes
   *   the node module to be instrumented and patched.
   * It may also return a list of `InstrumentationNodeModuleDefinition`s if
   *   the plugin should patch multiple modules or versions.
   */
  // protected init() {
  //   const module = new InstrumentationNodeModuleDefinition<Console>(
  //     'node:console',
  //     ['*'],
  //     () => this._onPatch(console),
  //     () => this._onUnPatch(console),
  //   );
  //   return module;
  // }

  enable() {
    this._onPatch(console);
  }

  disable() {
    this._onUnPatch(console);
  }
}
