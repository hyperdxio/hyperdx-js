# @hyperdx/node-opentelemetry

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
