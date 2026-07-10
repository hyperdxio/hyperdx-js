# @hyperdx/otel-web-session-recorder

## 3.0.0

### Minor Changes

- 6a98ed1: Upgrade `rrweb` from `1.1.3` to `^2.1.0` (HDX-4696). rrweb 1.x transitively
  pinned `rrweb-snapshot@1.1.14`, which is flagged for CVE-2025-45806 (XSS in
  the replay-side `rebuild()` function, CVSS 6.1). No patched release exists in
  the 1.x line, so security scanners flagged every install of
  `@hyperdx/otel-web-session-recorder`. The recorder itself never invokes the
  vulnerable code path (it only records; replay happens in the HyperDX app,
  which already uses the rrweb 2.x line), but this upgrade removes the
  vulnerable package from the dependency tree entirely. Also declares the
  previously-phantom `@rrweb/types` and `rrweb-snapshot` type dependencies,
  since the published type declarations reference them. The recorder's public
  API (`init`/`resume`/`stop`/`deinit` and configuration options) is unchanged.

### Patch Changes

- Updated dependencies [c6e35c8]
  - @hyperdx/otel-web@0.19.0

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
