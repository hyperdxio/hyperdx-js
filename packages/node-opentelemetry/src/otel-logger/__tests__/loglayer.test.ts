import { LogLayer, LogLevel } from 'loglayer';

import { getLogLayerTransport } from '../../logger';

describe('LogLayer transport', () => {
  it('should initialize and send logs', () => {
    const logger = new LogLayer({
      transport: getLogLayerTransport(),
    });

    // Test basic logging
    logger.info('test message');
    logger.error('error message');
    logger.warn('warning message');
    logger.debug('debug message');
  });

  it('should handle metadata', () => {
    const logger = new LogLayer({
      transport: getLogLayerTransport(),
    });

    // Test with metadata
    logger.withMetadata({ service: 'test' }).info('message with metadata');

    // Test with multiple metadata calls
    logger
      .withMetadata({ service: 'test' })
      .withMetadata({ requestId: '123' })
      .info('message with multiple metadata');
  });

  it('should handle transport cleanup', () => {
    const logger = new LogLayer({
      transport: getLogLayerTransport(),
    });

    // Send some logs
    logger.info('test message');

    // Clean up the transport
    logger.withFreshTransports([]);

    // This should not throw
    logger.info('message after cleanup');
  });

  it('should respect maxLevel', () => {
    const logger = new LogLayer({
      transport: getLogLayerTransport(LogLevel.warn),
    });

    // These should be filtered out
    logger.trace('trace message');
    logger.debug('debug message');
    logger.info('info message');

    // These should be sent
    logger.warn('warning message');
    logger.error('error message');
    logger.fatal('fatal message');
  });
});
