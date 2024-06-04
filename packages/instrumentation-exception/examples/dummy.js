const {
  DiagConsoleLogger,
  DiagLogLevel,
  diag,
  trace,
} = require('@opentelemetry/api');
const {
  BatchSpanProcessor,
  NodeTracerProvider,
} = require('@opentelemetry/sdk-trace-node');
const {
  OTLPTraceExporter,
} = require('@opentelemetry/exporter-trace-otlp-http');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const {
  ExpressInstrumentation,
} = require('@opentelemetry/instrumentation-express');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');

const {
  ExceptionInstrumentation,
  recordException,
  setupExpressErrorHandler,
} = require('../build/src');

const collectorOptions = {
  url: 'http://localhost:4318/v1/traces', // url is optional and can be omitted - default is http://localhost:4318/v1/traces
  headers: {
    Authorization: '',
  }, // an optional object containing custom headers to be sent with each request
  concurrencyLimit: 10, // an optional limit on pending requests
};

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
const provider = new NodeTracerProvider();
const exporter = new OTLPTraceExporter(collectorOptions);
provider.addSpanProcessor(
  new BatchSpanProcessor(exporter, {
    // The maximum queue size. After the size is reached spans are dropped.
    maxQueueSize: 100,
    // The maximum batch size of every export. It must be smaller or equal to maxQueueSize.
    maxExportBatchSize: 10,
    // The interval between two consecutive exports
    scheduledDelayMillis: 500,
    // How long the export can run before it is cancelled
    exportTimeoutMillis: 30000,
  }),
);
provider.register();

registerInstrumentations({
  instrumentations: [
    new ExceptionInstrumentation(),
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
  ],
});

const compression = require('compression');
const express = require('express');

const PORT = parseInt(process.env.PORT || '7788');
const app = express();

app.use(compression());
app.use(express.json());

app.get('/error', (req, res) => {
  recordException(
    new Error('This is a test error with custom attributes'),
    undefined,
    undefined,
    trace.getActiveSpan(),
  );
  recordException({
    message: 'This is a test for capturing exception in object',
    foo: 'bar',
  });
  throw new Error('This should be captured by the exception handler');
});

setupExpressErrorHandler(app);

app.use((err, req, res, next) => {
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
