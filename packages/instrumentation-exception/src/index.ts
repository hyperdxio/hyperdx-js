export { recordException } from './node';
export * from './instrumentation';
export * from './types';

// 3rd-party integrations
export { setupExpressErrorHandler } from './node/integrations/tracing/express';
export { setupKoaErrorHandler } from './node/integrations/tracing/koa';
