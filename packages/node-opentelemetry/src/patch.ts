import _ from 'lodash';

// @ts-ignore
import { Logger, parseWinstonLog } from '@hyperdx/node-logger/build/src/logger';

import { name as PKG_NAME, version as PKG_VERSION } from '../package.json';

const LOG_PREFIX = `[${PKG_NAME} v${PKG_VERSION}]`;

const env = process.env;

const HYPERDX_API_KEY = (env.HYPERDX_API_KEY ??
  env.OTEL_EXPORTER_OTLP_HEADERS?.split('=')[1]) as string;

const SERVICE_NAME = env.OTEL_SERVICE_NAME as string;

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

export const patchConsoleLog = () => {
  if (HYPERDX_API_KEY) {
    const _logger = new Logger({
      apiKey: HYPERDX_API_KEY,
      service: SERVICE_NAME,
    });

    console.warn(`${LOG_PREFIX} Capturing console logs...`);

    const _log = (level: string, ...args: any[]) => {
      const parsedLog = parseWinstonLog({
        message: _parseConsoleArgs(args),
        level,
      });
      _logger.postMessage(parsedLog.level, parsedLog.message, parsedLog.meta);
    };

    const _console = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
      // TODO: add other console methods
    };

    console.log = function (...args: any[]) {
      _log('info', ...args);
      _console.log.apply(console, args);
    };
    console.info = function (...args: any[]) {
      _log('info', ...args);
      _console.info.apply(console, args);
    };
    console.warn = function (...args: any[]) {
      _log('warn', ...args);
      _console.warn.apply(console, args);
    };
    console.error = function (...args: any[]) {
      _log('error', ...args);
      _console.error.apply(console, args);
    };
    console.debug = function (...args: any[]) {
      _log('debug', ...args);
      _console.debug.apply(console, args);
    };
  }
};
