---
"@hyperdx/otel-web-session-recorder": minor
---

Upgrade `rrweb` from `1.1.3` to `^2.1.0` (HDX-4696). rrweb 1.x transitively
pinned `rrweb-snapshot@1.1.14`, which is flagged for CVE-2025-45806 (XSS in
the replay-side `rebuild()` function, CVSS 6.1). No patched release exists in
the 1.x line, so security scanners flagged every install of
`@hyperdx/otel-web-session-recorder`. The recorder itself never invokes the
vulnerable code path (it only records; replay happens in the HyperDX app,
which already uses the rrweb 2.x line), but this upgrade removes the
vulnerable package from the dependency tree entirely. Also declares the
previously-phantom `@rrweb/types` and `rrweb-snapshot` type dependencies,
since the published type declarations reference them. The recorder's public
API (`init`/`resume`/`stop`/`deinit` and configuration options) is unchanged.
