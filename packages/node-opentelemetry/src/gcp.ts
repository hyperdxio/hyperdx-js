import { context, SpanKind, trace } from '@opentelemetry/api';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';

import { name as PKG_NAME, version as PKG_VERSION } from '../package.json';
import { initSDK, SDKConfig } from './otel';

export const registerGCPCloudFunctionEventHandler = (
  handler: (event: any) => Promise<void>,
  sdkConfig: SDKConfig = {},
) => {
  initSDK(sdkConfig);
  return async (event) => {
    const tracer = trace.getTracer(PKG_NAME, PKG_VERSION);
    let parentSpanContext;
    let attributes;
    let spanName = 'cloudFunctionEventHandler';
    // extract span context from cloud event
    // https://github.com/googleapis/nodejs-pubsub/blob/a4dd4c04e1a508024d133738e4eabbc90eff0ce6/src/subscriber.ts#L787
    if (
      event.type === 'google.cloud.pubsub.topic.v1.messagePublished' &&
      event.data?.message?.attributes?.['googclient_OpenTelemetrySpanContext']
    ) {
      if (event.data.subscription) {
        spanName = `${event.data.subscription} process`;
      }
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
        [SemanticAttributes.MESSAGING_DESTINATION]: event.data.subscription,
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

    await tracer.startActiveSpan(
      spanName,
      {
        kind: SpanKind.CONSUMER,
        ...(attributes ? { attributes } : {}),
      },
      parentSpanContext
        ? trace.setSpanContext(context.active(), parentSpanContext)
        : context.active(),
      async (span) => {
        try {
          await handler(event);
        } catch (e) {
          span.recordException(e as any);
          throw e;
        } finally {
          span.end();
        }
      },
    );
  };
};
