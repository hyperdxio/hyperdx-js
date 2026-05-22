---
"@hyperdx/otel-web-session-recorder": patch
"@hyperdx/otel-web": patch
"@hyperdx/browser": patch
---

Move `@babel/runtime` from runtime dependencies to devDependencies. The
published CommonJS and ESM output (`dist/cjs/`, `dist/esm/`) is produced by
`tsc` and does not reference `@babel/runtime` at all; only the unpublished
Rollup IIFE bundle needed it. Keeping it as a runtime dependency forced
consumers to install a vulnerable version of `@babel/runtime` (<7.26.10,
GHSA-968p-4wvh-cqc8), surfacing as a moderate-severity finding in
`npm audit`. With this change, a clean install of `@hyperdx/browser`,
`@hyperdx/otel-web`, or `@hyperdx/otel-web-session-recorder` no longer
pulls in the vulnerable `@babel/runtime` and `npm audit` is clean.
