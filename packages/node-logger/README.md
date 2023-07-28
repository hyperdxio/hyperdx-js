# HyperDX Node.js Logger

Node.js Logging Library for [HyperDX](https://www.hyperdx.io/)

## Installation

Install the Node.js logger into your project.

```sh
npm install @hyperdx/node-logger
```

or

```sh
yarn add @hyperdx/node-logger
```

## Setup

Before starting with the code, make sure to obtain your API key by
[logging into](https://www.hyperdx.io/login)/[signing up for](https://www.hyperdx.io/register)
HyperDX and visiting your team page:
[https://hyperdx.io/team](https://www.hyperdx.io/team).
This key is necessary for sending logs to your account.

### Winston Transport

Create a new HyperDX Winston Transport and append it to your list of transports. Example:

```
import winston from 'winston';
import { HyperDXWinston } from '@hyperdx/node-logger';

const hyperdxTransport = new HyperDXWinston({
  apiKey: ***HYPERDX_API_KEY***,
  maxLevel: 'info',
  service: 'my-app',
});


const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    hyperdxTransport, // append this to the existing transports
  ],
});

export default logger;
```

#### Options

- **apiKey** - Required. Your HyperDX ingestion API key.
- **service** - The name of the service.
- **sendIntervalMs** - Time in milliseconds to wait between retry attempts. Default: `2000` (2 sec)
- **bufferSize** - The maximum number of messages the logger will accumulate before sending them all as a bulk. Default: `100`.
- **timeout** - The read/write/connection timeout in milliseconds. Default: `30000`.

### Pino Transport

Create a new HyperDX Pino Transport and append it to your list of transports. Example:

```
import pino from 'pino';

const logger = pino(
  pino.transport({
    targets: [
      {
        target: '@hyperdx/node-logger/build/src/pino',
        options: {
          apiKey: ***HYPERDX_API_KEY***,
          service: 'my-app',
        },
        level: 'info',
      },
      // other transports
    ],
  }),
);

export default logger;
```

#### Options

- **apiKey** - Required. Your HyperDX ingestion API key.
- **service** - The name of the service.
- **sendIntervalMs** - Time in milliseconds to wait between retry attempts. Default: `2000` (2 sec)
- **bufferSize** - The maximum number of messages the logger will accumulate before sending them all as a bulk. Default: `100`.
- **timeout** - The read/write/connection timeout in milliseconds. Default: `30000`.

### NestJS Custom Logger

(powered by [nest-winston](https://www.npmjs.com/package/nest-winston?activeTab=readme))

Import HyperDXNestLoggerModule into the root AppModule and use the forRoot() method to configure it.

```
import { Module } from '@nestjs/common';
import { HyperDXNestLoggerModule } from '@hyperdx/node-logger';

@Module({
  imports: [
    HyperDXNestLoggerModule.forRoot({
      apiKey: ***HYPERDX_API_KEY***,
      maxLevel: 'info',
      service: 'my-app',
    }),
  ],
})
export class AppModule {}
```

Afterward, the winston instance will be available to inject across entire project using the `HDX_LOGGER_MODULE_PROVIDER` injection token:

```
import { Controller, Inject } from '@nestjs/common';
import { HyperDXNestLoggerModule, HyperDXNestLogger } from '@hyperdx/node-logger';

@Controller('cats')
export class CatsController {
  constructor(
    @Inject(HyperDXNestLoggerModule.HDX_LOGGER_MODULE_PROVIDER)
    private readonly logger: HyperDXNestLogger,
  ) { }

  meow() {
    this.logger.info({ message: '🐱' });
  }
}
```

#### Replacing the Nest logger (also for bootstrapping)

> Important: by doing this, you give up the dependency injection, meaning that forRoot and forRootAsync are not needed and shouldn't be used. Remove them from your main module.

Using the dependency injection has one minor drawback.
Nest has to bootstrap the application first (instantiating modules and providers, injecting dependencies, etc.)
and during this process the instance of HyperDXNestLogger is not yet available,
which means that Nest falls back to the internal logger.

One solution is to create the logger outside of the application lifecycle,
using the createLogger function, and pass it to NestFactory.create.
Nest will then wrap our custom logger (the same instance returned by the createLogger method) into the Logger class, forwarding all calls to it:

Create the logger in the `main.ts` file

```
import { HyperDXNestLoggerModule } from '@hyperdx/node-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: HyperDXNestLoggerModule.createLogger({
      apiKey: ***HYPERDX_API_KEY***,
      maxLevel: 'info',
      service: 'my-app',
    })
  });
  await app.listen(3000);
}
bootstrap();
```

Change your main module to provide the Logger service:

```
import { Logger, Module } from '@nestjs/common';

@Module({
  providers: [Logger],
})
export class AppModule {}
```

Then inject the logger simply by type hinting it with Logger from @nestjs/common:

```
import { Controller, Logger } from '@nestjs/common';

@Controller('cats')
export class CatsController {
  constructor(private readonly logger: Logger) {}

  meow() {
    this.logger.log({ message: '🐱' });
  }
}
```
