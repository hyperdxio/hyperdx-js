import type { Event, IntegrationFn } from '@sentry/types';
import { defineIntegration } from '@sentry/core';

import { getSentryRelease } from '../sdk/api';

const INTEGRATION_NAME = 'HyperDX';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface HyperDXOpionts {}

export const _hyperdxIntegration = ((options: HyperDXOpionts = {}) => {
  return {
    name: INTEGRATION_NAME,
    processEvent(event) {
      event.release = getRelease();
      const possibleEventMessages = _getPossibleEventMessages(event);
      if (possibleEventMessages.length > 0) {
        event.message = possibleEventMessages[possibleEventMessages.length - 1];
      }
      return event;
    },
  };
}) satisfies IntegrationFn;

export const hyperdxIntegration = defineIntegration(_hyperdxIntegration);

// https://github.com/getsentry/sentry-javascript/blob/41b8f7926b347c286455127f9262c4da01c68e4f/packages/node/src/sdk/index.ts#L256
function getRelease(): string | undefined {
  const detectedRelease = getSentryRelease();
  if (detectedRelease !== undefined) {
    return detectedRelease;
  }

  return undefined;
}

// https://github.com/getsentry/sentry-javascript/blob/41b8f7926b347c286455127f9262c4da01c68e4f/packages/core/src/integrations/inboundfilters.ts#L134
function _getPossibleEventMessages(event: Event): string[] {
  const possibleMessages: string[] = [];

  if (event.message) {
    possibleMessages.push(event.message);
  }

  let lastException;
  try {
    lastException = event.exception.values[event.exception.values.length - 1];
  } catch (e) {
    // try catching to save bundle size checking existence of variables
  }

  if (lastException) {
    if (lastException.value) {
      possibleMessages.push(lastException.value);
      if (lastException.type) {
        possibleMessages.push(`${lastException.type}: ${lastException.value}`);
      }
    }
  }

  return possibleMessages;
}
