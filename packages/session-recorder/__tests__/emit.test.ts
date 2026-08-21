import type { eventWithTime } from '@rrweb/types';

// MutationRateLimiter starts a setInterval that is never cleared; fake
// timers keep it from holding the jest process open
jest.useFakeTimers();
jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));

const mockOnLog = jest.fn();
const mockStopRecording = jest.fn();
let capturedEmit: ((event: eventWithTime) => void) | undefined;

jest.mock('rrweb', () => ({
  record: Object.assign(
    jest.fn((options: { emit: (event: eventWithTime) => void }) => {
      capturedEmit = options.emit;
      return mockStopRecording;
    }),
    {
      takeFullSnapshot: jest.fn(),
      mirror: { getNode: jest.fn(), getId: jest.fn() },
    },
  ),
}));

jest.mock('../src/OTLPLogExporter', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../src/BatchLogProcessor', () => ({
  BatchLogProcessor: jest.fn().mockImplementation(() => ({ onLog: mockOnLog })),
  convert: jest.fn((body: string) => ({ body })),
}));

jest.mock('@opentelemetry/api', () => {
  const actual = jest.requireActual('@opentelemetry/api');
  const span = {
    isRecording: () => true,
    setAttribute: jest.fn(),
    end: jest.fn(),
  };
  return {
    ...actual,
    trace: {
      ...actual.trace,
      getTracerProvider: () => ({
        resource: { attributes: { 'rum.sessionId': 'session-1' } },
      }),
      getTracer: () => ({ startSpan: () => span }),
    },
  };
});

jest.mock('../src/sessionrecording-utils', () => {
  const actual = jest.requireActual('../src/sessionrecording-utils');
  return { ...actual, splitIntoChunks: jest.fn(actual.splitIntoChunks) };
});

import { diag } from '@opentelemetry/api';

import RumRecorder from '../src';
import { splitIntoChunks } from '../src/sessionrecording-utils';

const mockSplitIntoChunks = splitIntoChunks as jest.Mock;

const emitEvent = () =>
  capturedEmit!({
    type: 4,
    data: {},
    timestamp: Date.now(),
  } as eventWithTime);

const failEmit = () =>
  mockSplitIntoChunks.mockImplementation(() => {
    throw new RangeError('Bad value');
  });

const restoreEmit = () =>
  mockSplitIntoChunks.mockImplementation(
    jest.requireActual('../src/sessionrecording-utils').splitIntoChunks,
  );

describe('emit error handling', () => {
  let diagError: jest.SpyInstance;

  beforeAll(() => {
    // init() bails outside the browser; a bare window/document is enough
    // for the code paths under test
    (global as any).window = {};
    (global as any).document = { hidden: false };
    diagError = jest.spyOn(diag, 'error').mockImplementation(() => {});
  });

  beforeEach(() => {
    RumRecorder.deinit();
    jest.clearAllMocks();
    restoreEmit();
    RumRecorder.init({});
  });

  afterAll(() => {
    diagError.mockRestore();
    delete (global as any).window;
    delete (global as any).document;
  });

  it('processes events while emit succeeds', () => {
    expect(capturedEmit).toBeInstanceOf(Function);
    emitEvent();
    expect(mockOnLog).toHaveBeenCalledTimes(1);
  });

  it('swallows emit failures instead of throwing into rrweb', () => {
    failEmit();
    for (let i = 0; i < 9; i++) {
      expect(emitEvent).not.toThrow();
    }
    expect(mockOnLog).not.toHaveBeenCalled();
    expect(mockStopRecording).not.toHaveBeenCalled();
    // every dropped event is surfaced, but the breaker has not tripped
    expect(diagError).toHaveBeenCalledTimes(9);
    expect(diagError).not.toHaveBeenCalledWith(
      expect.stringContaining('stopping recording'),
      expect.anything(),
    );
  });

  it('stops recording after 10 consecutive failures', () => {
    failEmit();
    for (let i = 0; i < 10; i++) {
      expect(emitEvent).not.toThrow();
    }
    expect(mockStopRecording).toHaveBeenCalledTimes(1);
    expect(diagError).toHaveBeenCalledWith(
      expect.stringContaining('stopping recording'),
      expect.any(RangeError),
    );
  });

  it('emits nothing after the circuit breaker trips', () => {
    failEmit();
    for (let i = 0; i < 10; i++) {
      emitEvent();
    }
    restoreEmit();
    emitEvent();
    expect(mockOnLog).not.toHaveBeenCalled();
  });

  it('records again after a re-init following a breaker trip', () => {
    failEmit();
    for (let i = 0; i < 10; i++) {
      emitEvent();
    }
    expect(RumRecorder.inited).toBe(false);

    restoreEmit();
    RumRecorder.init({});
    emitEvent();
    expect(mockOnLog).toHaveBeenCalledTimes(1);
    expect(mockStopRecording).toHaveBeenCalledTimes(1);
  });
});
