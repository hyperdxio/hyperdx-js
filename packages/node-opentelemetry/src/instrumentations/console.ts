import * as shimmer from 'shimmer';
import isObject from 'lodash.isobject';
import isPlainObject from 'lodash.isplainobject';
import opentelemetry, { Attributes, diag } from '@opentelemetry/api';

import { Logger, LoggerOptions } from '../otel-logger';
import { hyperDXGlobalContext } from '../context';
import { parseWinstonLog } from '../otel-logger/winston';

export const _parseConsoleArgs = (args: any[]) => {
  const stringifiedArgs = [];
  let firstJson;
  for (const arg of args) {
    if (isObject(arg)) {
      if (firstJson == null && isPlainObject(arg)) {
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

export default class HyperDXConsoleInstrumentation {
  private readonly betaMode: boolean;

  private readonly _logger: Logger;

  private _patchConsole(type: string, ...args: any[]) {
    let level = type;
    if (type === 'log') {
      level = 'info';
    }
    try {
      const parsedLog = parseWinstonLog({
        message: _parseConsoleArgs(args),
        level,
      });

      const currentActiveSpan = opentelemetry.trace.getActiveSpan();
      const traceId = currentActiveSpan?.spanContext().traceId;

      let meta: Attributes = {
        ...parsedLog.meta,
        // attached traceId and spanId,
        trace_id: traceId,
        span_id: currentActiveSpan?.spanContext().spanId,
      };

      if (this.betaMode) {
        const attributes = traceId
          ? hyperDXGlobalContext.getTraceAttributes(traceId)
          : {};
        meta = {
          ...meta,
          // attach custom attributes
          ...attributes,
        };
      }
      this._logger.postMessage(parsedLog.level, parsedLog.message, meta);
    } catch (e) {
      diag.debug('error in _patchConsole', e);
    }
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

  constructor(config: LoggerOptions & { betaMode: boolean }) {
    this.betaMode = config.betaMode;
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
