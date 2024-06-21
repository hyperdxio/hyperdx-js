import { diag } from '@opentelemetry/api';
import {
  InstrumentationBase,
  InstrumentationNodeModuleDefinition,
} from '@opentelemetry/instrumentation';
import Sentry from '@sentry/node';

import { SentryNodeInstrumentationConfig } from './types';
import { hyperdxIntegration } from './hyperdxIntegration';
import { name as PKG_NAME, version as PKG_VERSION } from '../package.json';

/** Sentry instrumentation for OpenTelemetry */
export class SentryNodeInstrumentation extends InstrumentationBase {
  constructor(config: SentryNodeInstrumentationConfig = {}) {
    super(PKG_NAME, PKG_VERSION, config);
  }

  override setConfig(config: SentryNodeInstrumentationConfig = {}) {
    this._config = Object.assign({}, config);
  }

  override getConfig(): SentryNodeInstrumentationConfig {
    return this._config as SentryNodeInstrumentationConfig;
  }

  init() {
    return [
      new InstrumentationNodeModuleDefinition(
        '@sentry/node',
        ['>=7.30.0 <9'],
        (moduleExports: typeof Sentry) => {
          diag.debug(
            `Detected Sentry installed with SDK version: ${moduleExports.SDK_VERSION}`,
          );
          this._wrap(moduleExports, 'init', (original: any) => {
            return (...args: any[]) => {
              const result = original.apply(this, args);
              // WARNING: we need to add the integration once the SDK is initialized
              moduleExports.addIntegration(hyperdxIntegration());
              diag.debug('Added HyperDX Sentry integration.');
              return result;
            };
          });
          return moduleExports;
        },
        (moduleExports) => {
          // TODO: do we need to remove the event processor?
        },
      ),
    ];
  }
}
