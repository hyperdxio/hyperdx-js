import type {
  Client,
  ClientOptions,
  Event,
  EventHint,
  Integration,
} from '@sentry/types';
import {
  SDK_VERSION,
  inboundFiltersIntegration,
  prepareEvent,
} from '@sentry/core';
import { Span, Tracer, diag, trace } from '@opentelemetry/api';
import { eventFromUnknownInput } from '@sentry/utils';
import { getEventProcessor } from '@hyperdx/instrumentation-sentry-node';

import { contextLinesIntegration } from './integrations/contextlines';
import { defaultStackParser } from './sdk/api';
import { hyperdxIntegration } from './integrations/hyperdx';
import { isCjs } from './utils/commonjs';
import { localVariablesIntegration } from './integrations/local-variables';
import { modulesIntegration } from './integrations/modules';
import { nodeContextIntegration } from './integrations/context';
import { name as PKG_NAME, version as PKG_VERSION } from '../../package.json';

// TODO: does it make sense to have a default tracer here?
const defaultTracer = trace.getTracer(PKG_NAME, PKG_VERSION);

function getCjsOnlyIntegrations(): Integration[] {
  return isCjs() ? [modulesIntegration()] : [];
}

const defaultIntegrations = [
  hyperdxIntegration(),
  inboundFiltersIntegration(),
  contextLinesIntegration(),
  localVariablesIntegration(),
  modulesIntegration(),
  nodeContextIntegration(),
  ...getCjsOnlyIntegrations(),
];

const DEFAULT_CLIENT_OPTIONS: ClientOptions = {
  integrations: defaultIntegrations,
  stackParser: defaultStackParser,
  transport: {} as any,
};

const fakeClient = {
  getOptions: () => DEFAULT_CLIENT_OPTIONS,
} as Client;

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
  let event = eventFromUnknownInput(
    fakeClient,
    defaultStackParser,
    exception,
    hint,
  );
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
