import { HyperDXWinston } from '@hyperdx/node-logger';

const env = process.env;

const HYPERDX_API_KEY = (env.HYPERDX_API_KEY ??
  env.OTEL_EXPORTER_OTLP_HEADERS?.split('=')[1]) as string;

const SERVICE_NAME = env.OTEL_SERVICE_NAME as string;

export const getWinsonTransport = (maxLevel = 'info') => {
  return HYPERDX_API_KEY
    ? new HyperDXWinston({
        baseUrl: 'http://localhost:8002',
        apiKey: HYPERDX_API_KEY,
        maxLevel,
        service: SERVICE_NAME,
      })
    : null;
};
