import { getEventProcessor } from '@hyperdx/instrumentation-sentry-node';
import { Attributes, diag, Span, trace, Tracer } from '@opentelemetry/api';
import { inboundFiltersIntegration, prepareEvent } from '@sentry/core';
import type {
  Client,
  ClientOptions,
  Event,
  EventHint,
  Integration,
} from '@sentry/types';
import { eventFromUnknownInput } from '@sentry/utils';

import { name as PKG_NAME, version as PKG_VERSION } from '../../package.json';
import { nodeContextIntegration } from './integrations/context';
import { contextLinesIntegration } from './integrations/contextlines';
import { hyperdxIntegration } from './integrations/hyperdx';
import { localVariablesIntegration } from './integrations/local-variables';
import { modulesIntegration } from './integrations/modules';
import { defaultStackParser } from './sdk/api';
import { isCjs } from './utils/commonjs';

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
  hint?: EventHint & {
    tracer?: Tracer;
    span?: Span;
    attributes?: Attributes;
  },
) => {
  try {
    const { tracer, span, attributes, ...eventHint } = hint ?? {};
    const _hint =
      Object.keys(eventHint).length > 0
        ? eventHint
        : {
            mechanism: {
              type: 'generic',
              handled: true,
            },
          };
    const _eventProcessor = getEventProcessor(tracer ?? defaultTracer);
    const event = await buildEventFromException(e, {
      data: _hint,
    });
    _eventProcessor(event, _hint, span, attributes);
  } catch (err) {
    diag.error('Failed to capture exception', err);
  }
};
