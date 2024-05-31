import { diag } from '@opentelemetry/api';

const DEFAULT_SHUTDOWN_TIMEOUT = 2000;

class TimeoutError extends Error {
  constructor() {
    super('Timeout');
    this.name = 'TimeoutError';
  }
}

const timeoutPromise = (timeout: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new TimeoutError());
    }, timeout);
  });
};

export async function logAndExitProcess(
  error: Error,
  forceFlush: () => Promise<void>,
): Promise<void> {
  diag.error('Exiting process due to fatal error', error);

  try {
    await Promise.race([
      forceFlush(),
      timeoutPromise(DEFAULT_SHUTDOWN_TIMEOUT),
    ]);
    global.process.exit(1);
  } catch (error) {
    if (error instanceof TimeoutError) {
      diag.error('Timeout while flushing events, forcing exit');
    }
    diag.error('Error while flushing events', error);
    // maybe we should exit anyway? or should we wait for the flush?
    global.process.exit(1);
  }
}
