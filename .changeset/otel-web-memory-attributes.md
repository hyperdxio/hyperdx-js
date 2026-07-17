---
"@hyperdx/otel-web": minor
---

`documentLoad` spans now carry the browser's JS heap sizes as
`performance.memory.usedJSHeapSize`, `performance.memory.totalJSHeapSize`, and
`performance.memory.jsHeapSizeLimit` (bytes), enabling per-page memory analysis.
The values come from the non-standard `performance.memory` API and are
feature-detected, so they are emitted only on Chromium-based browsers and
omitted on Firefox/Safari, alongside the existing `screen.xy` tag.
