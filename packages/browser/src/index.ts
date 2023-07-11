import Rum from '@hyperdx/otel-web';
import SessionRecorder from '@hyperdx/otel-web-session-recorder';

import type { RumOtelWebConfig } from '@hyperdx/otel-web';

type Instrumentations = RumOtelWebConfig['instrumentations'];

const URL_BASE = 'https://in-otel.hyperdx.io';

function hasWindow() {
  return typeof window !== 'undefined';
}

class Browser {
  init({
    url,
    apiKey,
    service,
    tracePropagationTargets,
    maskAllText = false,
    maskAllInputs = true,
    instrumentations = {},
    disableReplay = false,
    blockClass,
    ignoreClass,
    maskClass,
  }: {
    url?: string;
    apiKey: string;
    service: string;
    tracePropagationTargets?: (string | RegExp)[];
    maskAllText?: boolean;
    maskAllInputs?: boolean;
    instrumentations?: Instrumentations;
    disableReplay?: boolean;
    blockClass?: string;
    ignoreClass?: string;
    maskClass?: string;
  }) {
    if (!hasWindow()) {
      return;
    }

    const urlBase = url ?? URL_BASE;

    Rum.init({
      url: `${urlBase}/v1/traces`,
      allowInsecureUrl: true,
      apiKey,
      app: service,
      instrumentations: {
        fetch: {
          ...(tracePropagationTargets != null
            ? {
                propagateTraceHeaderCorsUrls: tracePropagationTargets,
              }
            : {}),
        },
        xhr: {
          ...(tracePropagationTargets != null
            ? {
                propagateTraceHeaderCorsUrls: tracePropagationTargets,
              }
            : {}),
        },
        ...instrumentations,
      },
    });

    if (disableReplay !== true) {
      SessionRecorder.init({
        url: `${urlBase}/v1/logs`,
        apiKey,
        maskTextSelector: maskAllText ? '*' : undefined,
        maskAllInputs: maskAllInputs,
        blockClass,
        ignoreClass,
        maskTextClass: maskClass,
      });
    }
  }

  setGlobalAttributes(
    attributes: Record<
      'userEmail' | 'userName' | 'teamName' | 'teamId' | string,
      string
    >,
  ) {
    if (!hasWindow()) {
      return;
    }

    Rum.setGlobalAttributes(attributes);
  }
}

export default new Browser();
