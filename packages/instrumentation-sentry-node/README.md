# OpenTelemetry Sentry Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-url]

> **Deprecated:** `@hyperdx/instrumentation-sentry-node` is no longer
> maintained, and neither ClickStack SDK replaces it. Run `@sentry/node` next
> to the upstream
> [OpenTelemetry Node.js SDK](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/)
> or [`@clickhouse/clickstack-node`](https://github.com/ClickHouse/clickstack-node),
> and where you call `Sentry.captureException(error)`, also call
> `trace.getActiveSpan()?.recordException(error)` from `@opentelemetry/api`.
> The
> [Sentry section](https://github.com/ClickHouse/clickstack-node/blob/main/docs/migration.md#sentry)
> of the `clickstack-node` migration guide covers start order and how to keep
> each SDK from tracing the other's requests.

This module provides automatic instrumentation for the [`@sentry/node`](https://github.com/getsentry/sentry-javascript/tree/develop/packages/node) module.

Compatible with OpenTelemetry JS API and SDK `1.0+`.

## Installation

```bash
npm install --save @hyperdx/instrumentation-sentry-node
```

### Supported Versions

- `>=7.30.0 <9`

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
[npm-img]: https://badge.fury.io/js/%40hyperdx%2Finstrumentation-sentry-node.svg
