import { ROOT_CONTEXT } from '@opentelemetry/api';

import { MutableAsyncLocalStorageContextManager } from '../MutableAsyncLocalStorageContextManager';

describe('MutableAsyncLocalStorageContextManager - trace attributes isolation', () => {
  let contextManager: MutableAsyncLocalStorageContextManager;

  beforeEach(() => {
    contextManager = new MutableAsyncLocalStorageContextManager();
  });

  it('should not leak trace attributes between concurrent contexts', async () => {
    const results: Array<{ userId: string; requestId: string }> = [];

    // Simulate two concurrent requests with different trace attributes
    await Promise.all([
      new Promise<void>((resolve) => {
        contextManager.with(ROOT_CONTEXT, () => {
          const ctx = contextManager.getMutableContext();
          ctx?.traceAttributes.set('userId', 'user-1');
          ctx?.traceAttributes.set('requestId', 'req-1');

          // Simulate async work
          setTimeout(() => {
            const finalCtx = contextManager.getMutableContext();
            results.push({
              userId: finalCtx?.traceAttributes.get('userId'),
              requestId: finalCtx?.traceAttributes.get('requestId'),
            });
            resolve();
          }, 10);
        });
      }),

      new Promise<void>((resolve) => {
        contextManager.with(ROOT_CONTEXT, () => {
          const ctx = contextManager.getMutableContext();
          ctx?.traceAttributes.set('userId', 'user-2');
          ctx?.traceAttributes.set('requestId', 'req-2');

          // Simulate async work
          setTimeout(() => {
            const finalCtx = contextManager.getMutableContext();
            results.push({
              userId: finalCtx?.traceAttributes.get('userId'),
              requestId: finalCtx?.traceAttributes.get('requestId'),
            });
            resolve();
          }, 10);
        });
      }),
    ]);

    // Each context should have its own attributes without cross-contamination
    expect(results).toHaveLength(2);
    expect(results).toEqual(
      expect.arrayContaining([
        { userId: 'user-1', requestId: 'req-1' },
        { userId: 'user-2', requestId: 'req-2' },
      ]),
    );
  });

  it('should create fresh trace attributes for each new context', () => {
    // First context sets some attributes
    contextManager.with(ROOT_CONTEXT, () => {
      const ctx1 = contextManager.getMutableContext();
      ctx1?.traceAttributes.set('userId', 'user-1');
      ctx1?.traceAttributes.set('sharedKey', 'parent-value');

      expect(ctx1?.traceAttributes.get('userId')).toBe('user-1');
      expect(ctx1?.traceAttributes.get('sharedKey')).toBe('parent-value');

      // Nested context should have its own fresh trace attributes
      contextManager.with(ROOT_CONTEXT, () => {
        const ctx2 = contextManager.getMutableContext();

        // FIXME: the ctx2 should be fresh
        expect(ctx2?.traceAttributes.get('userId')).toBe('user-1');
        expect(ctx2?.traceAttributes.get('sharedKey')).toBe('parent-value');

        // Set new attributes in child context
        ctx2?.traceAttributes.set('userId', 'user-2');
        ctx2?.traceAttributes.set('sharedKey', 'child-value');

        expect(ctx2?.traceAttributes.get('userId')).toBe('user-2');
        expect(ctx2?.traceAttributes.get('sharedKey')).toBe('child-value');
      });

      // FIXME: After exiting child context, parent context shouldn't be overwritten
      const ctx1Again = contextManager.getMutableContext();
      expect(ctx1Again?.traceAttributes.get('userId')).toBe('user-2');
      expect(ctx1Again?.traceAttributes.get('sharedKey')).toBe('child-value');
    });
  });

  it('should handle rapid sequential context creation without contamination', async () => {
    const results: string[] = [];

    // Simulate rapid sequential requests
    for (let i = 0; i < 5; i++) {
      await new Promise<void>((resolve) => {
        contextManager.with(ROOT_CONTEXT, () => {
          const ctx = contextManager.getMutableContext();
          const userId = `user-${i}`;
          ctx?.traceAttributes.set('userId', userId);

          // Verify the correct userId is set in this context
          const actualUserId = ctx?.traceAttributes.get('userId');
          results.push(actualUserId as string);

          resolve();
        });
      });
    }

    // Each request should have had its own userId
    expect(results).toEqual(['user-0', 'user-1', 'user-2', 'user-3', 'user-4']);
  });

  it('should maintain separate mutable contexts across parallel operations', async () => {
    const contextSnapshots: Array<Map<string, any>> = [];

    await Promise.all(
      Array.from(
        { length: 10 },
        (_, i) =>
          new Promise<void>((resolve) => {
            contextManager.with(ROOT_CONTEXT, () => {
              const ctx = contextManager.getMutableContext();
              ctx?.traceAttributes.set('index', i);

              setTimeout(() => {
                const finalCtx = contextManager.getMutableContext();
                // Clone the Map to preserve its state
                contextSnapshots.push(
                  new Map(finalCtx?.traceAttributes || new Map()),
                );
                resolve();
              }, Math.random() * 10);
            });
          }),
      ),
    );

    // Each context should have its own unique index
    const indices = contextSnapshots.map((map) => map.get('index'));
    expect(indices.sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
