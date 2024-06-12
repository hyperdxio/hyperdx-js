import opentelemetry, { diag } from '@opentelemetry/api';

import HyperDXWinston from './otel-logger/winston';

import type { HyperDXPinoOptions } from './otel-logger/pino';
import type { HyperDXWinstonOptions } from './otel-logger/winston';

import { DEFAULT_SERVICE_NAME } from './constants';
import { stringToBoolean } from './utils';

const env = process.env;

const HYPERDX_API_KEY = env.HYPERDX_API_KEY;

const BETA_MODE = stringToBoolean(env.HDX_NODE_BETA_MODE);

type WinstonTransportOptions = Omit<
  HyperDXWinstonOptions,
  'apiKey' | 'getCustomMeta' | 'resourceAttributes'
>;

type PinotTransportOptions = Omit<
  HyperDXPinoOptions,
  'apiKey' | 'getCustomMeta' | 'resourceAttributes'
>;

const getCustomMeta = () => {
  //@ts-ignore
  const contextManager = opentelemetry.context?._getContextManager();
  if (typeof contextManager?.getMutableContext === 'function') {
    const mutableContext = contextManager.getMutableContext();
    if (mutableContext?.traceAttributes != null) {
      return Object.fromEntries(mutableContext.traceAttributes);
    }
  }

  return {};
};

export const getWinstonTransport = (
  maxLevel = 'info',
  options: WinstonTransportOptions = {},
) => {
  diag.debug('Initializing winston transport');
  return new HyperDXWinston({
    ...(HYPERDX_API_KEY && {
      headers: {
        Authorization: HYPERDX_API_KEY,
      },
    }),
    maxLevel,
    service: DEFAULT_SERVICE_NAME,
    getCustomMeta: BETA_MODE ? getCustomMeta : () => ({}),
    ...options,
  });
};

// TODO: WILL BE DEPRECATED
export const getWinsonTransport = getWinstonTransport;

export const getPinoTransport = (
  maxLevel = 'info',
  options: PinotTransportOptions = {},
) => ({
  target: '@hyperdx/node-opentelemetry/build/src/otel-logger/pino',
  options: {
    ...(HYPERDX_API_KEY && {
      headers: {
        Authorization: HYPERDX_API_KEY,
      },
    }),
    service: DEFAULT_SERVICE_NAME,
    // getCustomMeta, // FIXME: DOMException [DataCloneError]
    // this seems to be because pino does not allow functions in transport options
    // Ref: https://github.com/pinojs/pino/issues/1511
    ...options,
  },
  level: maxLevel,
});
