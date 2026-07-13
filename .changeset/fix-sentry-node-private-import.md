---
'@hyperdx/instrumentation-sentry-node': patch
---

Remove private `@opentelemetry/sdk-trace-base/build/src/enums` import that broke `require()` on a clean install when `sdk-trace-base` floats to 2.9.0 (#2630). Import the stable public `EVENT_EXCEPTION` constant from `@opentelemetry/semantic-conventions` (already a declared dependency) instead.
