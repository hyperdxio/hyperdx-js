import * as SentryTypesV7 from '@sentry/types-v7';
import * as SentryTypesV8 from '@sentry/types-v8';
import { InstrumentationConfig } from '@opentelemetry/instrumentation';
import { Span } from '@opentelemetry/api';

export type Event = SentryTypesV7.Event | SentryTypesV8.Event;
export type EventHint = SentryTypesV7.EventHint | SentryTypesV8.EventHint;
export type Exception = SentryTypesV7.Exception | SentryTypesV8.Exception;

export interface EventCustomAttributeFunction {
  (span: Span, event: Event): void;
}

/**
 * Options available for the Exception Instrumentation (see [documentation]())
 */
export interface SentryNodeInstrumentationConfig extends InstrumentationConfig {
  /** Function for adding custom attributes on event hook */
  eventHook?: EventCustomAttributeFunction;
}
