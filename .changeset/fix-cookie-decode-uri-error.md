---
'@hyperdx/otel-web': patch
---

Fix a `URIError: URI malformed` thrown from session tracking when the page has
an unrelated cookie whose value is not percent-encoded. `findCookieValue` used
to decode the entire `document.cookie` string before splitting it, so a single
cookie containing a bare `%` (a legal cookie value) made every lookup throw.
The error escaped `HyperDX.init()`, which could break host applications that
initialize the SDK on their startup path. The value of the requested cookie is
now decoded on its own. This ports the upstream fix from splunk-otel-js-web#962.
