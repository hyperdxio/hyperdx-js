# HyperDX OTEL Pino Transport

Pino transport for OpenTelemetry. Outputs OpenTelemetry logs and sends them to an OTLP logs collector. Built for for [HyperDX](https://www.hyperdx.io/).

## Installation

Install the Node.js logger into your project.

```sh
npm install @hyperdx/otel-pino-transport
```

or

```sh
yarn add @hyperdx/otel-pino-transport
```

## Setup

Create a new Pino Transport and append it to your list of transports. Example:

```
import pino from 'pino';

const logger = pino(
  pino.transport({
    targets: [
      {
        target: '@hyperdx/node-logger/build/src/index',
        options: {
          service: 'my-app',
        },
        level: 'info',
      },
    ],
  }),
);

export default logger;
```

### Options

- **service** - The name of the service.
- **sendIntervalMs** - Time in milliseconds to wait between retry attempts. Default: `2000` (2 sec)
- **bufferSize** - The maximum number of messages the logger will accumulate before sending them all as a bulk. Default: `100`.
- **timeout** - The read/write/connection timeout in milliseconds. Default: `30000`.

### Sending Logs to HyperDX

OTEL_EXPORTER_OTLP_HEADERS="Authorization: <YOUR_API_KEY>"
