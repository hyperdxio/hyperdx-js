import opentelemetry from '@opentelemetry/api';

import HyperDXWinston from './otel-logger/winston';

import type { HyperDXPinoOptions } from './otel-logger/pino';
import type { HyperDXWinstonOptions } from './otel-logger/winston';

import { DEFAULT_SERVICE_NAME } from './constants';
import hdx from './debug';
import { hyperDXGlobalContext } from './context';
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
  const currentActiveSpan = opentelemetry.trace.getActiveSpan();
  const traceId = currentActiveSpan?.spanContext().traceId;
  return traceId ? hyperDXGlobalContext.getTraceAttributes(traceId) : {};
};

export const getWinstonTransport = (
  maxLevel = 'info',
  options: WinstonTransportOptions = {},
) => {
  hdx('Initializing winston transport');
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
    ...options,
  },
  level: maxLevel,
});
