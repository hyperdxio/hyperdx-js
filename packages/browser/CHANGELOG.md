# @hyperdx/browser

## 0.25.2

### Patch Changes

- Updated dependencies [3f6bace]
  - @hyperdx/otel-web@0.20.0
  - @hyperdx/otel-web-session-recorder@4.0.0

## 0.25.1

### Patch Changes

- 9de609b: feat: Add rrweb replay config

## 0.25.0

### Minor Changes

- 61bc742: Expose the rrweb `blockSelector` option through the browser SDK config. You can
  now pass `blockSelector` to `HyperDX.init(...)` to block session-recording of
  elements matching a CSS selector (complementing the existing `blockClass`). The
  value is forwarded to the session recorder; omit it to keep the previous
  behavior. Improved documentation by adding description for `blockClass` alongside
  new `blockSelector` property.

### Patch Changes

- Updated dependencies [6a98ed1]
- Updated dependencies [c6e35c8]
  - @hyperdx/otel-web-session-recorder@3.0.0
  - @hyperdx/otel-web@0.19.0

## 0.24.0

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
  - @hyperdx/otel-web-session-recorder@2.0.0
  - @hyperdx/otel-web@0.18.0

## 0.23.1

### Patch Changes

- Updated dependencies [43874fd]
  - @hyperdx/otel-web@0.17.1
  - @hyperdx/otel-web-session-recorder@1.0.1

## 0.23.0

### Minor Changes

- 057f3b9: Emit FCP and TTFB Core Web Vitals from the browser RUM SDK. The bundled
  `web-vitals` library already exports `onFCP` and `onTTFB`; `initWebVitals`
  now registers callbacks for them alongside the existing LCP / INP / CLS / FID
  ones. Each new metric lands as a `webvitals` span with the value on a single
  attribute (`fcp` or `ttfb`), matching the existing pattern.

### Patch Changes

- Updated dependencies [057f3b9]
  - @hyperdx/otel-web@0.17.0
  - @hyperdx/otel-web-session-recorder@1.0.0

## 0.22.1

### Patch Changes

- e1b1508: Support per-signal OTLP exporter endpoints in hyperdx/browser
- Updated dependencies [b940c5c]
  - @hyperdx/otel-web@0.16.4

## 0.22.0

### Minor Changes

- d726266: Added an optional otelResourceAttributes array to the BrowserSDKConfig type.

## 0.21.2

### Patch Changes

- Updated dependencies [fac5e58]
  - @hyperdx/otel-web@0.16.3

## 0.21.1

### Patch Changes

- fbe054e: feat: expose `getSessionId` + `stopSessionRecorder` + `resumeSessionRecorder` methods, add `recordCanvas` + `sampling` options

## 0.21.0

### Minor Changes

- 6328ebe: chore: bump otel web to v0.16.2-19

### Patch Changes

- 7e00faf: feat: React ErrorBoundary support
- 5f6af95: refactor: Rename error instrumentation fn name for filtering out
- 70c8508: fix: revert browser error span changes + remove sentry.version semantic attribute
- 7ec128c: style: move 'tracer', 'span', 'attributes' args to hint (recordException method)
- 606dd8e: chore: bump otel deps + remove @opentelemetry/exporter-zipkin
- 5f6af95: refactor: Rename error instrumentation fn name
- d8d5b82: chore: Add otel-web and session-recorder
- c05e520: fix: end span properly after calling recordException
- 398e858: feat: scripts to bump otel-web + session-recorder versions
- f55af3b: Add ignoreUrls config
- 23e3ef9: chore: bump otel-web + otel-web-session-recorder pkgs to v0.16.2-20
- Updated dependencies [70c8508]
- Updated dependencies [7ec128c]
- Updated dependencies [606dd8e]
- Updated dependencies [5f6af95]
- Updated dependencies [d8d5b82]
- Updated dependencies [c05e520]
- Updated dependencies [398e858]
  - @hyperdx/otel-web@0.16.2
  - @hyperdx/otel-web-session-recorder@0.16.2

## 0.21.0-next.5

### Patch Changes

- 7ec128c: style: move 'tracer', 'span', 'attributes' args to hint (recordException method)
- 398e858: feat: scripts to bump otel-web + session-recorder versions
- Updated dependencies [7ec128c]
- Updated dependencies [398e858]
  - @hyperdx/otel-web@0.16.2-next.2
  - @hyperdx/otel-web-session-recorder@0.16.2-next.1

## 0.21.0-next.4

### Patch Changes

- c05e520: fix: end span properly after calling recordException
- Updated dependencies [c05e520]
  - @hyperdx/otel-web@0.16.2-next.1

## 0.21.0-next.3

### Patch Changes

- 5f6af95: refactor: Rename error instrumentation fn name for filtering out
- 70c8508: fix: revert browser error span changes + remove sentry.version semantic attribute
- 606dd8e: chore: bump otel deps + remove @opentelemetry/exporter-zipkin
- 5f6af95: refactor: Rename error instrumentation fn name
- d8d5b82: chore: Add otel-web and session-recorder
- Updated dependencies [70c8508]
- Updated dependencies [606dd8e]
- Updated dependencies [5f6af95]
- Updated dependencies [d8d5b82]
  - @hyperdx/otel-web@0.16.2-next.0
  - @hyperdx/otel-web-session-recorder@0.16.2-next.0

