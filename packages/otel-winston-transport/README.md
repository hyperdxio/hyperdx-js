# HyperDX OTEL Winston Transport

Winston transport for OpenTelemetry. Outputs OpenTelemetry logs and sends them to an OTLP logs collector. Built for for [HyperDX](https://www.hyperdx.io/).

## Installation

Install the Node.js logger into your project.

```sh
npm install @hyperdx/otel-winston-transport
```

or

```sh
yarn add @hyperdx/otel-winston-transport
```

## Setup

Create a new Winston Transport and append it to your list of transports. Example:

```
import winston from 'winston';
import { HyperDXWinston } from '@hyperdx/node-logger';

const transport = new HyperDXWinston({
  maxLevel: 'info',
  service: 'my-app',
});


const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    transport, // append this to the existing transports
  ],
});

export default logger;
```

#### Options

- **service** - The name of the service.
- **sendIntervalMs** - Time in milliseconds to wait between retry attempts. Default: `2000` (2 sec)
- **bufferSize** - The maximum number of messages the logger will accumulate before sending them all as a bulk. Default: `100`.
- **timeout** - The read/write/connection timeout in milliseconds. Default: `30000`.

### Sending Logs to HyperDX

OTEL_EXPORTER_OTLP_HEADERS="Authorization: <YOUR_API_KEY>"
