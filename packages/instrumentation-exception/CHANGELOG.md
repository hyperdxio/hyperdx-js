# @hyperdx/instrumentation-exception

## 0.1.0

### Minor Changes

- a93c519: feat: introduce @hyperdx/instrumentation-exception pkg
- feb4ef1: feat: introduce recordException api + handle uncaughtException + unhandledRejection
- 52dca89: fix: introduce exception.parsed_stacktrace semattr

### Patch Changes

- a574521: fix: tracer forcecFlush bug (exception)
- 5f6af95: refactor: Rename error instrumentation fn name for filtering out
- 70c8508: fix: revert browser error span changes + remove sentry.version semantic attribute
- 7ec128c: style: move 'tracer', 'span', 'attributes' args to hint (recordException method)
- 535410c: feat: add exceptions filtering to hyperdx integration (browser)
- 1c956d4: fix: missing stacktrace context bug
- d515c5a: fix: exception mechanism override bug
- 93da1df: style: access tracer from the class level
- 5614cc4: fix: remove sentry/core dep
- 606dd8e: chore: bump otel core to v1.24.1 + semantic-conventions to v1.24.1
- d332c32: fix: console log uncaught exceptions
- eb04eb3: feat: support passing existing span to recordException
- f7183db: fix: rename onuncaughtexception error handler internal tag
- a574521: feat: support exitEvenIfOtherHandlersAreRegistered + unhandledRejectionMode configs
- 73a7d84: fix: sdk shutdown exception flushing issue
- e582ad1: feat: support custom attrs
- c05e520: fix: end span properly after calling recordException
- 3bca092: fix: only register sentry event processor once
- e9f867f: feat: Disable fn name minifying + attempt to filter out sdk frames + add HyperDXErrorInstrumentation
- e36309d: feat: export express + koa error handlers
- Updated dependencies [8a46140]
- Updated dependencies [70c8508]
- Updated dependencies [feb4ef1]
- Updated dependencies [52dca89]
- Updated dependencies [1c956d4]
- Updated dependencies [eb04eb3]
- Updated dependencies [5614cc4]
- Updated dependencies [606dd8e]
- Updated dependencies [6b6ddd2]
- Updated dependencies [feb4ef1]
- Updated dependencies [1b37576]
- Updated dependencies [e582ad1]
  - @hyperdx/instrumentation-sentry-node@0.1.0

## 0.1.0-next.12

### Patch Changes

- d332c32: fix: console log uncaught exceptions
- f7183db: fix: rename onuncaughtexception error handler internal tag
- 73a7d84: fix: sdk shutdown exception flushing issue
- Updated dependencies [6b6ddd2]
- Updated dependencies [1b37576]
  - @hyperdx/instrumentation-sentry-node@0.1.0-next.8

## 0.1.0-next.11

### Patch Changes

- 7ec128c: style: move 'tracer', 'span', 'attributes' args to hint (recordException method)

## 0.1.0-next.10

### Patch Changes

- c05e520: fix: end span properly after calling recordException

## 0.1.0-next.9

### Patch Changes

- a574521: fix: tracer forcecFlush bug (exception)
- 5f6af95: refactor: Rename error instrumentation fn name for filtering out
- 70c8508: fix: revert browser error span changes + remove sentry.version semantic attribute
- 606dd8e: chore: bump otel core to v1.24.1 + semantic-conventions to v1.24.1
- a574521: feat: support exitEvenIfOtherHandlersAreRegistered + unhandledRejectionMode configs
- Updated dependencies [70c8508]
- Updated dependencies [606dd8e]
  - @hyperdx/instrumentation-sentry-node@0.1.0-next.7

## 0.1.0-next.8

### Patch Changes

- e9f867f: feat: Disable fn name minifying + attempt to filter out sdk frames + add HyperDXErrorInstrumentation

## 0.1.0-next.7

### Minor Changes

- 52dca89: fix: introduce exception.parsed_stacktrace semattr

### Patch Changes

- 535410c: feat: add exceptions filtering to hyperdx integration (browser)
- Updated dependencies [52dca89]
  - @hyperdx/instrumentation-sentry-node@0.1.0-next.6

## 0.1.0-next.6

### Patch Changes

- d515c5a: fix: exception mechanism override bug

## 0.1.0-next.5

### Patch Changes

- 5614cc4: fix: remove sentry/core dep
- Updated dependencies [5614cc4]
  - @hyperdx/instrumentation-sentry-node@0.1.0-next.5

## 0.1.0-next.4

### Patch Changes

- 1c956d4: fix: missing stacktrace context bug
- e36309d: feat: export express + koa error handlers
- Updated dependencies [1c956d4]
  - @hyperdx/instrumentation-sentry-node@0.1.0-next.4

## 0.1.0-next.3

### Patch Changes

- e582ad1: feat: support custom attrs
- Updated dependencies [e582ad1]
  - @hyperdx/instrumentation-sentry-node@0.1.0-next.3

## 0.1.0-next.2

### Patch Changes

- eb04eb3: feat: support passing existing span to recordException
- Updated dependencies [eb04eb3]
  - @hyperdx/instrumentation-sentry-node@0.1.0-next.2

## 0.1.0-next.1

### Minor Changes

- feb4ef1: feat: introduce recordException api + handle uncaughtException + unhandledRejection

### Patch Changes

- Updated dependencies [feb4ef1]
- Updated dependencies [feb4ef1]
  - @hyperdx/instrumentation-sentry-node@0.1.0-next.1

## 0.1.0-next.0

### Minor Changes

- a93c519: feat: introduce @hyperdx/instrumentation-exception pkg

### Patch Changes

- 93da1df: style: access tracer from the class level
- 3bca092: fix: only register sentry event processor once
