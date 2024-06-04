export { recordException } from './node';
export * from './instrumentation';
export * from './types';

// error handlers
export { setupExpressErrorHandler } from './node/integrations/tracing/express';
export { setupKoaErrorHandler } from './node/integrations/tracing/koa';
