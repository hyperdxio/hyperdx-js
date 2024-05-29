import * as Sentry from '@sentry/node';
import { InstrumentationBase } from '@opentelemetry/instrumentation';
import { diag } from '@opentelemetry/api';
import { getEventProcessor } from '@hyperdx/instrumentation-sentry-node';

import { ExceptionInstrumentationConfig } from './types';
import { name as PKG_NAME, version as PKG_VERSION } from '../package.json';

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
    // Not instrumenting or patching a Node.js module
  }

  override enable() {
    if (Sentry.isInitialized()) {
      diag.warn(
        'Sentry is already initialized. Skipping initialization. Please use @hyperdx/instrumentation-sentry-node instead.',
      );
      return;
    }

    Sentry.init({
      dsn: 'http://public@localhost:5000/1',
      enableTracing: false,
      integrations: [
        // Common
        new Sentry.Integrations.InboundFilters(),
        new Sentry.Integrations.FunctionToString(),
        new Sentry.Integrations.LinkedErrors(),
        new Sentry.Integrations.RequestData(),
        // Global Handlers
        new Sentry.Integrations.OnUnhandledRejection(),
        new Sentry.Integrations.OnUncaughtException(),
        // Event Info
        new Sentry.Integrations.ContextLines(),
        new Sentry.Integrations.LocalVariables(),
      ],
    });
    Sentry.addEventProcessor(
      getEventProcessor(this.tracer, Sentry.SDK_VERSION),
    );
  }

  override disable() {
    // TODO: anything to do here?
  }
}
