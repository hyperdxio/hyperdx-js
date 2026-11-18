# OpenTelemetry Support for Deno

> **Deprecated:** `@hyperdx/deno` is no longer maintained, and the ClickStack
> SDKs do not cover Deno. Use Deno's
> [built-in OpenTelemetry support](https://docs.deno.com/runtime/fundamentals/open_telemetry/)
> instead. It exports traces, metrics, and `console` output as logs, which
> includes `std/log`'s console handler. Run with `OTEL_DENO=true`, set
> `OTEL_EXPORTER_OTLP_ENDPOINT` to your collector, and pass your ingestion key
> with `OTEL_EXPORTER_OTLP_HEADERS=authorization=<key>`.

⚠️ Currently only supports OpenTelemetry Logging. For tracing support, [see the following guide](https://dev.to/grunet/leveraging-opentelemetry-in-deno-45bj#a-minimal-interesting-example).

## Logging

Logging is supported by exporting a custom logger for the `std/log` module.

**Example usage:**

```typescript
import * as log from 'https://deno.land/std@0.203.0/log/mod.ts';
import { OpenTelemetryHandler } from 'npm:@hyperdx/deno';

log.setup({
  handlers: {
    otel: new OpenTelemetryHandler('DEBUG'),
  },

  loggers: {
    'my-otel-logger': {
      level: 'DEBUG',
      handlers: ['otel'],
    },
  },
});

log.getLogger('my-otel-logger').info('Hello from Deno!');
```

## License

MIT
