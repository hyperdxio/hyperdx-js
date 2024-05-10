import * as Sentry from '@sentry/node';
import opentelemetry, { Span } from '@opentelemetry/api';
import { ExceptionEventName } from '@opentelemetry/sdk-trace-base/build/src/enums';
import {
  SEMATTRS_EXCEPTION_MESSAGE,
  SEMATTRS_EXCEPTION_STACKTRACE,
  SEMATTRS_EXCEPTION_TYPE,
} from '@opentelemetry/semantic-conventions';
import { Event, EventHint } from '@sentry/types';

import hdx from '../debug';
import { jsonToString } from '../utils';

const tracer = opentelemetry.trace.getTracer('@hyperdx/node-opentelemetry');

const getSentryClient = () => {
  if (!Sentry.getCurrentHub()) {
    hdx('Sentrey hub not found, skipping...');
    return;
  }

  // TODO: init Sentry sdk ??
  return Sentry.getCurrentHub().getClient();
};

// https://github.com/open-telemetry/opentelemetry-js/blob/ca027b5eed282b4e81e098ca885db9ce27fdd562/packages/opentelemetry-sdk-trace-base/src/Span.ts#L299
const recordException = (span: Span, exception: Sentry.Exception) => {
  span.addEvent(ExceptionEventName, {
    [SEMATTRS_EXCEPTION_TYPE]: exception.type,
    [SEMATTRS_EXCEPTION_MESSAGE]: exception.value,
    [SEMATTRS_EXCEPTION_STACKTRACE]: jsonToString(exception.stacktrace),
  });
};

const isSentryEventAnException = (event: Event) =>
  event.exception?.values?.length > 0;

// TODO: enrich span with more info
const buildSingleSpanName = (event: Event) => event.exception?.values[0].type;

const startOtelSpanFromSentryEvent = (event: Event, hint: EventHint) => {
  let span = opentelemetry.trace.getActiveSpan();
  let isRootSpan = false;
  if (span == null) {
    isRootSpan = true;
    span = tracer.startSpan(buildSingleSpanName(event), {
      startTime: event.timestamp * 1000,
    });
  }
  // record exceptions
  for (const exception of event.exception?.values ?? []) {
    recordException(span, exception);
  }

  if (isRootSpan) {
    span.end();
  }
};

const registerBeforeSendEvent = (event: Event, hint: EventHint) => {
  hdx('Received event at beforeSendEvent hook');
  if (isSentryEventAnException(event)) {
    startOtelSpanFromSentryEvent(event, hint);
  }
};

export const initSDK = () => {
  const client = getSentryClient();

  if (!client) {
    hdx('Sentry client not found, skipping...');
    return;
  }

  client.on('beforeSendEvent', registerBeforeSendEvent);
  hdx('Registered Sentry event hooks');
};
