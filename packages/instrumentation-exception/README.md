# HyperDX Exception Instrumentation

OpenTelemetry exception capture instrumentation for [HyperDX](https://www.hyperdx.io/).

> **Deprecated:** `@hyperdx/instrumentation-exception` is no longer maintained.
> It was used internally by `@hyperdx/node-opentelemetry` and
> `@hyperdx/browser`. Their replacements,
> [`@clickhouse/clickstack-node`](https://github.com/ClickHouse/clickstack-node)
> and
> [`@clickhouse/clickstack-browser`](https://github.com/ClickHouse/clickstack-browser),
> capture exceptions without it. If you used this package directly, record
> errors with the OpenTelemetry API instead:
> `trace.getActiveSpan()?.recordException(error)` from `@opentelemetry/api`.

## Installation

```sh
npm install @hyperdx/instrumentation-exception
```

## License

Apache 2.0
