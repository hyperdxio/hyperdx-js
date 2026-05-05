---
'@hyperdx/otel-web': minor
'@hyperdx/browser': minor
---

Emit FCP and TTFB Core Web Vitals from the browser RUM SDK. The bundled
`web-vitals` library already exports `onFCP` and `onTTFB`; `initWebVitals`
now registers callbacks for them alongside the existing LCP / INP / CLS / FID
ones. Each new metric lands as a `webvitals` span with the value on a single
attribute (`fcp` or `ttfb`), matching the existing pattern.
