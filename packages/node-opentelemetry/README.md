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
ts-node -r '@hyperdx/node-opentelemetry/build/src/tracing' index.js
```

#### Option 3

You can also initialize the OpenTelemetry SDK manually in your own otel configuration file.

```ts
import { initSDK } from '@hyperdx/node-opentelemetry';

initSDK({
  captureConsole: true, // optional, default: true
});

// Other instrumentation code...
```
