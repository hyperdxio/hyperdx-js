import opentelemetry from '@opentelemetry/api';

// @ts-ignore
import { HyperDXWinston } from '@hyperdx/node-logger';

import hdx from './debug';
import { hyperDXGlobalContext } from './context';

const env = process.env;

const HYPERDX_API_KEY = (env.HYPERDX_API_KEY ??
  env.OTEL_EXPORTER_OTLP_HEADERS?.split('=')[1]) as string;

const SERVICE_NAME = env.OTEL_SERVICE_NAME as string;

type WinstonTransportOptions = {
  baseUrl?: string;
  bufferSize?: number;
  sendIntervalMs?: number;
  timeout?: number; // The read/write/connection timeout in milliseconds
};

type PinotTransportOptions = WinstonTransportOptions;

const getCustomMeta = () => {
  const currentActiveSpan = opentelemetry.trace.getActiveSpan();
  const traceId = currentActiveSpan?.spanContext().traceId;
  return traceId ? hyperDXGlobalContext.getTraceAttributes(traceId) : {};
};

export const getWinsonTransport = (
  maxLevel = 'info',
  options: WinstonTransportOptions = {},
) => {
  hdx('Initializing winston transport');
  return new HyperDXWinston({
    apiKey: HYPERDX_API_KEY,
    maxLevel,
    service: SERVICE_NAME,
    getCustomMeta,
    ...options,
  });
};

export const getPinoTransport = (
  maxLevel = 'info',
  options: PinotTransportOptions = {},
) => ({
  target: '@hyperdx/node-logger/build/src/pino',
  options: {
    apiKey: HYPERDX_API_KEY,
    service: SERVICE_NAME,
    // getCustomMeta, // FIXME: DOMException [DataCloneError]
    ...options,
  },
  level: maxLevel,
});
