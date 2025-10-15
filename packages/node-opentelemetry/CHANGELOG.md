# @hyperdx/node-opentelemetry

## 0.9.0

### Minor Changes

- 2833fae: migration: follow telemetry.distro semantic convention (logs)

### Patch Changes

- aee67bc: feat: support gRPC protocol
- aee67bc: fix: pino trace linking issue

## 0.8.2

### Patch Changes

- 728e922: chore: update opentelemetry packages to v0.57

## 0.8.1

### Patch Changes

- 26ae2d9: feat: support OTEL_METRIC_EXPORT_INTERVAL and OTEL_METRIC_EXPORT_TIMEOUT

## 0.8.0

### Minor Changes

- f7cb5f9: feat: introduce exception capture - BETA
- 1092fca: style: deprecate hyperdx debug flag

### Patch Changes

- a574521: style: rename 'serviceName' to 'service'
- c7e012c: chore: bump pino-abstract-transport to v1.2.0
- 133dfd7: dx: init sdk programmatically - pt1
- 67a3a56: fix: read api key before init call (logger transports)
- 24a581e: feat: config logger
- 6b6ddd2: fix: sdk double patching issue
- 8a46140: feat: expose getEventProcessor api
- 70c8508: fix: revert browser error span changes + remove sentry.version semantic attribute
- 6b82cb1: feat: introduce internal profiling
- 7ec128c: style: move 'tracer', 'span', 'attributes' args to hint (recordException method)
- 1c956d4: fix: missing stacktrace context bug
- 7ce9e08: feat: add more exception tags
- 84612d5: feat: add disableStartupLogs flag
- d515c5a: fix: exception mechanism override bug
- 8125482: feat: introduce init func for programmatic imports
- 5614cc4: fix: remove sentry/core dep
- 606dd8e: chore: bump otel core to v1.24.1 + semantic-conventions to v1.24.1
- c8ecaea: fix: enable strictNullChecks
- d332c32: fix: console log uncaught exceptions
- 242afb2: fix: attach trace attributes onStart of span as well, dont overwrite attributes
- c7ea13c: fix: show service health dashboard URL
- f7183db: fix: rename onuncaughtexception error handler internal tag
- 1b37576: fix: check if addIntegration method exists
- ec4c4bb: fix: load api key and service name dynamically
- aee31d1: style: use HyperDXSpanProcessor
- 73a7d84: fix: sdk shutdown exception flushing issue
- 24dfee2: feat: Add mutable context manager for setTraceAttributes
- f84fd61: fix: introduce pino mixin function to handle trace/span id injection issue
- 93da1df: feat: import @hyperdx/instrumentation-exception pkg
- 34bb72b: fix: support sentry node v8
- 52dca89: fix: introduce exception.parsed_stacktrace semattr
- 24a581e: feat: improve CLI UI
- 7c9bd6a: feat: add instrumentation-exception pkg to node-opentelemetry
- 511a488: feat: install @hyperdx/instrumentation-sentry-node
- f47620f: feat: instrument console in the otel way
- Updated dependencies [a574521]
- Updated dependencies [5f6af95]
- Updated dependencies [a93c519]
- Updated dependencies [8a46140]
- Updated dependencies [70c8508]
- Updated dependencies [feb4ef1]
- Updated dependencies [7ec128c]
- Updated dependencies [535410c]
- Updated dependencies [52dca89]
- Updated dependencies [1c956d4]
- Updated dependencies [eb04eb3]
- Updated dependencies [d515c5a]
- Updated dependencies [93da1df]
- Updated dependencies [5614cc4]
- Updated dependencies [606dd8e]
- Updated dependencies [6b6ddd2]
- Updated dependencies [feb4ef1]
- Updated dependencies [d332c32]
- Updated dependencies [eb04eb3]
- Updated dependencies [f7183db]
- Updated dependencies [a574521]
- Updated dependencies [1b37576]
- Updated dependencies [73a7d84]
- Updated dependencies [e582ad1]
- Updated dependencies [c05e520]
- Updated dependencies [3bca092]
- Updated dependencies [52dca89]
- Updated dependencies [e9f867f]
- Updated dependencies [e36309d]
  - @hyperdx/instrumentation-exception@0.1.0
  - @hyperdx/instrumentation-sentry-node@0.1.0

