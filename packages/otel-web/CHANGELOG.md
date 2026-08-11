# @hyperdx/otel-web

## 0.19.0

### Minor Changes

- c6e35c8: webvitals spans now carry `webvitals.navigation_type` and `webvitals.metric_id`
  attributes, so downstream consumers can segment metrics by how the page was
  visited (`navigate`, `reload`, `back-forward`, `back-forward-cache`,
  `prerender`, `restore`) and correlate multiple values for the same metric
  instance. Metrics are also deduped by instance id (`metric.id`) instead of
  metric name, so measurements from back/forward-cache restores — which produce a
  new metric instance with a new id — are no longer dropped (#269).

## 0.18.0

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
- Updated dependencies [aedb9ea]
  - @hyperdx/instrumentation-exception@0.3.0

## 0.17.1

### Patch Changes

- 43874fd: chore: Upgrade dependencies

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
