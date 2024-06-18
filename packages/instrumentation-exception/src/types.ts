import { Event } from '@sentry/types';
import { InstrumentationConfig } from '@opentelemetry/instrumentation';
import { Span } from '@opentelemetry/api';

export interface EventCustomAttributeFunction {
  (span: Span, event: Event): void;
}

/**
 * Options available for the Exception Instrumentation (see [documentation]())
 */
export interface ExceptionInstrumentationConfig extends InstrumentationConfig {
  /**
   * Controls if the SDK should register a handler to exit the process on uncaught errors:
   * - `true`: The SDK will exit the process on all uncaught errors.
   * - `false`: The SDK will only exit the process when there are no other `uncaughtException` handlers attached.
   *
   * Default: `false`
   */
  exitEvenIfOtherHandlersAreRegistered?: boolean;
  /** Function for adding custom attributes on event hook */
  eventHook?: EventCustomAttributeFunction;
}
