import _ from 'lodash';
import winston from 'winston';
// FIXME: somehow this fails in gha
// @ts-ignore
import { HyperDXWinston } from '@hyperdx/node-logger';

import { version as PKG_VERSION } from '../package.json';

const env = process.env;

const HYPERDX_API_KEY = (env.HYPERDX_API_KEY ??
  env.OTEL_EXPORTER_OTLP_HEADERS?.split('=')[1]) as string;

const SERVICE_NAME = env.OTEL_SERVICE_NAME as string;

export const getWinsonTransport = (maxLevel = 'info') => {
  return HYPERDX_API_KEY
    ? new HyperDXWinston({
        apiKey: HYPERDX_API_KEY,
        maxLevel,
        service: SERVICE_NAME,
      })
    : null;
};

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

export const init = () => {
  const MAX_LEVEL = 'debug';
  const transport = getWinsonTransport(MAX_LEVEL);

  if (transport) {
    console.warn(`[v${PKG_VERSION}] Capturing console logs...`);

    const _logger = winston.createLogger({
      level: MAX_LEVEL,
      format: winston.format.json(),
      transports: [
        getWinsonTransport(MAX_LEVEL), // append this to the existing transports
      ],
    });

    const _console = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
      // TODO: add other console methods
    };

    console.log = function (...args: any[]) {
      _logger.info(_parseConsoleArgs(args));
      _console.log.apply(console, args);
    };
    console.info = function (...args: any[]) {
      _logger.info(_parseConsoleArgs(args));
      _console.info.apply(console, args);
    };
    console.warn = function (...args: any[]) {
      _logger.warn(_parseConsoleArgs(args));
      _console.warn.apply(console, args);
    };
    console.error = function (...args: any[]) {
      _logger.error(_parseConsoleArgs(args));
      _console.error.apply(console, args);
    };
    console.debug = function (...args: any[]) {
      _logger.debug(_parseConsoleArgs(args));
      _console.debug.apply(console, args);
    };
  }
};
