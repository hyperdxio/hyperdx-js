import { InstrumentationBase } from '@opentelemetry/instrumentation';
import { TracerProvider, diag, trace } from '@opentelemetry/api';

import { ExceptionInstrumentationConfig } from './types';
import { name as PKG_NAME, version as PKG_VERSION } from '../package.json';
import { onUncaughtExceptionIntegration } from './node/integrations/onuncaughtexception';
import { onUnhandledRejectionIntegration } from './node/integrations/onunhandledrejection';

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
    } else {
      diag.error(
        'Spans may not be exported because we are not force flushing before callback.',
      );
    }
    await Promise.all(flushers);
  }

  override enable() {
    const config = this.getConfig();
    onUncaughtExceptionIntegration({
      exitEvenIfOtherHandlersAreRegistered:
        config.exitEvenIfOtherHandlersAreRegistered,
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
