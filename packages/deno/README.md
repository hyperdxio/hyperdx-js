# OpenTelemetry Support for Deno

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
