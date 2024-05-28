# OpenTelemetry Sentry Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This module provides automatic instrumentation for the [`@sentry/node`](https://github.com/getsentry/sentry-javascript/tree/develop/packages/node)module.

Compatible with OpenTelemetry JS API and SDK `1.0+`.

## Installation

```bash
npm install --save @hyperdx/instrumentation-sentry-node
```

### Supported Versions

- `>=7 <9`

## Usage

```js
const {
  SentryNodeInstrumentation,
} = require('@hyperdx/instrumentation-sentry-node');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [new SentryNodeInstrumentation()],
});
```

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/hyperdxio/hyperdx-js/discussions
[license-url]: https://github.com/hyperdxio/hyperdx-js/blob/main/packages/instrumentation-sentry-node/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@hyperdx/instrumentation-sentry-node
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-pg.svg