## 0.8.0-next.15

### Patch Changes

- 84612d5: feat: add disableStartupLogs flag
- c7ea13c: fix: show service health dashboard URL

## 0.8.0-next.14

### Patch Changes

- 6b6ddd2: fix: sdk double patching issue
- d332c32: fix: console log uncaught exceptions
- f7183db: fix: rename onuncaughtexception error handler internal tag
- 1b37576: fix: check if addIntegration method exists
- 73a7d84: fix: sdk shutdown exception flushing issue
- f84fd61: fix: introduce pino mixin function to handle trace/span id injection issue
- Updated dependencies [6b6ddd2]
- Updated dependencies [d332c32]
- Updated dependencies [f7183db]
- Updated dependencies [1b37576]
- Updated dependencies [73a7d84]
  - @hyperdx/instrumentation-sentry-node@0.1.0-next.8
  - @hyperdx/instrumentation-exception@0.1.0-next.12

## 0.8.0-next.13

### Patch Changes

- 7ec128c: style: move 'tracer', 'span', 'attributes' args to hint (recordException method)
- Updated dependencies [7ec128c]
  - @hyperdx/instrumentation-exception@0.1.0-next.11

## 0.8.0-next.12

### Patch Changes

- a574521: style: rename 'serviceName' to 'service'
- 67a3a56: fix: read api key before init call (logger transports)
- 70c8508: fix: revert browser error span changes + remove sentry.version semantic attribute
- 606dd8e: chore: bump otel core to v1.24.1 + semantic-conventions to v1.24.1
- 242afb2: fix: attach trace attributes onStart of span as well, dont overwrite attributes
- ec4c4bb: fix: load api key and service name dynamically
- Updated dependencies [a574521]
- Updated dependencies [5f6af95]
- Updated dependencies [70c8508]
- Updated dependencies [606dd8e]
- Updated dependencies [a574521]
  - @hyperdx/instrumentation-exception@0.1.0-next.9
  - @hyperdx/instrumentation-sentry-node@0.1.0-next.7

## 0.8.0-next.11

### Patch Changes

- 24a581e: feat: config logger
- 8125482: feat: introduce init func for programmatic imports
- 52dca89: fix: introduce exception.parsed_stacktrace semattr
- 24a581e: feat: improve CLI UI
- Updated dependencies [535410c]
- Updated dependencies [52dca89]
- Updated dependencies [52dca89]
  - @hyperdx/instrumentation-exception@0.1.0-next.7
  - @hyperdx/instrumentation-sentry-node@0.1.0-next.6

## 0.8.0-next.10

### Patch Changes

- d515c5a: fix: exception mechanism override bug
- c8ecaea: fix: enable strictNullChecks
- 24dfee2: feat: Add mutable context manager for setTraceAttributes
- Updated dependencies [d515c5a]
  - @hyperdx/instrumentation-exception@0.1.0-next.6

## 0.8.0-next.9

### Patch Changes

- 5614cc4: fix: remove sentry/core dep
- Updated dependencies [5614cc4]
  - @hyperdx/instrumentation-sentry-node@0.1.0-next.5
  - @hyperdx/instrumentation-exception@0.1.0-next.5

## 0.8.0-next.8

### Patch Changes

- 1c956d4: fix: missing stacktrace context bug
- 7c9bd6a: feat: add instrumentation-exception pkg to node-opentelemetry
- Updated dependencies [1c956d4]
- Updated dependencies [e36309d]
  - @hyperdx/instrumentation-sentry-node@0.1.0-next.4
  - @hyperdx/instrumentation-exception@0.1.0-next.4

## 0.8.0-next.7

### Patch Changes

- Updated dependencies [feb4ef1]
- Updated dependencies [feb4ef1]
  - @hyperdx/instrumentation-sentry-node@0.1.0-next.1

## 0.8.0-next.6

### Patch Changes

- 8a46140: feat: expose getEventProcessor api
- Updated dependencies [8a46140]
  - @hyperdx/instrumentation-sentry-node@0.0.1-next.0

