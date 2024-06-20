import * as shimmer from 'shimmer';
import { Span } from '@opentelemetry/api';
import {
  InstrumentationBase,
  InstrumentationConfig,
} from '@opentelemetry/instrumentation';

import { recordException } from '../';
import { limitLen, getElementXPath } from './utils';

// FIXME take timestamps from events?

const STACK_LIMIT = 4096;
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

function addStackIfUseful(span: Span, err: Error) {
  if (err && err.stack && useful(err.stack)) {
    span.setAttribute(
      'error.stack',
      limitLen(err.stack.toString(), STACK_LIMIT),
    );
  }
}

export const ERROR_INSTRUMENTATION_NAME = 'errors';
export const ERROR_INSTRUMENTATION_VERSION = '1';

export class HyperDXErrorInstrumentation extends InstrumentationBase {
  private readonly _consoleErrorHandler = (original: Console['error']) => {
    return (...args: any[]) => {
      this.hdxReport('console.error', args);
      return original.apply(this, args);
    };
  };

  private readonly _unhandledRejectionListener = (
    event: PromiseRejectionEvent,
  ) => {
    this.hdxReport('unhandledrejection', event.reason);
  };

  private readonly _errorListener = (event: ErrorEvent) => {
    this.hdxReport('onerror', event);
  };

  private readonly _documentErrorListener = (event: ErrorEvent) => {
    this.hdxReport('eventListener.error', event);
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

  protected hdxReportError(source: string, err: Error): void {
    const msg = err.message || err.toString();
    if (!useful(msg) && !err.stack) {
      return;
    }

    const now = Date.now();
    const span = this.tracer.startSpan(source, { startTime: now });
    span.setAttribute('component', 'error');
    span.setAttribute('error', true);
    span.setAttribute(
      'error.object',
      useful(err.name)
        ? err.name
        : err.constructor && err.constructor.name
        ? err.constructor.name
        : 'Error',
    );
    span.setAttribute('error.message', limitLen(msg, MESSAGE_LIMIT));
    addStackIfUseful(span, err);
    recordException(err, {
      tracer: this.tracer,
      span,
    }).finally(() => {
      span.end(now);
    });
  }

  protected hdxReportString(
    source: string,
    message: string,
    firstError?: Error,
  ): void {
    if (!useful(message)) {
      return;
    }

    const now = Date.now();
    const span = this.tracer.startSpan(source, { startTime: now });
    span.setAttribute('component', 'error');
    span.setAttribute('error', true);
    span.setAttribute('error.object', 'String');
    span.setAttribute('error.message', limitLen(message, MESSAGE_LIMIT));
    if (firstError) {
      addStackIfUseful(span, firstError);
      // FIXME: record only the first error?
      recordException(firstError, {
        tracer: this.tracer,
        span,
      }).finally(() => {
        span.end(now);
      });
    } else {
      span.end(now);
    }
  }

  protected hdxReportErrorEvent(source: string, ev: ErrorEvent): void {
    if (ev.error) {
      this.hdxReport(source, ev.error);
    } else if (ev.message) {
      this.hdxReport(source, ev.message);
    }
  }

  protected hdxReportEvent(source: string, ev: Event): void {
    // FIXME consider other sources of global 'error' DOM callback - what else can be captured here?
    if (!ev.target && !useful(ev.type)) {
      return;
    }

    const now = Date.now();
    const span = this.tracer.startSpan(source, { startTime: now });
    span.setAttribute('component', 'error');
    span.setAttribute('error.type', ev.type);
    if (ev.target) {
      // TODO: find types to match this
      span.setAttribute('target_element', (ev.target as any).tagName);
      span.setAttribute('target_xpath', getElementXPath(ev.target, true));
      span.setAttribute('target_src', (ev.target as any).src);
    }
    recordException(ev, {
      tracer: this.tracer,
      span,
    }).finally(() => {
      span.end(now);
    });
  }

  public hdxReport(
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
      this.hdxReportError(source, arg);
    } else if (arg instanceof ErrorEvent) {
      this.hdxReportErrorEvent(source, arg);
    } else if (arg instanceof Event) {
      this.hdxReportEvent(source, arg);
    } else if (typeof arg === 'string') {
      this.hdxReportString(source, arg);
    } else if (arg instanceof Array) {
      // if any arguments are Errors then add the stack trace even though the message is handled differently
      const firstError = arg.find((x) => x instanceof Error);
      this.hdxReportString(
        source,
        arg.map((x) => stringifyValue(x)).join(' '),
        firstError,
      );
    } else {
      this.hdxReportString(source, stringifyValue(arg)); // FIXME or JSON.stringify?
    }
  }
}
