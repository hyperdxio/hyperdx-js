import api, { Span, SpanKind } from '@opentelemetry/api';
import { ExceptionEventName } from '@opentelemetry/sdk-trace-base/build/src/enums';
import {
  SEMATTRS_EXCEPTION_MESSAGE,
  SEMATTRS_EXCEPTION_STACKTRACE,
  SEMATTRS_EXCEPTION_TYPE,
} from '@opentelemetry/semantic-conventions';
import { Event, EventHint, Exception } from '@sentry/types';

import hdx from '../debug';
import { jsonToString } from '../utils';

const tracer = api.trace.getTracer('@hyperdx/node-opentelemetry');

// CUSTOM SEMANTIC CONVENTIONS
const SEMATTRS_EXCEPTION_MODULES = 'exception.modules';
const SEMATTRS_EXCEPTION_TAGS = 'exception.tags';

// https://github.com/open-telemetry/opentelemetry-js/blob/ca027b5eed282b4e81e098ca885db9ce27fdd562/packages/opentelemetry-sdk-trace-base/src/Span.ts#L299
const recordException = (span: Span, exception: Exception) => {
  span.addEvent(ExceptionEventName, {
    [SEMATTRS_EXCEPTION_MESSAGE]: exception.value,
    [SEMATTRS_EXCEPTION_STACKTRACE]: jsonToString(exception.stacktrace),
    [SEMATTRS_EXCEPTION_TYPE]: exception.type,
  });
};

const isSentryEventAnException = (event: Event) =>
  event.exception?.values?.length > 0;

// TODO: enrich span with more info
const buildSingleSpanName = (event: Event) =>
  [event.exception?.values[0].type, event.transaction].join(' ');

const startOtelSpanFromSentryEvent = (event: Event, hint: EventHint) => {
  // FIXME: can't attach to the active span
  // since Sentry would overwrite the active span
  // let span = api.trace.getActiveSpan();
  let span: Span = null;
  let isRootSpan = false;
  const startTime = event.timestamp * 1000;
  if (span == null) {
    isRootSpan = true;
    span = tracer.startSpan(buildSingleSpanName(event), {
      attributes: {
        ...(event.modules && {
          [SEMATTRS_EXCEPTION_MODULES]: jsonToString(event.modules),
        }),
        [SEMATTRS_EXCEPTION_TAGS]: jsonToString({
          app: event.contexts?.app,
          cloud_resource: event.contexts?.cloud_resource,
          culture: event.contexts?.culture,
          device: event.contexts?.device,
          environment: event.environment,
          os: event.contexts?.os,
          response: event.contexts?.response,
          server_name: event.server_name,
          transaction: event.transaction,
        }),
      },
      startTime,
      kind: SpanKind.INTERNAL,
    });
  }
  // record exceptions
  for (const exception of event.exception?.values ?? []) {
    recordException(span, exception);
  }

  if (isRootSpan) {
    span.end(startTime);
  }
};

const registerBeforeSendEvent = (event: Event, hint: EventHint) => {
  hdx('Received event at beforeSendEvent hook');
  if (isSentryEventAnException(event)) {
    startOtelSpanFromSentryEvent(event, hint);
  }
};

export const initSDK = async () => {
  try {
    const Sentry = await import('@sentry/node');
    if (!Sentry.isInitialized()) {
      Sentry.init({
        dsn: '',
        integrations: [
          // Common
          new Sentry.Integrations.InboundFilters(),
          new Sentry.Integrations.FunctionToString(),
          new Sentry.Integrations.LinkedErrors(),
          new Sentry.Integrations.RequestData(),
          // Global Handlers
          new Sentry.Integrations.OnUnhandledRejection(),
          new Sentry.Integrations.OnUncaughtException(),
          // Event Info
          new Sentry.Integrations.ContextLines(),
          new Sentry.Integrations.LocalVariables(),
        ],
      });
      hdx('Initialized Sentry SDK');
    }
    const client = Sentry.getClient();
    if (!client) {
      hdx('Sentry client not found');
      return;
    }
    client.on('beforeSendEvent', registerBeforeSendEvent);
    hdx('Registered Sentry event hooks');
  } catch (e) {
    hdx('Error initializing Sentry SDK');
  }
};
