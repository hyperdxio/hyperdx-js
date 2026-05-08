# AGENTS.md — HyperDX JS SDK Monorepo

## Repository Overview

Monorepo for the HyperDX JavaScript/TypeScript SDKs built on OpenTelemetry.
9 packages under `packages/` managed with **Yarn Classic** workspaces, **Nx** for
task orchestration, and **Changesets** for versioning/publishing.

| Package                       | Name                                   | Build Tool   |
| ----------------------------- | -------------------------------------- | ------------ |
| `node-opentelemetry`          | `@hyperdx/node-opentelemetry`          | tsc          |
| `node-logger`                 | `@hyperdx/node-logger`                 | tsc          |
| `instrumentation-exception`   | `@hyperdx/instrumentation-exception`   | tsc          |
| `instrumentation-sentry-node` | `@hyperdx/instrumentation-sentry-node` | tsc          |
| `browser`                     | `@hyperdx/browser`                     | Rollup + TS  |
| `otel-web`                    | `@hyperdx/otel-web`                    | Rollup + tsc |
| `session-recorder`            | `@hyperdx/otel-web-session-recorder`   | Rollup + tsc |
| `cli`                         | `@hyperdx/cli`                         | tsup         |
| `deno`                        | `@hyperdx/deno`                        | Deno         |

## Build Commands

```bash
# Install dependencies (from repo root)
yarn install

# Build all packages (respects dependency order via Nx)
yarn ci:build            # npx nx run-many --target=build

# Build a single package
npx nx run @hyperdx/node-opentelemetry:build
# Or from the package directory:
cd packages/node-opentelemetry && yarn build

# Lint all packages
yarn ci:lint             # npx nx run-many --target=ci:lint

# Lint a single package (from its directory)
cd packages/node-opentelemetry && yarn lint        # ESLint only
cd packages/node-opentelemetry && yarn ci:lint     # ESLint + tsc --noEmit
```

## Test Commands

Most packages use **Jest** with `ts-jest` (ESM preset). The `otel-web` package
uses **Karma + Mocha** (browser) and **Mocha** (Node).

```bash
# Run all unit tests across the monorepo
yarn ci:unit             # npx nx run-many --target=ci:unit

# Run tests in a single package
cd packages/node-opentelemetry && npx jest
cd packages/instrumentation-exception && yarn test
cd packages/session-recorder && yarn test

# Run a single test file
cd packages/node-opentelemetry && npx jest --testPathPattern="otel\\.test"

# Run tests matching a name pattern
cd packages/node-opentelemetry && npx jest --testNamePattern="console"

# Watch mode
cd packages/node-opentelemetry && yarn dev:unit         # jest --watchAll
cd packages/instrumentation-exception && yarn test:watch # jest --watch

# otel-web (Karma + Mocha, not Jest)
cd packages/otel-web && yarn test:unit:ci-node   # Mocha node tests
cd packages/otel-web && yarn test:unit:ci         # Karma browser tests (ChromeHeadless)
```

### Smoke Tests (Docker + BATS)

```bash
make build-smoke-images   # docker compose build
make smoke-sdk            # run HTTP + gRPC smoke tests
make smoke                # run all BATS tests
make resmoke              # teardown + re-run
```

## Code Style Guidelines

### Formatting — Prettier

- **Single quotes**, **trailing commas** everywhere, standard semicolons
- Config in root `.prettierrc`
- Enforced via pre-commit hook (`husky` + `lint-staged`)
- Run manually: `yarn prettier` from any package directory

### Linting — ESLint

- Parser: `@typescript-eslint/parser`
- Plugins: `@typescript-eslint`, `jest`, `prettier`, `simple-import-sort`
- Key rules:
  - `simple-import-sort/imports`: **error** — imports must be sorted
  - `simple-import-sort/exports`: **error** — exports must be sorted
  - `@typescript-eslint/explicit-function-return-type`: **warn**
  - `prettier/prettier`: **error**

### Import Ordering

Imports are auto-sorted by `eslint-plugin-simple-import-sort`. The convention is:

```typescript
// 1. External packages (alphabetical)
import { diag, trace } from '@opentelemetry/api';
import { InstrumentationBase } from '@opentelemetry/instrumentation';

// 2. Internal/relative imports (separated by blank line)
import { name as PKG_NAME, version as PKG_VERSION } from '../package.json';
import { parseHeaders } from './utils';
```

