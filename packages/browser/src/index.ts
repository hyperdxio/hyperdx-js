import Rum from '@hyperdx/otel-web';
import SessionRecorder from '@hyperdx/otel-web-session-recorder';
import opentelemetry, { Attributes } from '@opentelemetry/api';

import type { RumOtelWebConfig } from '@hyperdx/otel-web';
import { resolveAsyncGlobal } from './utils';

type Instrumentations = RumOtelWebConfig['instrumentations'];

const URL_BASE = 'https://in-otel.hyperdx.io';
const UI_BASE = 'https://www.hyperdx.io';

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
    disableIntercom = false,
    captureConsole = false,
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
    disableIntercom?: boolean;
    captureConsole?: boolean;
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
        visibility: true,
        console: captureConsole,
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

    const tracer = opentelemetry.trace.getTracer('@hyperdx/browser');

    if (disableIntercom !== true) {
      resolveAsyncGlobal('Intercom')
        .then(() => {
          window.Intercom('onShow', () => {
            const sessionUrl = this.getSessionUrl();
            if (sessionUrl != null) {
              const metadata = {
                hyperdxSessionUrl: sessionUrl,
              };

              // Use window.Intercom directly to avoid stale references
              window.Intercom('update', metadata);
              window.Intercom('trackEvent', 'HyperDX', metadata);

              const now = Date.now();

              const span = tracer.startSpan('intercom.onShow', {
                startTime: now,
              });
              span.setAttribute('component', 'intercom');
              span.end(now);
            }
          });
        })
        .catch(() => {
          // Ignore if intercom isn't installed or can't be used
        });
    }
  }

  addAction(name: string, attributes?: Attributes) {
    if (!hasWindow()) {
      return;
    }

    Rum.addAction(name, attributes);
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

  getSessionUrl(): string | undefined {
    const now = Date.now();
    // A session can only last 4 hours, so we just need to give a time hint of
    // a 4 hour range
    const FOUR_HOURS = 1000 * 60 * 60 * 4;
    const start = now - FOUR_HOURS;
    const end = now + FOUR_HOURS;

    return Rum.inited
      ? `${UI_BASE}/sessions?q=process.tag.rum.sessionId%3A"${Rum.getSessionId()}"&sid=${Rum.getSessionId()}&sfrom=${start}&sto=${end}&ts=${now}`
      : undefined;
  }
}

export default new Browser();