## 0.8.0-next.5

### Patch Changes

- c7e012c: chore: bump pino-abstract-transport to v1.2.0

## 0.8.0-next.4

### Patch Changes

- 511a488: feat: install @hyperdx/instrumentation-sentry-node
- f47620f: feat: instrument console in the otel way

## 0.8.0-next.3

### Minor Changes

- 1092fca: style: deprecate hyperdx debug flag

### Patch Changes

- 133dfd7: dx: init sdk programmatically - pt1
- 6b82cb1: feat: introduce internal profiling
- aee31d1: style: use HyperDXSpanProcessor
- 93da1df: feat: import @hyperdx/instrumentation-exception pkg
- Updated dependencies [a93c519]
- Updated dependencies [93da1df]
- Updated dependencies [3bca092]
  - @hyperdx/instrumentation-exception@0.1.0-next.0

## 0.8.0-next.2

### Patch Changes

- 7ce9e08: feat: add more exception tags

## 0.8.0-next.1

### Patch Changes

- 34bb72b: fix: support sentry node v8

## 0.8.0-next.0

### Minor Changes

- f7cb5f9: feat: introduce exception capture - BETA

## 0.7.0

### Minor Changes

- 26396ee: chore: bump otel deps + uninstall hdx node-logger
- 43aab55: feat + migration: Use Otel logs module

### Patch Changes

- 0073937: fix: adjust logs default send interval
- a2ebf6a: fix: disable console instrumentation if otel debug mode is on
- a2ebf6a: style: move all constants to one file
- 9bf6c3b: fix: inject HYPERDX_API_KEY if specified (winston/pino transport)

## 0.7.0-next.4

### Patch Changes

- a2ebf6a: fix: disable console instrumentation if otel debug mode is on
- a2ebf6a: style: move all constants to one file

## 0.7.0-next.3

### Minor Changes

- 26396ee: chore: bump otel deps + uninstall hdx node-logger

## 0.7.0-next.2

### Patch Changes

- fix: adjust logs default send interval
- Updated dependencies
  - @hyperdx/node-logger@0.4.0-next.1

## 0.7.0-next.1

### Patch Changes

- 9bf6c3b: fix: inject HYPERDX_API_KEY if specified (winston/pino transport)

## 0.7.0-next.0

### Minor Changes

- 43aab55: feat + migration: Use Otel logs module

### Patch Changes

- Updated dependencies [43aab55]
  - @hyperdx/node-logger@0.4.0-next.0

## 0.6.2

### Patch Changes

- 517dccf: fix: nested winston import
- Updated dependencies [50fc7ac]
  - @hyperdx/node-logger@0.3.2

## 0.6.2-next.0

### Patch Changes

- 517dccf: fix: nested winston import
- Updated dependencies [50fc7ac]
  - @hyperdx/node-logger@0.3.2-next.0

## 0.6.1

### Patch Changes

- ed6ac60: fix: rename getWinsonTransport to getWinstonTransport

## 0.6.0

### Minor Changes

- 80f1646: chore: bump @opentelemetry/auto-instrumentations-node to v0.41.1

### Patch Changes

- c8df2e5: feat: add pkg + runtime version to resource

## 0.6.0-next.0

### Minor Changes

- 80f1646: chore: bump @opentelemetry/auto-instrumentations-node to v0.41.1

### Patch Changes

- c8df2e5: feat: add pkg + runtime version to resource

## 0.5.0

### Minor Changes

- f2b039c: chore: bump otel deps

### Patch Changes

- f2b039c: fix: manual instrumentation trace propagation bug

## 0.5.0-next.0

### Minor Changes

- f2b039c: chore: bump otel deps

### Patch Changes

- f2b039c: fix: manual instrumentation trace propagation bug

## 0.4.2

### Patch Changes

- ebc8da6: chore: bump node-logger
- 610e003: fix: pipe readable stream bug (advanced network capture)
- 4b74d88: fix: bump @opentelemetry/instrumentation-net pkg + silence otel logs by default
- Updated dependencies [ebc8da6]
- Updated dependencies [ebc8da6]
  - @hyperdx/node-logger@0.3.0

