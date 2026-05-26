# @hyperdx/otel-web-session-recorder

## 2.0.0

### Minor Changes

- aedb9ea: Upgrade all OpenTelemetry dependencies to latest versions (core/resources/sdk-trace-base/sdk-metrics to ^2.7.1, semantic-conventions to ^1.41.1, api to ^1.9.1). Migrates to v2 APIs: `resourceFromAttributes()` replaces `new Resource()`, updated semantic convention constants, updated resource detectors, and span processors passed via constructor options.

### Patch Changes

- df0ca02: Move `@babel/runtime` from runtime dependencies to devDependencies. The
  published CommonJS and ESM output (`dist/cjs/`, `dist/esm/`) is produced by
  `tsc` and does not reference `@babel/runtime` at all; only the unpublished
  Rollup IIFE bundle needed it. Keeping it as a runtime dependency forced
  consumers to install a vulnerable version of `@babel/runtime` (<7.26.10,
  GHSA-968p-4wvh-cqc8), surfacing as a moderate-severity finding in
  `npm audit`. With this change, a clean install of `@hyperdx/browser`,
  `@hyperdx/otel-web`, or `@hyperdx/otel-web-session-recorder` no longer
  pulls in the vulnerable `@babel/runtime` and `npm audit` is clean.
- Updated dependencies [df0ca02]
- Updated dependencies [aedb9ea]
  - @hyperdx/otel-web@0.18.0

## 1.0.1

### Patch Changes

- 43874fd: chore: Upgrade dependencies
- Updated dependencies [43874fd]
  - @hyperdx/otel-web@0.17.1

## 1.0.0

### Patch Changes

- Updated dependencies [057f3b9]
  - @hyperdx/otel-web@0.17.0

## 0.16.2

### Patch Changes

- 70c8508: fix: revert browser error span changes + remove sentry.version semantic attribute
- 606dd8e: chore: bump otel deps + remove @opentelemetry/exporter-zipkin
- 5f6af95: refactor: Rename error instrumentation fn name
- d8d5b82: chore: Add otel-web and session-recorder
- 398e858: feat: scripts to bump otel-web + session-recorder versions
- Updated dependencies [70c8508]
- Updated dependencies [7ec128c]
- Updated dependencies [606dd8e]
- Updated dependencies [5f6af95]
- Updated dependencies [d8d5b82]
- Updated dependencies [c05e520]
- Updated dependencies [398e858]
  - @hyperdx/otel-web@0.16.2

## 0.16.2-next.1

### Patch Changes

- 398e858: feat: scripts to bump otel-web + session-recorder versions
- Updated dependencies [7ec128c]
- Updated dependencies [398e858]
  - @hyperdx/otel-web@0.16.2-next.2

## 0.16.2-next.0

### Patch Changes

- 70c8508: fix: revert browser error span changes + remove sentry.version semantic attribute
- 606dd8e: chore: bump otel deps + remove @opentelemetry/exporter-zipkin
- 5f6af95: refactor: Rename error instrumentation fn name
- d8d5b82: chore: Add otel-web and session-recorder
- Updated dependencies [70c8508]
- Updated dependencies [606dd8e]
- Updated dependencies [5f6af95]
- Updated dependencies [d8d5b82]
  - @hyperdx/otel-web@0.16.2-next.0
