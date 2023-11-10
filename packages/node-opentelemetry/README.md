# HyperDX OpenTelemetry Node

OpenTelemetry Node Library for [HyperDX](https://www.hyperdx.io/)

### Install HyperDX OpenTelemetry Instrumentation Package

Use the following command to install the OpenTelemetry package.

```sh
npm install @hyperdx/node-opentelemetry
```

or

```sh
yarn add @hyperdx/node-opentelemetry
```

### Add The Logger Transport

To collect logs from your application, you'll need to add a few lines of code to
configure your logging module.

#### Winston Transport

```ts
import winston from 'winston';
import { getWinsonTransport } from '@hyperdx/node-opentelemetry';

const MAX_LEVEL = 'info';

const logger = winston.createLogger({
  level: MAX_LEVEL,
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    getWinsonTransport(MAX_LEVEL), // append this to the existing transports
  ],
});

export default logger;
```

#### Pino Transport

```ts
import pino from 'pino';
import { getPinoTransport } from '@hyperdx/node-opentelemetry';

const MAX_LEVEL = 'info';

const logger = pino(
  pino.transport({
    targets: [
      getPinoTransport(MAX_LEVEL),
      // other transports
    ],
  }),
);
```

### Configure Environment Variables

Afterwards you'll need to configure the following environment variables in your
shell to ship telemetry to HyperDX:

```sh
export HYPERDX_API_KEY=<YOUR_HYPERDX_API_KEY_HERE> \
OTEL_SERVICE_NAME='<NAME_OF_YOUR_APP_OR_SERVICE>'
```

_Self-hosted users will need to additionally specify the `OTEL_EXPORTER_OTLP_ENDPOINT` env var to point to their self-hosted endpoint (ex. `http://localhost:4318`)_

### Run the Application with HyperDX OpenTelemetry CLI

#### Option 1 (Recommended)

Now you can run the application with the HyperdxDX `opentelemetry-instrument`
CLI.

```sh
npx opentelemetry-instrument index.js
```

#### Option 2

In case you want to run the application with a custom entry point (nodemon,
ts-node, etc.).

Run your application with the following command (example using `ts-node`):

```sh
npx ts-node -r '@hyperdx/node-opentelemetry/build/src/tracing' index.ts
```

#### Option 3

You can also manually instrument the SDK. In the `instrument.ts`, add the following code:

```ts
import { initSDK } from '@hyperdx/node-opentelemetry';

initSDK({
  consoleCapture: true, // optional, default: true
  advancedNetworkCapture: true, // optional, default: false
  additionalInstrumentations: [], // optional, default: []
});

// Other instrumentation code...
// Details link: https://opentelemetry.io/docs/instrumentation/js/manual/#manual-instrumentation-setup
```

And run your application with the following command (example using `ts-node`):

```sh
npx ts-node -r './instrument.ts' index.ts
```

### Troubleshooting

If you are having trouble getting events to show up in HyperDX, you can enable verbose logging by setting the environment variable `DEBUG=hyperdx`. This will print out additional debug logging to isolate any issues.

If you're pointing to a self-hosted collector, ensure the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable is set to the correct endpoint (ex. `http://localhost:4318`) and is reachable (ex. `curl http://localhost:4318/v1/traces` should return a HTTP 405).

### (Optional) Attach User Information or Metadata (BETA)

To easily tag all events related to a given attribute or identifier (ex. user id or email), you can call the `setTraceAttributes` function which will tag every log/span associated with the current trace after the call with the declared attributes. It's recommended to call this function as early as possible within a given request/trace (ex. as early in an Express middleware stack as possible).

This is a convenient way to ensure all logs/spans are automatically tagged with the right identifiers to be searched on later, instead of needing to manually tagging and propagating identifiers yourself.

`userId`, `userEmail`, `userName`, and `teamName` will populate the sessions UI with the corresponding values, but can be omitted. Any other additional values can be specified and used to search for events.

```sh
export HDX_NODE_BETA_MODE=1
```

```ts
import { setTraceAttributes } from '@hyperdx/node-opentelemetry';

app.use((req, res, next) => {
  // Get user information from the request...

  // Attach user information to the current trace
  setTraceAttributes({
    userId,
    userEmail,
  });
  next();
});
```

### (Optional) Advanced Instrumentation Configuration

#### Capture Console Logs

By default, the HyperDX SDK will capture console logs.
You can disable it by setting `HDX_NODE_CONSOLE_CAPTURE` environment variable to 0.

```sh
export HDX_NODE_CONSOLE_CAPTURE=0
```

To attach trace id to console logs, you can set `HDX_NODE_BETA_MODE` environment variable to 1.

```sh
export HDX_NODE_BETA_MODE=1
```

#### Advanced Network Capture

By enabling advanced network capture, the SDK will additionally capture full HTTP request/response headers
and bodies for all inbound/outbound HTTP requests, to help with more in-depth request debugging.
This can be accomplished by setting `HDX_NODE_ADVANCED_NETWORK_CAPTURE` environment variable to 1.

```sh
export HDX_NODE_ADVANCED_NETWORK_CAPTURE=1
```

By default, all request/response headers will be captured. You can specify a custom list of headers to capture
by setting `OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_CLIENT_REQUEST`,
`OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_CLIENT_RESPONSE`,
`OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_SERVER_REQUEST`,
`OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_SERVER_RESPONSE`
environment variable to a comma-separated list of headers.

For example:

```sh
export OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_CLIENT_REQUEST=authorization,accept
```

### Custom Termination/Shutdown Handler

If your application specifies its own shutdown procedure by capturing `SIGTERM` or `SIGINT` events, you'll want to disable the default shutdown handler by specifying `stopOnTerminationSignals` to false in the `initSDK` call or by setting `HDX_NODE_STOP_ON_TERMINATION_SIGNALS` to `false`.

You can then import and call the `shutdown` async function to manually stop the SDK.

```ts
import { shutdown } from '@hyperdx/node-opentelemetry';

process.on('SIGTERM', async () => {
  // Your shutdown code here...

  await shutdown();
  process.exit();
});
```
