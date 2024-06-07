import isObject from 'lodash.isobject';
import isPlainObject from 'lodash.isplainobject';
import opentelemetry, { Attributes } from '@opentelemetry/api';
import {
  InstrumentationBase,
  InstrumentationConfig,
  InstrumentationNodeModuleDefinition,
} from '@opentelemetry/instrumentation';

import { Logger, LoggerOptions } from '../otel-logger';
import { parseWinstonLog } from '../otel-logger/winston';
import { MutableAsyncLocalStorageContextManager } from '../MutableAsyncLocalStorageContextManager';

const PACKAGE_NAME = '@hyperdx/instrumentation-console';
const PACKAGE_VERSION = '0.1.0';

export const _parseConsoleArgs = (args: any[]) => {
  const stringifiedArgs: any[] = [];
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

export interface HyperDXConsoleInstrumentationConfig
  extends InstrumentationConfig {
  betaMode: boolean;
  loggerOptions: LoggerOptions;
  contextManager?: MutableAsyncLocalStorageContextManager;
}

export default class HyperDXConsoleInstrumentation extends InstrumentationBase {
  private readonly _hdxLogger: Logger;
  private readonly _contextManager: MutableAsyncLocalStorageContextManager;

  private _patchConsole(type: string, ...args: any[]) {
    const instrumentation = this;
    const config =
      instrumentation.getConfig() as HyperDXConsoleInstrumentationConfig;
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

      if (config.betaMode) {
        if (this._contextManager) {
          meta = {
            ...meta,
            // attach custom attributes
            ...Object.fromEntries(
              this._contextManager.getMutableContext()?.traceAttributes ?? [],
            ),
          };
        }
      }

      instrumentation._hdxLogger.postMessage(
        parsedLog.level,
        parsedLog.message,
        meta,
      );
    } catch (e) {
      // ignore
    }
  }

  private readonly _consoleLogHandler = (original: Console['log']) => {
    const instrumentation = this;
    return (...args: any[]) => {
      instrumentation._patchConsole('log', ...args);
      return original.apply(this, args);
    };
  };

  private readonly _consoleInfoHandler = (original: Console['info']) => {
    const instrumentation = this;
    return (...args: any[]) => {
      instrumentation._patchConsole('info', ...args);
      return original.apply(this, args);
    };
  };

  private readonly _consoleWarnHandler = (original: Console['warn']) => {
    const instrumentation = this;
    return (...args: any[]) => {
      instrumentation._patchConsole('warn', ...args);
      return original.apply(this, args);
    };
  };

  private readonly _consoleErrorHandler = (original: Console['error']) => {
    const instrumentation = this;
    return (...args: any[]) => {
      instrumentation._patchConsole('error', ...args);
      return original.apply(this, args);
    };
  };

  private readonly _consoleDebugHandler = (original: Console['debug']) => {
    const instrumentation = this;
    return (...args: any[]) => {
      instrumentation._patchConsole('debug', ...args);
      return original.apply(this, args);
    };
  };

  private _onPatch(moduleExports: Console) {
    this._wrap(moduleExports, 'debug', this._consoleDebugHandler);
    this._wrap(moduleExports, 'log', this._consoleLogHandler);
    this._wrap(moduleExports, 'info', this._consoleInfoHandler);
    this._wrap(moduleExports, 'warn', this._consoleWarnHandler);
    this._wrap(moduleExports, 'error', this._consoleErrorHandler);
    return moduleExports;
  }

  private _onUnPatch(moduleExports: Console) {
    this._unwrap(moduleExports, 'debug');
    this._unwrap(moduleExports, 'log');
    this._unwrap(moduleExports, 'info');
    this._unwrap(moduleExports, 'warn');
    this._unwrap(moduleExports, 'error');
  }

  constructor(config: HyperDXConsoleInstrumentationConfig) {
    super(PACKAGE_NAME, PACKAGE_VERSION, config);
    this._hdxLogger = new Logger(config.loggerOptions);
    this._contextManager = config.contextManager;
  }

  init() {
    return [
      new InstrumentationNodeModuleDefinition(
        'console',
        ['*'],
        (moduleExports: Console) => {
          this._onPatch(moduleExports);
          return moduleExports;
        },
        (moduleExports: Console) => {
          this._onUnPatch(moduleExports);
          return moduleExports;
        },
      ),
    ];
  }
}
