// @ts-ignore
import { HyperDXWinston } from '@hyperdx/node-logger';

const env = process.env;

const HYPERDX_API_KEY = (env.HYPERDX_API_KEY ??
  env.OTEL_EXPORTER_OTLP_HEADERS?.split('=')[1]) as string;

const SERVICE_NAME = env.OTEL_SERVICE_NAME as string;

export const getWinsonTransport = (maxLevel = 'info') =>
  new HyperDXWinston({
    apiKey: HYPERDX_API_KEY,
    maxLevel,
    service: SERVICE_NAME,
  });

export const getPinoTransport = (maxLevel = 'info') => ({
  transport: '@hyperdx/node-logger/build/src/pino',
  options: {
    apiKey: HYPERDX_API_KEY,
    service: SERVICE_NAME,
  },
  level: maxLevel,
});