## 0.4.2-next.2

### Patch Changes

- 610e003: fix: pipe readable stream bug (advanced network capture)

## 0.4.2-next.1

### Patch Changes

- 4b74d88: fix: bump @opentelemetry/instrumentation-net pkg + silence otel logs by default

## 0.4.2-next.0

### Patch Changes

- ebc8da6: chore: bump node-logger
- Updated dependencies [ebc8da6]
- Updated dependencies [ebc8da6]
  - @hyperdx/node-logger@0.3.0-next.0

## 0.4.1

### Patch Changes

- f7d004d: fix: hdx log ts in Date string format
- af4dccb: fix: logger timestamp bug
- Updated dependencies [f7d004d]
- Updated dependencies [af4dccb]
  - @hyperdx/node-logger@0.2.9

## 0.4.1-next.1

### Patch Changes

- f7d004d: fix: hdx log ts in Date string format
- Updated dependencies [f7d004d]
  - @hyperdx/node-logger@0.2.9-next.1

## 0.4.1-next.0

### Patch Changes

- af4dccb: fix: logger timestamp bug
- Updated dependencies [af4dccb]
  - @hyperdx/node-logger@0.2.9-next.0

## 0.4.0

### Minor Changes

- 3076d37: feat: attach trace id to console log + gcp cloud function event handler

### Patch Changes

- 12331f7: Add custom shutdown handler, capture SIGINT termination signal by default for graceful shutdown.
- 6ce51f1: fix: export gcp modules
- b654d4e: Adding additional instrumentation logic

## 0.4.0-next.3

### Patch Changes

- 6ce51f1: fix: export gcp modules

## 0.4.0-next.2

### Minor Changes

- 3076d37: feat: attach trace id to console log + gcp cloud function event handler

## 0.3.4-next.1

### Patch Changes

- b654d4e: Adding additional instrumentation logic

## 0.3.4-next.0

### Patch Changes

- 12331f7: Add custom shutdown handler, capture SIGINT termination signal by default for graceful shutdown.

## 0.3.3

### Patch Changes

- f165973: rollback: downgrade otel auto-instrumentation pkg to v0.37.1
- f7f3773: fix: rollback deps to tag v0.1.9 + disable hdx context features by default

## 0.3.3-next.1

### Patch Changes

- f7f3773: fix: rollback deps to tag v0.1.9 + disable hdx context features by default

## 0.3.3-next.0

### Patch Changes

- f165973: rollback: downgrade otel auto-instrumentation pkg to v0.37.1

## 0.3.2

### Patch Changes

- 79b89fd: chore: lock otel pkgs version

## 0.3.1

### Patch Changes

- 6aba0db: fix: install otel child deps

## 0.3.0

### Minor Changes

- 115f0b9: perf: reduce network usage
- 8cee56f: chore: bump @opentelemetry/auto-instrumentations-node + semantic-conventions

## 0.2.3

### Patch Changes

- 07f0e71: fix: node-logger conflicts (init multiple times)
- Updated dependencies [07f0e71]
  - @hyperdx/node-logger@0.2.8

## 0.2.2

### Patch Changes

- fix: disable custom attrs injection for pino transport

## 0.2.1

### Patch Changes

- 4b62517: fix: init global context after otel sdk

## 0.2.0

### Minor Changes

- 425b0a8: chore: bump @opentelemetry deps versions
- 425b0a8: feat: HyperDX console instrumentation (refactoring) + http instrumentation (advanced network capture)

### Patch Changes

- 57748c5: feat + fix: handle gzip content encoding + readable streaming
- a9a1bdc: style: capture response headers in 'end' event
- 366e5c3: feat: setTraceAttributes user-facing API
- 425b0a8: fix: attach trace/span id to console logs
- 56906da: fix: more try-catch in instrumentation codes
- 6b4406b: fix: disable outgoing response body capture for now
- a9a1bdc: fix: regiester stream data event listern in next iteration of event loop
- 366e5c3: feat: add trace attributes to console + logger
- Updated dependencies [366e5c3]
  - @hyperdx/node-logger@0.2.7

## 0.2.0-next.5

