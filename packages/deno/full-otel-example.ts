/*
* To run:
OTEL_EXPORTER_OTLP_HEADERS="authorization=<YOUR_INGESTION_KEY>" \
OTEL_EXPORTER_OTLP_ENDPOINT=https://in-otel.hyperdx.io \
OTEL_SERVICE_NAME="my-deno-service" \
deno run --allow-net --allow-env --allow-read --allow-sys --allow-run full-otel-example.ts
*/

// Logging

import * as log from 'https://deno.land/std@0.203.0/log/mod.ts';
import { OpenTelemetryHandler } from './mod.ts';
log.setup({
  handlers: {
    // console: new log.handlers.ConsoleHandler("DEBUG"),
    otel: new OpenTelemetryHandler('DEBUG', {
      // exporterProtocol: 'console',
    }),
  },
  loggers: {
    'my-otel-logger': {
      level: 'DEBUG',
      handlers: ['otel'],
    },
  },
});

// From: https://dev.to/grunet/leveraging-opentelemetry-in-deno-45bj#a-minimal-interesting-example
import { registerInstrumentations } from 'npm:@opentelemetry/instrumentation';
import { FetchInstrumentation } from 'npm:@opentelemetry/instrumentation-fetch';

import { NodeTracerProvider } from 'npm:@opentelemetry/sdk-trace-node';
import {
  Resource,
  detectResourcesSync,
  envDetectorSync,
  hostDetectorSync,
  osDetectorSync,
  processDetector,
} from 'npm:@opentelemetry/resources';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
} from 'npm:@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from 'npm:@opentelemetry/exporter-trace-otlp-proto';

import opentelemetry from 'npm:@opentelemetry/api';
import { serve } from 'https://deno.land/std@0.180.0/http/server.ts';

// autoinstrumentation.ts

registerInstrumentations({
  instrumentations: [new FetchInstrumentation()],
});

// Monkeypatching to get past FetchInstrumentation's dependence on sdk-trace-web, which has runtime dependencies on some browser-only constructs. See https://github.com/open-telemetry/opentelemetry-js/issues/3413#issuecomment-1496834689 for more details
// Specifically for this line - https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-web/src/utils.ts#L310
globalThis.location = {};

// tracing.ts

const resource = detectResourcesSync({
  detectors: [
    envDetectorSync,
    hostDetectorSync,
    osDetectorSync,
    processDetector,
  ],
});

const provider = new NodeTracerProvider({
  resource: resource,
});

const consoleExporter = new ConsoleSpanExporter();
provider.addSpanProcessor(new BatchSpanProcessor(consoleExporter));

const traceExporter = new OTLPTraceExporter();
provider.addSpanProcessor(new BatchSpanProcessor(traceExporter));

provider.register();

// Application code

const tracer = opentelemetry.trace.getTracer('deno-demo-tracer');

const port = 9999;

const handler = async (request: Request): Promise<Response> => {
  // This call will be autoinstrumented
  await fetch('http://www.example.com');

  const span = tracer.startSpan(`constructBody`);
  const body = `Your user-agent is:\n\n${
    request.headers.get('user-agent') ?? 'Unknown'
  }`;
  span.end();

  log.getLogger('my-otel-logger').info('👋 Hello from Deno!');
  log.getLogger('my-otel-logger').error('Oh no an error!!');
  log.getLogger('my-otel-logger').info({
    foo: 'bar',
    baz: 'qux',
  });

  return new Response(body, { status: 200 });
};

await serve(instrument(handler), { port });

// Helper code

function instrument(handler) {
  async function instrumentedHandler(request) {
    let response;
    await tracer.startActiveSpan('handler', async (span) => {
      response = await handler(request);

      span.end();
    });

    return response;
  }

  return instrumentedHandler;
}
