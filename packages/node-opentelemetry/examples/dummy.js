// Spin up DBs
// MySQL:
// docker run --rm --name some-mysql -e MYSQL_ROOT_PASSWORD=my-secret-pw -p 3306:3306 mysql:latest
// Postgres:
// docker run --rm --name some-postgres -e POSTGRES_PASSWORD=my-secret-pw -p 5432:5432 postgres:latest

const compression = require('compression');
const http = require('http');
const https = require('https');
const dns = require('dns');

// TEST INSTRUMENTATIONS
const Hapi = require('@hapi/hapi');
const IORedis = require('ioredis');
const Koa = require('koa');
const Redis = require('redis');
const Sentry = require('@sentry/node');
const bunyan = require('bunyan');
const express = require('express');
const fastify = require('fastify');
const graphql = require('graphql');
const knex = require('knex');
const mongodb = require('mongodb');
const mongoose = require('mongoose');
const mysql = require('mysql');
const mysql2 = require('mysql2');
const pg = require('pg');
const winston = require('winston');
const pino = require('pino');

const HyperDX = require('../build/src');

HyperDX.init({
  apiKey: '',
  disableStartupLogs: true,
});

// setTimeout(() => {
//   throw new Error('👺👺👺👺');
// }, 2000);

Sentry.init({
  dsn: 'http://public@localhost:5000/1',
  integrations: [
    // Common
    new Sentry.Integrations.InboundFilters(),
    new Sentry.Integrations.FunctionToString(),
    new Sentry.Integrations.LinkedErrors(),
    new Sentry.Integrations.RequestData(),
    // Global Handlers
    new Sentry.Integrations.OnUnhandledRejection(),
    new Sentry.Integrations.OnUncaughtException(),
    // Event Info
    new Sentry.Integrations.ContextLines(),
    new Sentry.Integrations.LocalVariables(),
  ],
});

process.on('SIGINT', async () => {
  await HyperDX.shutdown();
  process.exit(0);
});

const initInstrumentationTest = async (moduleName, runTest) => {
  logger.info(`Running tests for ${moduleName}`);
  try {
    await runTest();
    logger.info(`Tests for ${moduleName} passed`);
  } catch (error) {
    Sentry.captureException(error);
  }
};

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    HyperDX.getWinstonTransport('info', {
      detectResources: true,
    }), // append this to the existing transports
  ],
});

const pinoLogger = pino({
  mixin: HyperDX.getPinoMixinFunction,
  transport: {
    targets: [
      HyperDX.getPinoTransport('info'),
      // other transports
    ],
  },
});

const bunyanLogger = bunyan.createLogger({ name: 'myapp' });

const PORT = parseInt(process.env.PORT || '7788');
const app = express();

async function sendGetRequest() {
  const postData = JSON.stringify({
    key1: 'value1',
    key2: 'value2',
  });

  const options = {
    hostname: 'hyperdx.free.beeceptor.com', // Replace with the API hostname
    method: 'POST',
    path: '/',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data); // Resolve the promise with the response data
      });
    });

    req.on('error', (error) => {
      reject(error); // Reject the promise with the error
    });

    req.write(postData);
    req.end();
  });
}

function generateRandomString(length) {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  return result;
}

app.use(Sentry.Handlers.requestHandler());

app.use(compression());

// set custom trace attributes
app.use((req, res, next) => {
  HyperDX.setTraceAttributes({
    userId: generateRandomString(8),
  });
  next();
});

app.use(express.json());