## 0.21.0-next.2

### Patch Changes

- 23e3ef9: chore: bump otel-web + otel-web-session-recorder pkgs to v0.16.2-20

## 0.21.0-next.1

### Minor Changes

- 6328ebe: chore: bump otel web to v0.16.2-19

## 0.20.1-next.0

### Patch Changes

- f55af3b: Add ignoreUrls config

## 0.20.0

### Minor Changes

- b0ab3d8: chore: bump @hyperdx/otel-web + @hyperdx/otel-web-session-recorder versions

## 0.19.3

### Patch Changes

- 0fc0cb2: fix: unmet otel deps issue

## 0.19.3-next.0

### Patch Changes

- 0fc0cb2: fix: unmet otel deps issue

## 0.19.2

### Patch Changes

- 3b7dcd4: chore: bump hyperdx otel pkg to v0.16.2-16
- 298dbba: chore: bump hyperdx otel pkg to v0.16.2-14

## 0.19.2-next.1

### Patch Changes

- 3b7dcd4: chore: bump hyperdx otel pkg to v0.16.2-16

## 0.19.2-next.0

### Patch Changes

- 298dbba: chore: bump hyperdx otel pkg to v0.16.2-14

## 0.19.1

### Patch Changes

- 45301c5: fix: protobufjs eval issue

## 0.19.1-next.0

### Patch Changes

- 45301c5: fix: protobufjs eval issue

## 0.19.0

### Minor Changes

- 08d09db: perf: disable experimentalExceptionCapture functionality to reduce bundle size

## 0.18.4

### Patch Changes

- 7bd07db: fix: Add rate limiting for spammy rrweb events

## 0.18.4-next.0

### Patch Changes

- 7bd07db: fix: Add rate limiting for spammy rrweb events

## 0.18.3

### Patch Changes

- 2c868f5: feat: enable network capture dynamically

## 0.18.2

### Patch Changes

- 1a15905: chore: bump hdx otel pkg to v0.16.2-7
- 259d57e: Fix recursive console capture bug, add debug flag for verbose logging.
- 77e23b0: chore: bump child otel web pkgs
- 22e51b0: rollback: hdx otel dep to v0.16.2-5
- c5b5757: feat: advanced network capture + experimental exception capture
- 3ebd390: chore: bump hdx otel pkg to v0.16.2-9
- 4c4054b: chore: bump hdx otel pkg to v0.16.2-8
- 379f561: chore: bump hdx otel pkg
- 22b125a: chore: bump hdx otel pkg to 0.16.2-6
- e5a9931: Warn when API key is missing

## 0.18.2-next.9

### Patch Changes

- chore: bump hdx otel pkg

## 0.18.2-next.8

### Patch Changes

- chore: bump hdx otel pkg to v0.16.2-9

## 0.18.2-next.7

### Patch Changes

- rollback: hdx otel dep to v0.16.2-5

## 0.18.2-next.6

### Patch Changes

- chore: bump hdx otel pkg to v0.16.2-8

## 0.18.2-next.5

### Patch Changes

- chore: bump hdx otel pkg to v0.16.2-7

## 0.18.2-next.4

### Patch Changes

- 22b125a: chore: bump hdx otel pkg to 0.16.2-6

## 0.18.2-next.3

### Patch Changes

- c5b5757: feat: advanced network capture + experimental exception capture

## 0.18.2-next.2

### Patch Changes

- e5a9931: Warn when API key is missing

## 0.18.2-next.1

### Patch Changes

- 77e23b0: chore: bump child otel web pkgs

## 0.18.2-next.0

### Patch Changes

- 259d57e: Fix recursive console capture bug, add debug flag for verbose logging.

## 0.18.1

### Patch Changes

- 842eaa8: fix: reflect attributes arg type (addAction)

## 0.18.0

### Minor Changes

- 9e5d1c2: feat: enable page visibility + console instrumentation

## 0.17.0

### Minor Changes

- 12bf328: Add Intercom Integration

## 0.17.0-next.0

### Minor Changes

- 12bf328: Add Intercom Integration

## 0.16.2

### Patch Changes

- f892ad1: Add `instrumentations`, `disableReplay` and `block/ignore/maskClass` options

## 0.16.2-next.0

### Patch Changes

- f892ad1: Add `instrumentations`, `disableReplay` and `block/ignore/maskClass` options

## 0.16.1

### Patch Changes

- chore: Update otel-web to 0.16.1 to improve timing accuracy

## 0.16.0

### Minor Changes

- chore: Update otel-web to 0.16.0 to update opentelemetry-js dependencies

## 0.14.5

### Patch Changes

- 8a6e86c: fix: Add trace propagation URL to XHR requests

## 0.14.4

### Patch Changes

- a7099d7: fix: wrong URL_BASE

## 0.14.3

### Patch Changes

- 7850d77: Reduce browser bundle size

## 0.14.2

### Patch Changes

- b12716a: Upgrade otel-web to 0.14.1 to fix Sentry compat issue

## 0.14.1

### Patch Changes

- 14b2640: Switch bundling to Rollup
