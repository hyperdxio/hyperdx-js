import type { EventHint } from '@sentry/types';
import {
  InstrumentationNodeModuleDefinition,
  InstrumentationBase,
} from '@opentelemetry/instrumentation';
import { TracerProvider, diag, trace } from '@opentelemetry/api';
import { getEventProcessor } from '@hyperdx/instrumentation-sentry-node';

import { ExceptionInstrumentationConfig } from './types';
import { SENTRY_SDK_VERSION, buildEventFromException } from './sentry';
import { name as PKG_NAME, version as PKG_VERSION } from '../package.json';
import { onUncaughtExceptionIntegration } from './sentry/integrations/onuncaughtexception';
import { onUnhandledRejectionIntegration } from './sentry/integrations/onunhandledrejection';

const defaultTracer = trace.getTracer(PKG_NAME, PKG_VERSION);
const _eventProcessor = getEventProcessor(defaultTracer, SENTRY_SDK_VERSION);

export const recordException = async (e: any, hint?: EventHint) => {
  try {
    const event = await buildEventFromException(e, hint);
    _eventProcessor(
      event,
      hint ?? {
        mechanism: {
          type: 'generic',
          handled: false,
        },
      },
    );
  } catch (err) {
    diag.error('Failed to capture exception', err);
  }
};

/** Exception instrumentation for OpenTelemetry */
export class ExceptionInstrumentation extends InstrumentationBase {
  private _traceForceFlusher?: () => Promise<void>;

  constructor(config: ExceptionInstrumentationConfig = {}) {
    super(PKG_NAME, PKG_VERSION, config);
  }

  override setConfig(config: ExceptionInstrumentationConfig = {}) {
    this._config = Object.assign({}, config);
  }

  override getConfig(): ExceptionInstrumentationConfig {
    return this._config as ExceptionInstrumentationConfig;
  }

  init() {
    // nothing to do here
  }

  override setTracerProvider(tracerProvider: TracerProvider) {
    super.setTracerProvider(tracerProvider);
    this._traceForceFlusher = this._traceForceFlush(tracerProvider);
  }

  private _traceForceFlush(tracerProvider: TracerProvider) {
    if (!tracerProvider) return undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentProvider: any = tracerProvider;

    if (typeof currentProvider.getDelegate === 'function') {
      currentProvider = currentProvider.getDelegate();
    }

    if (typeof currentProvider.forceFlush === 'function') {
      return currentProvider.forceFlush.bind(currentProvider);
    }

    return undefined;
  }

  private async forceFlush() {
    const flushers = [];
    if (this._traceForceFlusher) {
      flushers.push(this._traceForceFlusher());
      // TODO: a hack to make sure we flush all
      flushers.push(new Promise((resolve) => setTimeout(resolve, 2000)));
    } else {
      diag.error(
        'Spans may not be exported for the lambda function because we are not force flushing before callback.',
      );
    }
    await Promise.all(flushers);
  }

  override enable() {
    onUncaughtExceptionIntegration({
      exitEvenIfOtherHandlersAreRegistered: true,
      forceFlush: () => this.forceFlush(),
    }).setup({} as any);
    onUnhandledRejectionIntegration({
      mode: 'warn',
      forceFlush: () => this.forceFlush(),
    }).setup({} as any);
  }

  override disable() {
    // TODO: anything to do here?
  }
}
