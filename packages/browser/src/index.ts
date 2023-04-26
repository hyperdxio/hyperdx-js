import Rum from '@hyperdx/otel-web';
import SessionRecorder from '@hyperdx/otel-web-session-recorder';

const URL_BASE = 'https://otel-in.hyperdx.io';

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
  }: {
    url?: string;
    apiKey: string;
    service: string;
    tracePropagationTargets?: (string | RegExp)[];
    maskAllText?: boolean;
    maskAllInputs?: boolean;
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
      ...(tracePropagationTargets != null
        ? {
            instrumentations: {
              fetch: {
                propagateTraceHeaderCorsUrls: tracePropagationTargets,
              },
            },
          }
        : {}),
    });

    SessionRecorder.init({
      url: `${urlBase}/v1/logs`,
      apiKey,
      maskTextSelector: maskAllText ? '*' : undefined,
      maskAllInputs: maskAllInputs,
    });
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
