import type { Client, Event, EventHint, Integration } from '@sentry/types';
import { SDK_VERSION, inboundFiltersIntegration } from '@sentry/core';
import { diag, trace } from '@opentelemetry/api';
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
const _eventProcessor = getEventProcessor(defaultTracer, SDK_VERSION);

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

const fakeClient = {
  getOptions: () => ({}),
} as Client;

export const setupIntegrations = () => {
  for (const integration of defaultIntegrations) {
    integration.setupOnce?.();
    integration.setup?.(fakeClient);
  }
};

export const applyIntegrations = async (event: Event, hint?: EventHint) => {
  for (const integration of defaultIntegrations) {
    event = await integration.processEvent?.(event, hint, fakeClient);
  }
  return event;
};

export const buildEventFromException = async (
  exception: unknown,
  hint?: EventHint,
) => {
  const event = eventFromUnknownInput(
    fakeClient,
    defaultStackParser,
    exception,
    hint,
  );
  return applyIntegrations(event, hint);
};

export const recordException = async (e: any, hint?: EventHint) => {
  try {
    const event = await buildEventFromException(e, hint);
    _eventProcessor(
      event,
      hint ?? {
        mechanism: {
          type: 'generic',
          handled: false,
        },
      },
    );
  } catch (err) {
    diag.error('Failed to capture exception', err);
  }
};
