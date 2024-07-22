import { Span } from '@opentelemetry/api';
import { InstrumentationConfig } from '@opentelemetry/instrumentation';
import { Event } from '@sentry/types';

import type { UnhandledRejectionMode } from './node/integrations/onunhandledrejection';

export interface EventCustomAttributeFunction {
  (span: Span, event: Event): void;
}

/**
 * Options available for the Exception Instrumentation (see [documentation]())
 */
export interface ExceptionInstrumentationConfig extends InstrumentationConfig {
  // INTERNAL USE ONLY
  _internalForceFlush?: () => Promise<void>;

  /**
   * Controls if the SDK should register a handler to exit the process on uncaught errors:
   * - `true`: The SDK will exit the process on all uncaught errors.
   * - `false`: The SDK will only exit the process when there are no other `uncaughtException` handlers attached.
   *
   * Default: `false`
   */
  exitEvenIfOtherHandlersAreRegistered?: boolean;
  /**
   * Option deciding what to do after capturing unhandledRejection,
   * that mimicks behavior of node's --unhandled-rejection flag.
   */
  unhandledRejectionMode?: UnhandledRejectionMode;
  /** Function for adding custom attributes on event hook */
  eventHook?: EventCustomAttributeFunction;
}
