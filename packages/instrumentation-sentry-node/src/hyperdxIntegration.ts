import type { IntegrationFn } from '@sentry/types-v8';

import { getEventProcessor } from './eventProcessor';
import type { Event, EventHint } from './types';

const defineIntegration = (fn: any) => fn;

const INTEGRATION_NAME = 'HyperDX';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface HyperDXOpionts {}

export const _hyperdxIntegration = ((options: HyperDXOpionts = {}) => {
  return {
    name: INTEGRATION_NAME,
    // TODO v8: Remove this
    setupOnce() {}, // eslint-disable-line @typescript-eslint/no-empty-function
    setup(client) {
      if (!client.on) {
        return;
      }
      const sdkMetadata = client.getSdkMetadata();

      const processor = getEventProcessor(undefined, sdkMetadata.sdk?.version);

      client.on('beforeSendEvent', (event: Event, hint?: EventHint) => {
        processor(event, hint);
      });
    },
  };
}) satisfies IntegrationFn;

export const hyperdxIntegration = defineIntegration(_hyperdxIntegration);
