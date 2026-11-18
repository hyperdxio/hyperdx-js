---
"@hyperdx/otel-web-session-recorder": patch
---

Fixed an unbounded uncaught-error loop in the session recorder on Safari
(hyperdxio/hyperdx-js#303). WebKit's `TextDecoder` can permanently corrupt
after high cumulative decode volume and then throw `RangeError: Bad value` on
valid input (https://bugs.webkit.org/show_bug.cgi?id=286266); the recorder
reused one module-level decoder in `emit()` with no error handling, so a
single corrupted instance turned every rrweb flush into an uncaught error
until page unload. Single-chunk events (the common case) now skip the
encode/decode round-trip entirely, multi-chunk events use a fresh per-event
decoder with `{ stream: true }` (also fixing U+FFFD corruption when a chunk
boundary bisected a multi-byte character), a failed decode is retried once
with a new decoder, and the recorder stops after 10 consecutive emit failures
instead of erroring on every event forever.
