// Polyfill TextEncoder/TextDecoder for jsdom environment
// (required by @opentelemetry/instrumentation-fetch)

const { TextEncoder: TE, TextDecoder: TD } = eval("require('util')");

if (typeof globalThis.TextEncoder === 'undefined') {
  (globalThis as any).TextEncoder = TE;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  (globalThis as any).TextDecoder = TD;
}
