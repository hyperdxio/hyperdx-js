---
"@hyperdx/node-opentelemetry": minor
"@hyperdx/node-logger": minor
"@hyperdx/otel-web": minor
"@hyperdx/otel-web-session-recorder": minor
"@hyperdx/browser": minor
"@hyperdx/instrumentation-exception": minor
"@hyperdx/instrumentation-sentry-node": minor
---

Upgrade all OpenTelemetry dependencies to latest versions (core/resources/sdk-trace-base/sdk-metrics to ^2.7.1, semantic-conventions to ^1.41.1, api to ^1.9.1). Migrates to v2 APIs: `resourceFromAttributes()` replaces `new Resource()`, updated semantic convention constants, updated resource detectors, and span processors passed via constructor options.
