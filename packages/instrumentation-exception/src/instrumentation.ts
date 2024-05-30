import type { EventHint } from '@sentry/types';
import {
  InstrumentationNodeModuleDefinition,
  InstrumentationBase,
} from '@opentelemetry/instrumentation';
import api, { diag, trace } from '@opentelemetry/api';
import { getEventProcessor } from '@hyperdx/instrumentation-sentry-node';

import { ExceptionInstrumentationConfig } from './types';
import { SENTRY_SDK_VERSION, buildEventFromException } from './sentry';
import { name as PKG_NAME, version as PKG_VERSION } from '../package.json';
import { onUncaughtExceptionIntegration } from './sentry/integrations/onuncaughtexception';
import { onUnhandledRejectionIntegration } from './sentry/integrations/onunhandledrejection';

const defaultTracer = trace.getTracer(PKG_NAME, PKG_VERSION);

export const captureException = async (e: any, hint?: EventHint) => {
  try {
    const event = await buildEventFromException(e, hint);
    const eventProcessor = getEventProcessor(defaultTracer, SENTRY_SDK_VERSION);
    eventProcessor(
      event as any,
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

  override enable() {
    onUncaughtExceptionIntegration({
      exitEvenIfOtherHandlersAreRegistered: true,
      captureException,
    }).setup({} as any);
    onUnhandledRejectionIntegration({
      mode: 'warn',
      captureException,
    }).setup({} as any);
  }

  override disable() {
    // TODO: anything to do here?
  }
}
