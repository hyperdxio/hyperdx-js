---
'@hyperdx/otel-web': minor
'@hyperdx/browser': minor
---

Emit approximate locale/region resource attributes from the browser RUM
SDK: `browser.language` (OTel semconv, from `navigator.language`) and
`browser.timezone` (IANA zone from `Intl`). These are honest proxies for
where a user is — they are NOT IP geolocation (the browser can't
determine country without a permission prompt; true geo is derived in the
collector from the client IP). Added before user-provided
`resourceAttributes` so callers can override them.
