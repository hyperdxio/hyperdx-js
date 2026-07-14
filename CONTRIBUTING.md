# Contributing

Thanks for your interest in contributing to the HyperDX JavaScript SDKs! This
guide covers the repository layout and the day-to-day development workflow.

For the detailed code style, naming, and testing conventions, see
[AGENTS.md](AGENTS.md).

## Repository layout

This is a [Yarn Classic](https://classic.yarnpkg.com/) workspaces monorepo. All
packages live under `packages/`:

```
hyperdx-js/
├── packages/
│   ├── browser/                     # Browser SDK (wraps otel-web + session-recorder)
│   ├── cli/                         # CLI for sourcemap uploads
│   ├── deno/                        # Deno SDK
│   ├── instrumentation-exception/   # Exception capture instrumentation
│   ├── instrumentation-sentry-node/ # Sentry integration for OTel
│   ├── node-logger/                 # Winston/Pino/NestJS logger transports
│   ├── node-opentelemetry/          # Main Node.js OTel SDK
│   ├── otel-web/                    # Browser OTel RUM
│   └── session-recorder/            # Session recording (rrweb-based)
├── smoke-tests/                     # Docker + BATS integration tests
├── nx.json                          # Nx workspace config
└── Makefile                         # Smoke test automation
```

Tooling:

- **[Nx](https://nx.dev/)** orchestrates builds/tests and respects dependency
  order between packages.
- **[Changesets](https://github.com/changesets/changesets)** manages versioning
  and publishing.
- Node **v25** is recommended (see `.nvmrc`).

## Getting started

```sh
# Install dependencies (from the repo root)
yarn install

# Build all packages
yarn ci:build
```

## Building, linting, and testing

Run across all packages from the repo root:

```sh
yarn ci:build   # npx nx run-many --target=build
yarn ci:lint    # npx nx run-many --target=ci:lint
yarn ci:unit    # npx nx run-many --target=ci:unit
```

Work on a single package:

```sh
# Build one package
npx nx run @hyperdx/node-opentelemetry:build

# Or from the package directory
cd packages/node-opentelemetry && yarn build

# Run one package's tests (most packages use Jest)
cd packages/node-opentelemetry && npx jest

# Run a single test file / test-name pattern
cd packages/node-opentelemetry && npx jest --testPathPattern="otel\\.test"
cd packages/node-opentelemetry && npx jest --testNamePattern="console"
```

> **Note:** The `otel-web` package uses Karma + Mocha rather than Jest. See its
> package scripts for the relevant commands.

### Smoke tests (Docker + BATS)

```sh
make build-smoke-images   # docker compose build
make smoke-sdk            # run HTTP + gRPC smoke tests
make smoke                # run all BATS tests
```

## Code style

- **Prettier** (single quotes, trailing commas) and **ESLint** are enforced via
  a `husky` + `lint-staged` pre-commit hook.
- Imports and exports are auto-sorted by `eslint-plugin-simple-import-sort`.
- TypeScript runs in strict mode.

Run the linters manually from a package directory:

```sh
yarn lint       # ESLint
yarn ci:lint    # ESLint + tsc --noEmit
```

See [AGENTS.md](AGENTS.md) for the full conventions reference.

## Submitting changes

1. [Fork](https://github.com/hyperdxio/hyperdx-js/fork) the repository and clone
   your fork.
2. Create a branch for your change.
3. Make your changes with accompanying tests where applicable.
4. Add a changeset describing the change (this drives versioning and the
   changelog):
   ```sh
   npx changeset
   ```
5. Ensure `yarn ci:build`, `yarn ci:lint`, and `yarn ci:unit` all pass.
6. Push to your fork and open a pull request against `main`.

## Questions and feedback

Join us in
[GitHub Discussions](https://github.com/hyperdxio/hyperdx-js/discussions).
