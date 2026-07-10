---
"@hyperdx/browser": minor
---

Expose the rrweb `blockSelector` option through the browser SDK config. You can
now pass `blockSelector` to `HyperDX.init(...)` to block session-recording of
elements matching a CSS selector (complementing the existing `blockClass`). The
value is forwarded to the session recorder; omit it to keep the previous
behavior. Improved documentation by adding description for `blockClass` alongside 
new `blockSelector` property.
