import { SemanticAttributes } from '@opentelemetry/semantic-conventions';
import { SpanKind, context, trace } from '@opentelemetry/api';

import { initSDK } from './otel';
import { name as PKG_NAME, version as PKG_VERSION } from '../package.json';

// https://github.com/googleapis/nodejs-pubsub/blob/a4dd4c04e1a508024d133738e4eabbc90eff0ce6/src/subscriber.ts#L787
const _createSpan = (event) => {
  const tracer = trace.getTracer(PKG_NAME, PKG_VERSION);
  let parentSpanContext;
  let attributes;
  // extract span context from cloud event
  if (
    event.data?.message?.attributes?.['googclient_OpenTelemetrySpanContext']
  ) {
    const message = event.data.message;
    const parentSpanValue =
      message.attributes['googclient_OpenTelemetrySpanContext'];
    parentSpanContext = parentSpanValue
      ? JSON.parse(parentSpanValue)
      : undefined;
    attributes = {
      // Original span attributes
      ackId: message.ackId,
      deliveryAttempt: message.deliveryAttempt,
      //
      // based on https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/trace/semantic_conventions/messaging.md#topic-with-multiple-consumers
      [SemanticAttributes.MESSAGING_SYSTEM]: 'pubsub',
      [SemanticAttributes.MESSAGING_OPERATION]: 'process',
      [SemanticAttributes.MESSAGING_DESTINATION_KIND]: 'topic',
      [SemanticAttributes.MESSAGING_MESSAGE_ID]: message.id,
      [SemanticAttributes.MESSAGING_PROTOCOL]: 'pubsub',
      [SemanticAttributes.MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES]:
        message.data.length,
      // Not in Opentelemetry semantic convention but mimics naming
      'messaging.pubsub.received_at': message.received,
      'messaging.pubsub.acknowlege_id': message.ackId,
      'messaging.pubsub.delivery_attempt': message.deliveryAttempt,
    };
  }

  return tracer.startSpan(
    'hyperdx-gcp-cloud-function-event-handler',
    {
      kind: SpanKind.CONSUMER,
      ...(attributes ? { attributes } : {}),
    },
    parentSpanContext
      ? trace.setSpanContext(context.active(), parentSpanContext)
      : undefined,
  );
};

export const registerGCPCloudFunctionEventHandler = (
  handler: (event: any) => Promise<void>,
) => {
  return (function () {
    initSDK({
      betaMode: false,
      consoleCapture: true,
    });
    return async (event) => {
      const span = _createSpan(event);
      await handler(event);
      span.end();
    };
  })();
};
