# HyperDX JavaScript SDKs

> **Deprecated:** the SDKs in this repository are no longer maintained. Use
> [`@clickhouse/clickstack-browser`](https://github.com/ClickHouse/clickstack-browser)
> for browsers and
> [`@clickhouse/clickstack-node`](https://github.com/ClickHouse/clickstack-node)
> for Node.js. Where neither covers a package, use the upstream
> [OpenTelemetry SDKs](https://opentelemetry.io/docs/languages/js/), which
> also work with ClickStack. The table below lists the replacement for each
> package.

JavaScript/TypeScript SDKs for [HyperDX](https://www.hyperdx.io/), built on
[OpenTelemetry](https://opentelemetry.io/). This monorepo contains the browser
and Node.js instrumentation libraries, logger transports, framework
integrations, and the sourcemap-upload CLI.

## Packages

| Package                                                                                  | Description                                                                   | Use instead                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@hyperdx/node-opentelemetry`](packages/node-opentelemetry/README.md)                   | Main Node.js OpenTelemetry SDK (auto-instrumentation, logs, traces, metrics). | `@clickhouse/clickstack-node` ([migration guide](https://github.com/ClickHouse/clickstack-node/blob/main/docs/migration.md))                                                                                   |
| [`@hyperdx/node-logger`](packages/node-logger/README.md)                                 | Winston, Pino, and NestJS logger transports.                                  | `@clickhouse/clickstack-node` ([migration guide](https://github.com/ClickHouse/clickstack-node/blob/main/docs/migration.md#hyperdxnode-logger))                                                                |
| [`@hyperdx/browser`](packages/browser/README.md)                                         | Browser SDK for real user monitoring and session replay.                      | `@clickhouse/clickstack-browser` ([migration guide](https://github.com/ClickHouse/clickstack-browser/blob/main/docs/migration.md))                                                                             |
| [`@hyperdx/otel-web`](packages/otel-web/README.md)                                       | OpenTelemetry-based RUM core (consumed via `@hyperdx/browser`).               | `@clickhouse/clickstack-browser`                                                                                                                                                                               |
| [`@hyperdx/otel-web-session-recorder`](packages/session-recorder/README.md)              | Session recording (consumed via `@hyperdx/browser`).                          | `@clickhouse/clickstack-browser`                                                                                                                                                                               |
| [`@hyperdx/instrumentation-exception`](packages/instrumentation-exception/README.md)     | Exception capture instrumentation (used internally by the SDKs).              | Both ClickStack SDKs capture exceptions; otherwise `span.recordException()` from `@opentelemetry/api`                                                                                                          |
| [`@hyperdx/instrumentation-sentry-node`](packages/instrumentation-sentry-node/README.md) | Bridges `@sentry/node` events into OpenTelemetry.                             | No replacement. Run `@sentry/node` next to the upstream OpenTelemetry Node.js SDK or `@clickhouse/clickstack-node` ([notes](https://github.com/ClickHouse/clickstack-node/blob/main/docs/migration.md#sentry)) |
| [`@hyperdx/cli`](packages/cli/README.md)                                                 | Command line tool for uploading sourcemaps.                                   | Same package, now developed in [ClickHouse/ClickStack](https://github.com/ClickHouse/ClickStack/tree/main/packages/cli)                                                                                        |
| [`@hyperdx/deno`](packages/deno/README.md)                                               | OpenTelemetry logging support for Deno.                                       | Deno's [built-in OpenTelemetry](https://docs.deno.com/runtime/fundamentals/open_telemetry/)                                                                                                                    |

## Documentation

- Product & setup docs: <https://www.hyperdx.io/docs>
- OpenTelemetry: <https://opentelemetry.io/>

## Development

This is a [Yarn](https://yarnpkg.com/) workspaces monorepo,
orchestrated with [Nx](https://nx.dev/) and versioned with
[Changesets](https://github.com/changesets/changesets). Node `v25` is
recommended (see `.nvmrc`). The Yarn version is pinned via the `packageManager`
field in `package.json` and provided by [Corepack](https://nodejs.org/api/corepack.html);
run `corepack enable` once so the correct Yarn version is used automatically.

```sh
# Install dependencies (from the repo root)
yarn install

# Build, lint, and test all packages (respects dependency order via Nx)
yarn ci:build
yarn ci:lint
yarn ci:unit
```

To build or test a single package:

```sh
# Build one package
npx nx run @hyperdx/node-opentelemetry:build

# Run one package's tests (most packages use Jest)
cd packages/node-opentelemetry && npx jest
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor guide, and
[AGENTS.md](AGENTS.md) for detailed build/test/style reference.

## License

Packages are published under either the MIT or Apache-2.0 license. See the
`LICENSE` file within each package for details.
