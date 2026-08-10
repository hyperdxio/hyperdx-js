# HyperDX JavaScript SDKs

JavaScript/TypeScript SDKs for [HyperDX](https://www.hyperdx.io/), built on
[OpenTelemetry](https://opentelemetry.io/). This monorepo contains the browser
and Node.js instrumentation libraries, logger transports, framework
integrations, and the sourcemap-upload CLI.

## Packages

| Package                                                                         | npm                                                                                                          | Description                                                                   |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| [`node-opentelemetry`](packages/node-opentelemetry/README.md)                   | [`@hyperdx/node-opentelemetry`](https://www.npmjs.com/package/@hyperdx/node-opentelemetry)                   | Main Node.js OpenTelemetry SDK (auto-instrumentation, logs, traces, metrics). |
| [`node-logger`](packages/node-logger/README.md)                                 | [`@hyperdx/node-logger`](https://www.npmjs.com/package/@hyperdx/node-logger)                                 | Winston, Pino, and NestJS logger transports.                                  |
| [`browser`](packages/browser/README.md)                                         | [`@hyperdx/browser`](https://www.npmjs.com/package/@hyperdx/browser)                                         | Browser SDK for real user monitoring and session replay.                      |
| [`otel-web`](packages/otel-web/README.md)                                       | [`@hyperdx/otel-web`](https://www.npmjs.com/package/@hyperdx/otel-web)                                       | OpenTelemetry-based RUM core (consumed via `@hyperdx/browser`).               |
| [`session-recorder`](packages/session-recorder/README.md)                       | [`@hyperdx/otel-web-session-recorder`](https://www.npmjs.com/package/@hyperdx/otel-web-session-recorder)     | Session recording (consumed via `@hyperdx/browser`).                          |
| [`instrumentation-exception`](packages/instrumentation-exception/README.md)     | [`@hyperdx/instrumentation-exception`](https://www.npmjs.com/package/@hyperdx/instrumentation-exception)     | Exception capture instrumentation (used internally by the SDKs).              |
| [`instrumentation-sentry-node`](packages/instrumentation-sentry-node/README.md) | [`@hyperdx/instrumentation-sentry-node`](https://www.npmjs.com/package/@hyperdx/instrumentation-sentry-node) | Bridges `@sentry/node` events into OpenTelemetry.                             |
| [`cli`](packages/cli/README.md)                                                 | [`@hyperdx/cli`](https://www.npmjs.com/package/@hyperdx/cli)                                                 | Command line tool for uploading sourcemaps.                                   |
| [`deno`](packages/deno/README.md)                                               | [`@hyperdx/deno`](https://www.npmjs.com/package/@hyperdx/deno)                                               | OpenTelemetry logging support for Deno.                                       |

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
