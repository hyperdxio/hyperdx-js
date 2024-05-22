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
  /** Function for adding custom attributes on event hook */
  eventHook?: EventCustomAttributeFunction;
}