### TypeScript

- **Strict mode** enabled (`strict: true`, `strictNullChecks: true`)
- `noImplicitAny: false` — implicit `any` is tolerated
- Target: `es2019`, Module: `commonjs`, ModuleResolution: `node`
- Use `import type { ... }` for type-only imports
- Browser packages produce dual CJS/ESM output

### Naming Conventions

| Element           | Convention           | Examples                              |
| ----------------- | -------------------- | ------------------------------------- |
| Files (classes)   | PascalCase           | `HyperDXBatchSpanProcessor.ts`        |
| Files (utils)     | camelCase            | `utils.ts`, `logger.ts`               |
| Classes           | PascalCase           | `Browser`, `ExceptionInstrumentation` |
| Functions         | camelCase            | `initSDK`, `getWinstonTransport`      |
| Constants (env)   | SCREAMING_SNAKE_CASE | `DEFAULT_HDX_API_KEY`                 |
| Constants (other) | camelCase            | `UI_LOG_PREFIX`                       |
| Types/Interfaces  | PascalCase           | `SDKConfig`, `BrowserSDKConfig`       |

### Exports

- Prefer **named exports**
- The `@hyperdx/browser` package is the exception: it exports a singleton
  `new Browser()` as the default export

### Error Handling

- Use `try/catch` with `diag.error(...)` or `diag.debug(...)` for OpenTelemetry
  internal errors (from `@opentelemetry/api`)
- Use `console.warn(...)` for user-facing warnings (e.g., missing API key)
- Use `.catch(() => {})` for fire-and-forget optional integrations
- Implement graceful shutdown: `SIGTERM`/`SIGINT` handlers with `forceFlush()`
  before process exit

### Testing Patterns

- Test files go in `src/__tests__/` or `__tests__/` directories
- File naming: `*.test.ts` or `*.spec.ts`
- Use `describe`/`it` blocks (Jest or Mocha)
- Jest config uses `ts-jest` with ESM preset:
  ```ts
  preset: 'ts-jest/presets/default-esm',
  transform: { '^.+\\.m?[tj]s?$': ['ts-jest', { useESM: true }] },
  ```
- Most tests are lightweight smoke tests; `node-opentelemetry` has the most
  comprehensive test suite (async context isolation, stream interception, etc.)

## Project Structure

```
hyperdx-js/
├── packages/
│   ├── browser/              # Browser SDK (wraps otel-web + session-recorder)
│   ├── cli/                  # CLI for sourcemap uploads
│   ├── deno/                 # Deno SDK
│   ├── instrumentation-exception/  # Exception capture instrumentation
│   ├── instrumentation-sentry-node/ # Sentry integration for OTel
│   ├── node-logger/          # Winston/Pino/NestJS logger transports
│   ├── node-opentelemetry/   # Main Node.js OTel SDK
│   ├── otel-web/             # Browser OTel RUM (forked from Splunk)
│   └── session-recorder/     # Session recording (rrweb-based)
├── smoke-tests/              # Docker + BATS integration tests
├── nx.json                   # Nx workspace config (build caching, topological order)
├── .prettierrc               # Prettier config
├── rollup.shared.js          # Shared Rollup plugins for browser packages
└── Makefile                  # Smoke test automation
```

## CI/CD

- **Unit/lint** (`.github/workflows/unit.yaml`): Runs on push/PR to `main`.
  Uses Nx affected analysis. Steps: `yarn install` → `yarn ci:build` →
  `yarn ci:lint` → `yarn ci:unit`
- **Smoke tests** (`.github/workflows/smoke.yaml`): Docker-based BATS tests
- **Release** (`.github/workflows/release.yaml`): Changesets action creates
  release PRs or publishes. Supports `next` snapshot/canary releases.
- **Pre-commit hook**: `lint-staged` runs `prettier --write` + `eslint --fix`
  on staged `.ts`/`.tsx` files

## Key Dependencies

- Node version: **v25** (specified in `.nvmrc`)
- OpenTelemetry SDK packages (`@opentelemetry/*`) — core instrumentation layer
- `rrweb` — session recording in the browser
- `winston` / `pino` — logger transport targets in `node-logger`
