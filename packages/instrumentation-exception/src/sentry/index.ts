import type { Client, Event, EventHint, Integration } from '@sentry/types';
import { SDK_VERSION, inboundFiltersIntegration } from '@sentry/core';
import {
  eventFromUnknownInput,
  timestampInSeconds,
  uuid4,
} from '@sentry/utils';

import { contextLinesIntegration } from './integrations/contextlines';
import { defaultStackParser } from './sdk/api';
import { hyperdxIntegration } from './integrations/hyperdx';
import { isCjs } from './utils/commonjs';
import { localVariablesIntegration } from './integrations/local-variables';
import { modulesIntegration } from './integrations/modules';
import { nodeContextIntegration } from './integrations/context';

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

//
export const SENTRY_SDK_VERSION = SDK_VERSION;

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
