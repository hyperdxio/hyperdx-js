/*
Copyright 2023 DeploySentinel, Inc.
Copyright 2022 Splunk Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {
  ProxyTracerProvider,
  TracerProvider,
  trace,
  Tracer,
  SpanKind,
} from '@opentelemetry/api';
import { record } from 'rrweb';
import OTLPLogExporter from './OTLPLogExporter';
import { BatchLogProcessor, convert } from './BatchLogProcessor';
import { VERSION } from './version';

import type { Resource } from '@opentelemetry/resources';
import {
  MutationRateLimiter,
  ensureStringifiedMaxMessageSize,
} from './sessionrecording-utils';

interface BasicTracerProvider extends TracerProvider {
  readonly resource: Resource;
}

type RRWebOptions = Parameters<typeof record>[0];

export type RumRecorderConfig = RRWebOptions & {
  /** Destination for the captured data */
  url?: string;

  /** API Ke */
  apiKey?: string;

  /** Debug mode */
  debug?: boolean;
};

// Hard limit of 4 hours of maximum recording during one session
const MAX_RECORDING_LENGTH = (4 * 60 + 1) * 60 * 1000;
const MAX_CHUNK_SIZE = 950 * 1024; // ~950KB
const encoder = new TextEncoder();
const decoder = new TextDecoder();

let inited: (() => void) | false | undefined = false;
let tracer: Tracer;
let lastKnownSession: string;
let sessionStartTime = 0;
let paused = false;
let eventCounter = 1;
let logCounter = 1;
let mutationRateLimiter: MutationRateLimiter | undefined;
let queuedFullSnapshotTimeout;

const RumRecorder = {
  get inited(): boolean {
    return Boolean(inited);
  },

  init(config: RumRecorderConfig): void {
    if (inited) {
      return;
    }

    if (typeof window === 'undefined') {
      console.error(
        // eslint-disable-next-line quotes
        "Session recorder can't be ran in non-browser environments",
      );
      return;
    }

    let tracerProvider: BasicTracerProvider | ProxyTracerProvider =
      trace.getTracerProvider() as BasicTracerProvider;
    if (tracerProvider && 'getDelegate' in tracerProvider) {
      tracerProvider = (
        tracerProvider as unknown as ProxyTracerProvider
      ).getDelegate() as BasicTracerProvider;
    }
    if (!tracerProvider?.resource) {
      console.error('RUM OTEL Web must be inited before recorder.');
      return;
    }

    const resource = tracerProvider.resource;

    const { apiKey, url, debug, ...rrwebConf } = config;
    tracer = trace.getTracer('rum.rr-web', VERSION);
    const span = tracer.startSpan('record init');

    // Check if sampler is ignoring this
    if (!span.isRecording()) {
      return;
    }
    span.end();

    const exportUrl = url ?? 'https://in-otel.hyperdx.io/v1/logs';
    const headers = {};
    if (apiKey) {
      headers['authorization'] = `${apiKey}`;
    }

    const exporter = new OTLPLogExporter({
      beaconUrl: exportUrl,
      debug,
      headers,
      resource,
    });
    const processor = new BatchLogProcessor(exporter, {});

    lastKnownSession = resource.attributes['rum.sessionId'] as string;
    sessionStartTime = Date.now();

    mutationRateLimiter =
      mutationRateLimiter ??
      new MutationRateLimiter(record, {
        onBlockedNode: (id, node) => {
          const message = `OpenTelemetry Session Recorder: Rate limiting recording mutations on node ${id}. This can be due to excessive animations.`;

          // Construct a span for the warning message
          const now = Date.now();
          const span = tracer.startSpan('console.warn', {
            kind: SpanKind.INTERNAL,
            startTime: now,
          });
          span.setAttribute('component', 'console');
          span.setAttribute('level', 'warn');
          span.setAttribute('message', message);
          span.end(now);

          if (debug) {
            console.warn(message, node);
          }

          clearTimeout(queuedFullSnapshotTimeout);
          queuedFullSnapshotTimeout = setTimeout(() => {
            // Take a full snapshot to capture more accurate final mutation state
            // This is only fired once per node, so we can still miss the outcome
            // of repeated mutations
            record.takeFullSnapshot();
          }, 1000);
        },
      });

    inited = record({
      maskAllInputs: true,
      maskTextSelector: '*',
      ...rrwebConf,
      emit(srcEvent) {
        if (paused) {
          return;
        }

        // Safeguards from our ingest getting DDOSed:
        // 1. A session can send up to 4 hours of data
        // 2. Recording resumes on session change if it isn't a background tab (session regenerated in an another tab)
        if (resource.attributes['rum.sessionId'] !== lastKnownSession) {
          if (document.hidden) {
            return;
          }
          lastKnownSession = resource.attributes['rum.sessionId'] as string;
          sessionStartTime = Date.now();
          // reset counters
          eventCounter = 1;
          logCounter = 1;
          record.takeFullSnapshot();
        }

        if (srcEvent.timestamp > sessionStartTime + MAX_RECORDING_LENGTH) {
          return;
        }

        const event = mutationRateLimiter
          ? mutationRateLimiter.throttleMutations(srcEvent)
          : srcEvent;

        if (!event) {
          return;
        }

        const time = event.timestamp;
        const eventI = eventCounter++;
        // Research found that stringifying the rr-web event here is
        // more efficient for otlp + gzip exporting

        // Blob is unicode aware for size calculation (eg emoji.length = 1 vs blob.size() = 4)
        const body = encoder.encode(
          ensureStringifiedMaxMessageSize(JSON.stringify(event)),
        );
        const totalC = Math.ceil(body.byteLength / MAX_CHUNK_SIZE);
        for (let i = 0; i < totalC; i++) {
          const start = i * MAX_CHUNK_SIZE;
          const end = (i + 1) * MAX_CHUNK_SIZE;
          const log = convert(decoder.decode(body.slice(start, end)), time, {
            'rr-web.offset': logCounter++,
            'rr-web.event': eventI,
            'rr-web.chunk': i + 1,
            'rr-web.total-chunks': totalC,
          });
          if (debug) {
            console.log(log);
          }
          processor.onLog(log);
        }
      },
    });
  },
  resume(): void {
    if (!inited) {
      return;
    }

    const oldPaused = paused;
    paused = false;
    if (!oldPaused) {
      record.takeFullSnapshot();
      tracer.startSpan('record resume').end();
    }
  },
  stop(): void {
    if (!inited) {
      return;
    }

    if (paused) {
      tracer.startSpan('record stop').end();
    }

    paused = true;
  },
  deinit(): void {
    if (!inited) {
      return;
    }

    inited();
    inited = false;
  },
};

export default RumRecorder;
