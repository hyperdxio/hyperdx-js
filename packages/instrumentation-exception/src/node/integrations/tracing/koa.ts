import { recordException } from '../../';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setupKoaErrorHandler = (app: {
  use: (arg0: (ctx: any, next: any) => Promise<void>) => void;
}): void => {
  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      recordException(error);
    }
  });
};
