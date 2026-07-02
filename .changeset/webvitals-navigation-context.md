---
"@hyperdx/otel-web": minor
---

webvitals spans now carry `webvitals.navigation_type` and `webvitals.metric_id`
attributes, so downstream consumers can segment metrics by how the page was
visited (`navigate`, `reload`, `back-forward`, `back-forward-cache`,
`prerender`, `restore`) and correlate multiple values for the same metric
instance. Metrics are also deduped by instance id (`metric.id`) instead of
metric name, so measurements from back/forward-cache restores — which produce a
new metric instance with a new id — are no longer dropped (#269).
