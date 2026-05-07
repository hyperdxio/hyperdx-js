# @hyperdx/otel-web

## 0.17.0

### Minor Changes

- 057f3b9: Emit FCP and TTFB Core Web Vitals from the browser RUM SDK. The bundled
  `web-vitals` library already exports `onFCP` and `onTTFB`; `initWebVitals`
  now registers callbacks for them alongside the existing LCP / INP / CLS / FID
  ones. Each new metric lands as a `webvitals` span with the value on a single
  attribute (`fcp` or `ttfb`), matching the existing pattern.

### Patch Changes

- Updated dependencies [65be0bd]
  - @hyperdx/instrumentation-exception@0.2.0

## 0.16.4

### Patch Changes

- b940c5c: Fix addAction crash when called without optional attributes argument

## 0.16.3

### Patch Changes

- fac5e58: fix: handle xhr responseText exception

## 0.16.2

### Patch Changes

- 70c8508: fix: revert browser error span changes + remove sentry.version semantic attribute
- 7ec128c: style: move 'tracer', 'span', 'attributes' args to hint (recordException method)
- 606dd8e: chore: bump otel deps + remove @opentelemetry/exporter-zipkin
- 5f6af95: refactor: Rename error instrumentation fn name
- d8d5b82: chore: Add otel-web and session-recorder
- c05e520: fix: end span properly after calling recordException
- 398e858: feat: scripts to bump otel-web + session-recorder versions
- Updated dependencies [a574521]
- Updated dependencies [5f6af95]
- Updated dependencies [a93c519]
- Updated dependencies [70c8508]
- Updated dependencies [7ec128c]
- Updated dependencies [535410c]
- Updated dependencies [1c956d4]
- Updated dependencies [d515c5a]
- Updated dependencies [93da1df]
- Updated dependencies [5614cc4]
- Updated dependencies [606dd8e]
- Updated dependencies [feb4ef1]
- Updated dependencies [d332c32]
- Updated dependencies [eb04eb3]
- Updated dependencies [f7183db]
- Updated dependencies [a574521]
- Updated dependencies [73a7d84]
- Updated dependencies [e582ad1]
- Updated dependencies [c05e520]
- Updated dependencies [3bca092]
- Updated dependencies [52dca89]
- Updated dependencies [e9f867f]
- Updated dependencies [e36309d]
  - @hyperdx/instrumentation-exception@0.1.0

## 0.16.2-next.2

### Patch Changes

- 7ec128c: style: move 'tracer', 'span', 'attributes' args to hint (recordException method)
- 398e858: feat: scripts to bump otel-web + session-recorder versions
- Updated dependencies [7ec128c]
  - @hyperdx/instrumentation-exception@0.1.0-next.11

## 0.16.2-next.1

### Patch Changes

- c05e520: fix: end span properly after calling recordException
- Updated dependencies [c05e520]
  - @hyperdx/instrumentation-exception@0.1.0-next.10

## 0.16.2-next.0

### Patch Changes

- 70c8508: fix: revert browser error span changes + remove sentry.version semantic attribute
- 606dd8e: chore: bump otel deps + remove @opentelemetry/exporter-zipkin
- 5f6af95: refactor: Rename error instrumentation fn name
- d8d5b82: chore: Add otel-web and session-recorder
- Updated dependencies [a574521]
- Updated dependencies [5f6af95]
- Updated dependencies [70c8508]
- Updated dependencies [606dd8e]
- Updated dependencies [a574521]
  - @hyperdx/instrumentation-exception@0.1.0-next.9
