---
'@hyperdx/otel-web-session-recorder': patch
'@hyperdx/browser': patch
---

Replace the deprecated `unload` listener in the session recorder's log processor with `visibilitychange` (hidden) and `pagehide`, and send end-of-session flushes with `fetch` `keepalive` so they survive page termination. This removes the Chrome Permissions Policy violation warning and no longer makes pages ineligible for the back/forward cache.
