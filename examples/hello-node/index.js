const { initSDK } = require('@hyperdx/node-opentelemetry');
const { trace } = require('@opentelemetry/api');

// uses HYPERDX_API_KEY and OTEL_SERVICE_NAME environment variables
// enable debug output with env var DEBUG=true
initSDK({
  // advancedNetworkCapture: true,
  // betaMode: true,
  // consoleCapture: true,
});

const http = require('node:http');
const hostname = '0.0.0.0';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  const sayHello = () => 'Hello world!';
  const tracer = trace.getTracer('hello-world-tracer');
  tracer.startActiveSpan('main', (span) => {
    console.log('saying hello to the world');
    span.setAttribute('message', 'hello-world');
    span.end();
  });
  sayHello();
  res.end('Hello, World!\n');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
