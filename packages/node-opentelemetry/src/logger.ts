// FIXME: somehow it fails in gha
// @ts-ignore
import { HyperDXWinston } from '@hyperdx/node-logger';
import winston from 'winston';

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

export const init = () => {
  const MAX_LEVEL = 'debug';
  const transport = getWinsonTransport(MAX_LEVEL);

  if (transport) {
    console.warn(`[v${PKG_VERSION}] Capturing consle logs...`);

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
      _logger.info(args);
      _console.log.apply(console, args);
    };
    console.info = function (...args: any[]) {
      _logger.info(args);
      _console.info.apply(console, args);
    };
    console.warn = function (...args: any[]) {
      _logger.warn(args);
      _console.warn.apply(console, args);
    };
    console.error = function (...args: any[]) {
      _logger.error(args);
      _console.error.apply(console, args);
    };
    console.debug = function (...args: any[]) {
      _logger.debug(args);
      _console.debug.apply(console, args);
    };
  }
};
