import Rum from '@hyperdx/otel-web';
import SessionRecorder from '@hyperdx/otel-web-session-recorder';
import opentelemetry, { Attributes } from '@opentelemetry/api';

import { resolveAsyncGlobal } from './utils';

import type { RumOtelWebConfig } from '@hyperdx/otel-web';

type Instrumentations = RumOtelWebConfig['instrumentations'];
type IgnoreUrls = RumOtelWebConfig['ignoreUrls'];

type BrowserSDKConfig = {
  advancedNetworkCapture?: boolean;
  apiKey: string;
  blockClass?: string;
  captureConsole?: boolean; // deprecated
  consoleCapture?: boolean;
  debug?: boolean;
  disableIntercom?: boolean;
  disableReplay?: boolean;
  ignoreClass?: string;
  instrumentations?: Instrumentations;
  ignoreUrls?: IgnoreUrls;
  maskAllInputs?: boolean;
  maskAllText?: boolean;
  maskClass?: string;
  service: string;
  tracePropagationTargets?: (string | RegExp)[];
  url?: string;
};

const URL_BASE = 'https://in-otel.hyperdx.io';
const UI_BASE = 'https://www.hyperdx.io';

function hasWindow() {
  return typeof window !== 'undefined';
}

class Browser {
  private _advancedNetworkCapture = false;

  init({
    advancedNetworkCapture = false,
    apiKey,
    blockClass,
    captureConsole, // deprecated
    consoleCapture,
    debug = false,
    disableIntercom = false,
    disableReplay = false,
    ignoreClass,
    instrumentations = {},
    ignoreUrls,
    maskAllInputs = true,
    maskAllText = false,
    maskClass,
    service,
    tracePropagationTargets,
    url,
  }: BrowserSDKConfig) {
    if (!hasWindow()) {
      return;
    }

    if (apiKey == null) {
      console.warn('HyperDX: Missing apiKey, telemetry will not be saved.');
    } else if (apiKey === '') {
      console.warn(
        'HyperDX: apiKey is empty string, telemetry will not be saved.',
      );
    } else if (typeof apiKey !== 'string') {
      console.warn(
        'HyperDX: apiKey must be a string, telemetry will not be saved.',
      );
    }

    const urlBase = url ?? URL_BASE;

    this._advancedNetworkCapture = advancedNetworkCapture;

    Rum.init({
      debug,
      url: `${urlBase}/v1/traces`,
      allowInsecureUrl: true,
      apiKey,
      app: service,
      ignoreUrls,
      instrumentations: {
        visibility: true,
        console: captureConsole ?? consoleCapture ?? false,
        fetch: {
          ...(tracePropagationTargets != null
            ? {
                propagateTraceHeaderCorsUrls: tracePropagationTargets,
              }
            : {}),
          advancedNetworkCapture: () => this._advancedNetworkCapture,
        },
        xhr: {
          ...(tracePropagationTargets != null
            ? {
                propagateTraceHeaderCorsUrls: tracePropagationTargets,
              }
            : {}),
          advancedNetworkCapture: () => this._advancedNetworkCapture,
        },
        ...instrumentations,
      },
    });

    if (disableReplay !== true) {
      SessionRecorder.init({
        debug,
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

  addAction(name: string, attributes?: Attributes): void {
    if (!hasWindow()) {
      return;
    }

    Rum.addAction(name, attributes);
  }

  enableAdvancedNetworkCapture(): void {
    this._advancedNetworkCapture = true;
  }

  disableAdvancedNetworkCapture(): void {
    this._advancedNetworkCapture = false;
  }

  setGlobalAttributes(
    attributes: Record<
      'userId' | 'userEmail' | 'userName' | 'teamName' | 'teamId' | string,
      string
    >,
  ): void {
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
