import opentelemetry, { diag } from '@opentelemetry/api';

import {
  DEFAULT_HDX_API_KEY,
  DEFAULT_HDX_NODE_BETA_MODE,
  DEFAULT_SERVICE_NAME,
} from './constants';
import type { HyperDXPinoOptions } from './otel-logger/pino';
import * as HyperDXPino from './otel-logger/pino';
import type { HyperDXWinstonOptions } from './otel-logger/winston';
import HyperDXWinston from './otel-logger/winston';

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
  const apiKey = DEFAULT_HDX_API_KEY();
  return new HyperDXWinston({
    ...(apiKey && {
      headers: {
        Authorization: apiKey,
      },
    }),
    maxLevel,
    service: DEFAULT_SERVICE_NAME(),
    getCustomMeta: DEFAULT_HDX_NODE_BETA_MODE() ? getCustomMeta : () => ({}),
    ...options,
  });
};

// TODO: WILL BE DEPRECATED
export const getWinsonTransport = getWinstonTransport;

export const getPinoMixinFunction = HyperDXPino.getMixinFunction;
export const getPinoTransport = (
  maxLevel = 'info',
  options: PinotTransportOptions = {},
) => {
  const apiKey = DEFAULT_HDX_API_KEY();

  return {
    target: '@hyperdx/node-opentelemetry/build/src/otel-logger/pino',
    options: {
      ...(apiKey && {
        headers: {
          Authorization: apiKey,
        },
      }),
      service: DEFAULT_SERVICE_NAME(),
      // getCustomMeta, // FIXME: DOMException [DataCloneError]
      // this seems to be because pino does not allow functions in transport options
      // Ref: https://github.com/pinojs/pino/issues/1511
      ...options,
    },
    level: maxLevel,
  };
};