app.get('/instruments', async (req, res) => {
  await Promise.all([
    initInstrumentationTest('mongodb', async () => {
      const mongoClient = new mongodb.MongoClient('mongodb://localhost:27017');
      await mongoClient.connect();
      const db = mongoClient.db('hyperdx');
      await db.collection('teams').find({}).toArray();
    }),
    initInstrumentationTest('mongoose', async () => {
      await mongoose.connect('mongodb://localhost:27017/hyperdx');
      const User = mongoose.model('User', {
        name: String,
      });
      await User.find({}, { name: 1 }).exec();
    }),
    initInstrumentationTest('ioredis', async () => {
      const redis = new IORedis({
        host: 'localhost',
        port: 6379,
      });
      await redis.set('foo', 'bar');
      await redis.get('foo');
    }),
    initInstrumentationTest('redis', async () => {
      const redis = await Redis.createClient({
        host: 'localhost',
        port: 6379,
      })
        .on('error', (error) => {
          logger.error('Redis error', error);
        })
        .connect();
      await redis.set('foo1', 'bar1');
      await redis.get('foo1');
      await redis.disconnect();
    }),
    initInstrumentationTest('pg', async () => {
      const client = new pg.Client({
        user: 'postgres',
        host: 'localhost',
        password: 'my-secret-pw',
        port: 5432,
      });
      await client.connect();
      const res = await client.query('SELECT $1::text as message', [
        'Hello world!',
      ]);
      await client.end();
    }),
    initInstrumentationTest('mysql', async () => {
      const connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'my-secret-pw',
        port: 3306,
      });
      connection.connect((err) => {
        if (err) {
          logger.error('MySQL connection error', err);
        }
      });
      connection.query('SELECT 1 + 1 AS solution', (error, results, fields) => {
        // blabla
      });
    }),
    initInstrumentationTest('mysql2', async () => {
      const connection = await mysql2.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'my-secret-pw',
        port: 3306,
      });
      await connection.query('SELECT 1 + 1 AS solution');
    }),
    initInstrumentationTest('knex', async () => {
      const knexInstance = knex({
        client: 'pg',
        connection: {
          user: 'postgres',
          host: 'localhost',
          password: 'my-secret-pw',
          port: 5432,
        },
      });
      await knexInstance.raw('SELECT 1+1 as result');
    }),
    initInstrumentationTest('dns', async () => {
      return new Promise((resolve, reject) => {
        dns.lookup('example.com', (err, address, family) => {
          if (err) {
            reject(err);
          } else {
            resolve(address);
          }
        });
      });
    }),
    initInstrumentationTest('https', async () => {
      return new Promise((resolve, reject) => {
        https.get('https://example.com', (res) => {
          res.on('data', (data) => {
            resolve(data.toString());
          });
        });
      });
    }),
    initInstrumentationTest('graphql', async () => {
      const schema = new graphql.GraphQLSchema({
        query: new graphql.GraphQLObjectType({
          name: 'Query',
          fields: {
            hello: {
              type: graphql.GraphQLString,
              resolve() {
                return 'world';
              },
            },
          },
        }),
      });

      const query = '{ hello }';
      await graphql.graphql({
        schema,
        source: query,
      });
    }),
  ]);

  res.send('Tests completed');
});

app.get('/logs', async (req, res) => {
  console.debug({
    headers: req.headers,
    method: req.method,
    url: req.url,
    query: req.query,
  });
  console.error('BANG !!!');
  console.log('Console 🍕');
  logger.info({
    message: 'Winston 🍕',
    headers: req.headers,
    method: req.method,
    url: req.url,
  });
  pinoLogger.info('Pino 🍕');

  bunyanLogger.info('Bunyan 🍕');

  console.log(await sendGetRequest());
  // console.log(await axios.get('https://hyperdx.free.beeceptor.com'));
  //

  res.json({
    foo: 'bar',
    random: generateRandomString(8),
  });
});

app.get('/error', (req, res) => {
  Sentry.captureException(new Error('Sentry error !!!'));
  HyperDX.recordException(new Error('HyperDX error !!!'), {
    mechanism: {
      handled: false,
    },
  });
  throw new RangeError('This is a test error');
});

app.use(Sentry.Handlers.errorHandler());

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});

// Koa
const koaApp = new Koa();
koaApp.use(async (ctx) => {
  ctx.body = 'Hello Koa';
});
koaApp.listen(PORT + 1, () => {
  console.log(`Koa server listening on http://localhost:${PORT + 1}`);
});

// Hapi
const hapiServer = Hapi.server({
  port: PORT + 2,
  host: 'localhost',
});
hapiServer.route({
  method: 'GET',
  path: '/',
  handler: (request, h) => {
    return 'Hello Hapi';
  },
});
hapiServer.start().then(() => {
  console.log(`Hapi server listening on http://localhost:${PORT + 2}`);
});

// fastify
const fastifyServer = fastify();
fastifyServer.get('/', async (request, reply) => {
  return 'Hello Fastify';
});
fastifyServer.listen(PORT + 3, () => {
  console.log(`Fastify server listening on http://localhost:${PORT + 3}`);
});
