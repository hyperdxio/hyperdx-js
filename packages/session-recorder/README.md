# OpenTelemetry-based Session Recording for Web

HyperDX distribution of OpenTelemetry-based session recording. This package
powers session replay for [HyperDX](https://www.hyperdx.io/) using
[rrweb](https://www.rrweb.io/).

> **Deprecated:** `@hyperdx/otel-web-session-recorder` is no longer maintained.
> [`@clickhouse/clickstack-browser`](https://github.com/ClickHouse/clickstack-browser)
> replaces it, along with `@hyperdx/browser` and `@hyperdx/otel-web`; see the
> [migration guide](https://github.com/ClickHouse/clickstack-browser/blob/main/docs/migration.md).
> To record sessions on top of the upstream OpenTelemetry browser SDK, use
> `startReplay` from `@clickhouse/clickstack-browser/replay` as described in
> [Using the upstream SDK directly](https://github.com/ClickHouse/clickstack-browser#using-the-upstream-sdk-directly).

## Installation

```sh
npm install @hyperdx/otel-web-session-recorder
```

## License

Apache 2.0