### Patch Changes

- fix: disable outgoing response body capture for now

## 0.2.0-next.4

### Patch Changes

- 57748c5: feat + fix: handle gzip content encoding + readable streaming

## 0.2.0-next.3

### Patch Changes

- 366e5c3: feat: setTraceAttributes user-facing API
- 366e5c3: feat: add trace attributes to console + logger
- Updated dependencies [366e5c3]
  - @hyperdx/node-logger@0.2.7-next.0

## 0.2.0-next.2

### Patch Changes

- a9a1bdc: style: capture response headers in 'end' event
- a9a1bdc: fix: regiester stream data event listern in next iteration of event loop

## 0.2.0-next.1

### Patch Changes

- 56906da: fix: more try-catch in instrumentation codes

## 0.2.0-next.0

### Minor Changes

- 425b0a8: chore: bump @opentelemetry deps versions
- 425b0a8: feat: HyperDX console instrumentation (refactoring) + http instrumentation (advanced network capture)

### Patch Changes

- 425b0a8: fix: attach trace/span id to console logs

## 0.1.9

### Patch Changes

- 34d8d5e: feat: expose 'bufferSize', 'sendIntervalMs' and 'timeout' logger options
- Updated dependencies [34d8d5e]
  - @hyperdx/node-logger@0.2.6

## 0.1.8

### Patch Changes

- 8863dab: feat: debug mode
- Updated dependencies [90da807]
- Updated dependencies [8863dab]
  - @hyperdx/node-logger@0.2.5

## 0.1.7

### Patch Changes

- 6a32017: chore: bump deps
- 8a20b01: chore: bump otel pkgs
- 6a32017: feat: improve alert messages
- Updated dependencies [6a32017]
  - @hyperdx/node-logger@0.2.4

## 0.1.7-next.1

### Patch Changes

- 8a20b01: chore: bump otel pkgs

## 0.1.7-next.0

### Patch Changes

- 6a32017: chore: bump deps
- 6a32017: feat: improve alert messages
- Updated dependencies [6a32017]
  - @hyperdx/node-logger@0.2.4-next.0

## 0.1.6

### Patch Changes

- chore: bump node-logger to v0.2.3

## 0.1.5

### Patch Changes

- 05f001b: feat: print out otel SDK configs
- Updated dependencies [05f001b]
  - @hyperdx/node-logger@0.2.2

## 0.1.4

### Patch Changes

- 74920d4: feat: add metrics file
- 74920d4: fix: disable fs instrumentation
- 74920d4: style: use built-in resource detectors from @opentelemetry/auto-instrumentations-node

## 0.1.3

### Patch Changes

- chore: bump node-logger

## 0.1.2

### Patch Changes

- d504b14: feat: extend trace exporter timeout
- Updated dependencies [982587e]
  - @hyperdx/node-logger@0.2.0

## 0.1.1

### Patch Changes

- fix: attach default otel envs

## 0.1.0

### Minor Changes

- 63467c3: feat: add resource detectors

## 0.0.10

### Patch Changes

- Updated dependencies [404afcd]
  - @hyperdx/node-logger@0.1.0

## 0.0.9

### Patch Changes

- Updated dependencies [b0c2a4c]
  - @hyperdx/node-logger@0.0.10

## 0.0.8

### Patch Changes

- fix: pino transport integration

## 0.0.7

### Patch Changes

- b0a4cff: doc: update README
- afe3bfd: feat: add pino transport
- Updated dependencies [afe3bfd]
  - @hyperdx/node-logger@0.0.9

## 0.0.6

### Patch Changes

- 7bf4889: fix: winston logger conflict
- Updated dependencies [7bf4889]
  - @hyperdx/node-logger@0.0.8

## 0.0.5

### Patch Changes

- da72add: fix: parse console log

## 0.0.4

### Patch Changes

- 955b893: feat: capture console log events

## 0.0.3

### Patch Changes

- 262ea14: feat: add getWinsonTransport
- 3cef441: feat: set default otel endpoint

## 0.0.2

### Patch Changes

- fix: install tslib

## 0.0.1

### Patch Changes

- 6accd2a: chore: release v0.0.1
