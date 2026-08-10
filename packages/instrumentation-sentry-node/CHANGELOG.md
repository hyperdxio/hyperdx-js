# @hyperdx/instrumentation-sentry-node

## 0.2.1

### Patch Changes

- c070751: Remove private `@opentelemetry/sdk-trace-base/build/src/enums` import that broke `require()` on a clean install when `sdk-trace-base` floats to 2.9.0 (#2630). Import the stable public `EVENT_EXCEPTION` constant from `@opentelemetry/semantic-conventions` (already a declared dependency) instead.

## 0.2.0

### Minor Changes

- aedb9ea: Upgrade all OpenTelemetry dependencies to latest versions (core/resources/sdk-trace-base/sdk-metrics to ^2.7.1, semantic-conventions to ^1.41.1, api to ^1.9.1). Migrates to v2 APIs: `resourceFromAttributes()` replaces `new Resource()`, updated semantic convention constants, updated resource detectors, and span processors passed via constructor options.

## 0.1.0

### Minor Changes

- 52dca89: fix: introduce exception.parsed_stacktrace semattr
- feb4ef1: feat: introduce recordException api + handle uncaughtException + unhandledRejection

### Patch Changes

- 8a46140: feat: expose getEventProcessor api
- 70c8508: fix: revert browser error span changes + remove sentry.version semantic attribute
- feb4ef1: perf: remove unnecessary sentry node peer dep
- 1c956d4: fix: missing stacktrace context bug
- eb04eb3: feat: export more helpers
- 5614cc4: fix: remove sentry/core dep
- 606dd8e: chore: bump otel core to v1.24.1 + semantic-conventions to v1.24.1
- 6b6ddd2: fix: sentry node instrumentation version support
- 1b37576: fix: check if addIntegration method exists
- e582ad1: feat: support custom attrs

## 0.1.0-next.8

### Patch Changes

- 6b6ddd2: fix: sentry node instrumentation version support
- 1b37576: fix: check if addIntegration method exists

## 0.1.0-next.7

### Patch Changes

- 70c8508: fix: revert browser error span changes + remove sentry.version semantic attribute
- 606dd8e: chore: bump otel core to v1.24.1 + semantic-conventions to v1.24.1

## 0.1.0-next.6

### Minor Changes

- 52dca89: fix: introduce exception.parsed_stacktrace semattr

## 0.1.0-next.5

### Patch Changes

- 5614cc4: fix: remove sentry/core dep

## 0.1.0-next.4

### Patch Changes

- 1c956d4: fix: missing stacktrace context bug

## 0.1.0-next.3

### Patch Changes

- e582ad1: feat: support custom attrs

## 0.1.0-next.2

### Patch Changes

- eb04eb3: feat: export more helpers

## 0.1.0-next.1

### Minor Changes

- feb4ef1: feat: introduce recordException api + handle uncaughtException + unhandledRejection

### Patch Changes

- feb4ef1: perf: remove unnecessary sentry node peer dep

## 0.0.1-next.0

### Patch Changes

- 8a46140: feat: expose getEventProcessor api
