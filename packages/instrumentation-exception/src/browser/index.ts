import type { ClientOptions, Event, EventHint } from '@sentry/types';
import {
  SDK_VERSION,
  dedupeIntegration,
  functionToStringIntegration,
  inboundFiltersIntegration,
  prepareEvent,
} from '@sentry/core';
import { Span, Tracer, diag, trace } from '@opentelemetry/api';
import { getEventProcessor } from '@hyperdx/instrumentation-sentry-node';

import { browserApiErrorsIntegration } from './integrations/browserapierrors';
import { contextLinesIntegration } from './integrations/contextlines';
import { defaultStackParser } from './stack-parsers';
import { eventFromUnknownInput } from './eventbuilder';
import { globalHandlersIntegration } from './integrations/globalhandlers';
import { httpContextIntegration } from './integrations/httpcontext';
import { hyperdxIntegration } from './integrations/hyperdx';
import { linkedErrorsIntegration } from './integrations/linkederrors';
import { name as PKG_NAME, version as PKG_VERSION } from '../../package.json';

// TODO: does it make sense to have a default tracer here?
const defaultTracer = trace.getTracer(PKG_NAME, PKG_VERSION);

const defaultIntegrations = [
  hyperdxIntegration(),
  inboundFiltersIntegration(),
  contextLinesIntegration(),
  // functionToStringIntegration(),
  browserApiErrorsIntegration(),
  // globalHandlersIntegration(), // TODO: need refactoring
  linkedErrorsIntegration(),
  // dedupeIntegration(), // broken
  httpContextIntegration(),
];

const DEFAULT_CLIENT_OPTIONS: ClientOptions = {
  integrations: defaultIntegrations,
  stackParser: defaultStackParser,
  maxValueLength: 250,
  transport: {} as any,
};

const fakeClient = {
  getOptions: () => DEFAULT_CLIENT_OPTIONS,
} as any;

export const setupIntegrations = () => {
  for (const integration of defaultIntegrations) {
    integration.setupOnce?.();
    integration.setup?.(fakeClient);
  }
};

export const applyIntegrations = async (event: Event, hint?: EventHint) => {
  for (const integration of defaultIntegrations) {
    await integration.preprocessEvent?.(event, hint, fakeClient);
  }
  for (const integration of defaultIntegrations) {
    if (typeof integration.processEvent === 'function') {
      event = await integration.processEvent(event, hint, fakeClient);
    }
  }
  return event;
};

export const buildEventFromException = async (
  exception: unknown,
  hint?: EventHint,
) => {
  let event = eventFromUnknownInput(defaultStackParser, exception);
  try {
    event = await prepareEvent(DEFAULT_CLIENT_OPTIONS, event, hint);
  } catch (err) {
    diag.error('Failed to prepare event', err);
  }
  return applyIntegrations(event, hint);
};

export const recordException = async (
  e: any,
  hint?: EventHint,
  tracer?: Tracer,
  span?: Span,
) => {
  const _hint = hint ?? {
    mechanism: {
      type: 'generic',
      handled: true,
    },
  };
  try {
    const _eventProcessor = getEventProcessor(
      tracer ?? defaultTracer,
      SDK_VERSION,
    );
    const event = await buildEventFromException(e, _hint);
    _eventProcessor(event, _hint, span);
  } catch (err) {
    diag.error('Failed to capture exception', err);
  }
};
