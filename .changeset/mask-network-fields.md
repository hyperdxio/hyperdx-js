---
'@hyperdx/browser': minor
'@hyperdx/otel-web': patch
---

Browser SDK: support masking sensitive fields in captured request/response
headers and bodies before telemetry leaves the client. Add a `maskFields`
option to `HyperDX.init`. Header matches are case-insensitive; body matches
traverse nested JSON objects and accept dotted paths (e.g.
`creditCard.number`). Matched values are replaced with `***`.
