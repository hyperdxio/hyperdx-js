# HyperDX OpenTelemetry Node

OpenTelemetry Node Library for [HyperDX](https://www.hyperdx.io/)

## Installation

Install the library into your project.

```sh
npm install @hyperdx/node-opentelemetry
```

or

```sh
yarn add @hyperdx/node-opentelemetry
```

## Quick Start

### Adding Logger

#### Winston

```
import winston from 'winston';
import { getWinsonTransport } from '@hyperdx/node-opentelemetry';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    getWinsonTransport(), // append this to the existing transports
  ],
});

export default logger;
```

### Configure Environment Variables

Afterwards you'll need to configure the following environment variables in your
shell to ship telemetry to HyperDX:

```sh
export HYPERDX_API_KEY=<YOUR_HYPERDX_API_KEY_HERE> \
OTEL_SERVICE_NAME='<NAME_OF_YOUR_APP_OR_SERVICE>'
```

### Running Node.js Application with One Liner

```sh
npx @hyperdx/node-opentelemetry index.js
```

### (Optional) Running Node.js Application with custom entry point (nodemon, ts-node, etc.)

Add the following line into the top of `tracing.ts` file

```ts
import '@hyperdx/node-opentelemetry/build/src/tracing';
```

Run your application with the following command

```sh
<CUSTOM_ENTRY_POINT> --require ./tracing.ts index.js
```
