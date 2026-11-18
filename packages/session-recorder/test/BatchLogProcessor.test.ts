import { BatchLogProcessor, convert } from '../src/BatchLogProcessor';
import type { LogExporter } from '../src/types';

describe('BatchLogProcessor', () => {
  let listeners: Record<string, Array<() => void>>;
  let visibilityState: string;
  let exported: unknown[][];
  let exporter: LogExporter;

  const dispatch = (type: string) => {
    (listeners[type] || []).forEach((listener) => listener());
  };

  beforeEach(() => {
    jest.useFakeTimers();
    listeners = {};
    visibilityState = 'visible';
    exported = [];
    exporter = {
      export: (logs) => {
        exported.push(logs);
      },
    } as LogExporter;

    const addEventListener = (type: string, listener: () => void) => {
      (listeners[type] = listeners[type] || []).push(listener);
    };
    (globalThis as any).window = { addEventListener };
    (globalThis as any).document = {
      addEventListener,
      get visibilityState() {
        return visibilityState;
      },
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });

  it('does not register a deprecated unload listener', () => {
    new BatchLogProcessor(exporter, {});

    expect(listeners['unload']).toBeUndefined();
    expect(listeners['beforeunload']).toBeUndefined();
    expect(listeners['pagehide']).toHaveLength(1);
    expect(listeners['visibilitychange']).toHaveLength(1);
  });

  it('flushes queued logs on pagehide', () => {
    const processor = new BatchLogProcessor(exporter, {});
    processor.onLog(convert('test-log', 1));

    dispatch('pagehide');

    expect(exported).toHaveLength(1);
    expect(exported[0]).toHaveLength(1);
  });

  it('flushes queued logs when the page becomes hidden', () => {
    const processor = new BatchLogProcessor(exporter, {});
    processor.onLog(convert('test-log', 1));

    dispatch('visibilitychange');
    expect(exported).toHaveLength(0);

    visibilityState = 'hidden';
    dispatch('visibilitychange');
    expect(exported).toHaveLength(1);
    expect(exported[0]).toHaveLength(1);
  });
});
