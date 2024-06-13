import * as shimmer from 'shimmer';
import {
  InstrumentationBase,
  InstrumentationConfig,
} from '@opentelemetry/instrumentation';

import { recordException } from '../';
import { limitLen, getElementXPath } from './utils';

// FIXME take timestamps from events?

const MESSAGE_LIMIT = 1024;

function useful(s) {
  return s && s.trim() !== '' && !s.startsWith('[object') && s !== 'error';
}

function stringifyValue(value: unknown) {
  if (value === undefined) {
    return '(undefined)';
  }

  return value.toString();
}

export const ERROR_INSTRUMENTATION_NAME = 'errors';
export const ERROR_INSTRUMENTATION_VERSION = '1';

export class HyperDXErrorInstrumentation extends InstrumentationBase {
  private readonly _consoleErrorHandler = (original: Console['error']) => {
    return (...args: any[]) => {
      this.report('console.error', args);
      return original.apply(this, args);
    };
  };

  private readonly _unhandledRejectionListener = (
    event: PromiseRejectionEvent,
  ) => {
    this.report('unhandledrejection', event.reason);
  };

  private readonly _errorListener = (event: ErrorEvent) => {
    this.report('onerror', event);
  };

  private readonly _documentErrorListener = (event: ErrorEvent) => {
    this.report('eventListener.error', event);
  };

  constructor(config: InstrumentationConfig) {
    super(ERROR_INSTRUMENTATION_NAME, ERROR_INSTRUMENTATION_VERSION, config);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  init(): void {}

  enable(): void {
    shimmer.wrap(console, 'error', this._consoleErrorHandler);
    window.addEventListener(
      'unhandledrejection',
      this._unhandledRejectionListener,
    );
    window.addEventListener('error', this._errorListener);
    document.documentElement.addEventListener(
      'error',
      this._documentErrorListener,
      { capture: true },
    );
  }

  disable(): void {
    shimmer.unwrap(console, 'error');
    window.removeEventListener(
      'unhandledrejection',
      this._unhandledRejectionListener,
    );
    window.removeEventListener('error', this._errorListener);
    document.documentElement.removeEventListener(
      'error',
      this._documentErrorListener,
      { capture: true },
    );
  }

  protected reportError(source: string, err: Error): void {
    const msg = err.message || err.toString();
    if (!useful(msg) && !err.stack) {
      return;
    }

    recordException(err, {}, this.tracer);
  }

  protected reportString(
    source: string,
    message: string,
    firstError?: Error,
  ): void {
    if (!useful(message)) {
      return;
    }

    const e = new Error(limitLen(message, MESSAGE_LIMIT));
    if (firstError && firstError.stack && useful(firstError.stack)) {
      e.stack = firstError.stack;
    }

    recordException(e, {}, this.tracer);
  }

  protected reportErrorEvent(source: string, ev: ErrorEvent): void {
    if (ev.error) {
      this.report(source, ev.error);
    } else if (ev.message) {
      this.report(source, ev.message);
    }
  }

  protected reportEvent(source: string, ev: Event): void {
    // FIXME consider other sources of global 'error' DOM callback - what else can be captured here?
    if (!ev.target && !useful(ev.type)) {
      return;
    }

    const now = Date.now();
    const span = this.tracer.startSpan(source, { startTime: now });
    if (ev.target) {
      // TODO: find types to match this
      span.setAttribute('target_element', (ev.target as any).tagName);
      span.setAttribute('target_xpath', getElementXPath(ev.target, true));
      span.setAttribute('target_src', (ev.target as any).src);
    }
    span.end(now);

    recordException(ev, {}, this.tracer, span);
  }

  public report(
    source: string,
    arg: string | Event | ErrorEvent | Array<any>,
  ): void {
    if (Array.isArray(arg) && arg.length === 0) {
      return;
    }
    if (arg instanceof Array && arg.length === 1) {
      arg = arg[0];
    }
    if (arg instanceof Error) {
      this.reportError(source, arg);
    } else if (arg instanceof ErrorEvent) {
      this.reportErrorEvent(source, arg);
    } else if (arg instanceof Event) {
      this.reportEvent(source, arg);
    } else if (typeof arg === 'string') {
      this.reportString(source, arg);
    } else if (arg instanceof Array) {
      // if any arguments are Errors then add the stack trace even though the message is handled differently
      const firstError = arg.find((x) => x instanceof Error);
      this.reportString(
        source,
        arg.map((x) => stringifyValue(x)).join(' '),
        firstError,
      );
    } else {
      this.reportString(source, stringifyValue(arg)); // FIXME or JSON.stringify?
    }
  }
}
