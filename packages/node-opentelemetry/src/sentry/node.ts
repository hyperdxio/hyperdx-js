import * as Sentry from '@sentry/node';
import opentelemetry from '@opentelemetry/api';
import {
  SEMATTRS_EXCEPTION_MESSAGE,
  SEMATTRS_EXCEPTION_STACKTRACE,
  SEMATTRS_EXCEPTION_TYPE,
} from '@opentelemetry/semantic-conventions';
import { Event, EventHint } from '@sentry/types';

import hdx from '../debug';

const tracer = opentelemetry.trace.getTracer('@hyperdx/node-opentelemetry');

const getSentryClient = () => {
  if (!Sentry.getCurrentHub()) {
    return;
  }

  // TODO: init Sentry sdk ??
  return Sentry.getCurrentHub().getClient();
};

const startOtelSpanFromSentryEvent = (event: Event, eventHint: EventHint) => {
  const span = tracer.startSpan('EXCEPTION CAUGHT', {
    attributes: {},
    startTime: event.timestamp * 1000,
  });
  // record exceptions
  for (const exception of event.exception?.values ?? []) {
    const _exception: any = new Error(exception.value);
    _exception.stack = JSON.stringify(exception.stacktrace);
    span.recordException(_exception);
  }
  span.end();
};

const registerBeforeSendEvent = (event: Event, hint: EventHint) => {
  console.log('beforeSendEvent', event);
  console.log('hint', hint);
  startOtelSpanFromSentryEvent(event, hint);
};

const registerFlush = () => {
  console.log('flush!!!');
};

export const initSDK = () => {
  const client = getSentryClient();

  if (!client) {
    hdx('Sentry client not found, skipping...');
    return;
  }

  client.on('beforeSendEvent', registerBeforeSendEvent);
  client.on('flush' as any, registerFlush);
  hdx('Registered Sentry event hooks');
};
