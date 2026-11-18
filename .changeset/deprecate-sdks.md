---
'@hyperdx/browser': patch
'@hyperdx/otel-web': patch
'@hyperdx/otel-web-session-recorder': patch
'@hyperdx/node-opentelemetry': patch
'@hyperdx/node-logger': patch
'@hyperdx/instrumentation-exception': patch
'@hyperdx/instrumentation-sentry-node': patch
'@hyperdx/deno': patch
---

Deprecate the HyperDX SDKs. Use `@clickhouse/clickstack-browser` for browsers and `@clickhouse/clickstack-node` for Node.js; where neither covers a package, use the upstream OpenTelemetry SDKs. Each package's README names its replacement.
