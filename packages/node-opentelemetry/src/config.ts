const env = process.env;

export const HYPERDX_API_KEY = (env.HYPERDX_API_KEY ??
  env.OTEL_EXPORTER_OTLP_HEADERS?.split('=')[1]) as string;

export const SERVICE_NAME = env.OTEL_SERVICE_NAME as string;
