const { initSDK } = require('@hyperdx/node-opentelemetry');
const { context, metrics, propagation, trace } = require('@opentelemetry/api');

initSDK({
  // advancedNetworkCapture: true,
  networkBodyCapture: false,
  networkHeadersCapture: false,
  // betaMode: true,
  // consoleCapture: true,
});

const express = require('express');
const app = express();
const hostname = '0.0.0.0';
const port = 3000;

app.get('/', (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  const sayHello = () => 'Hello world!';
  const tracer = trace.getTracer('hello-world-tracer');
  const meter = metrics.getMeter('hello-world-meter');
  const counter = meter.createCounter('sheep');
  counter.add(1);
  // new context based on current, with key/values added to baggage
  const ctx = propagation.setBaggage(
    context.active(),
    propagation.createBaggage({
      for_the_children: { value: 'another important value' },
    }),
  );
  // within the new context, do some "work"
  context.with(ctx, () => {
    tracer.startActiveSpan('sleep', (span) => {
      console.log('saying hello to the world');
      span.setAttribute('message', 'hello-world');
      span.setAttribute('delay_ms', 100);
      sleepy().then(() => console.log('sleeping a bit!'));
      span.end();
    });
  });
  sayHello();
  res.end('Hello, World!\n');
});

async function sleepy() {
  await setTimeout(() => {
    console.log('awake now!');
  }, 100);
}

app.listen(port, hostname, () => {
  console.log(`Now listening on: http://${hostname}:${port}/`);
});
