const { initSDK, setTraceAttributes, shutdown } = require('../build/src');

initSDK({
  programmaticImports: true,
});

const compression = require('compression');
const http = require('http');
const https = require('https');
const dns = require('dns');

// TEST INSTRUMENTATIONS
const Koa = require('koa');
const Sentry = require('@sentry/node');
const bunyan = require('bunyan');
const express = require('express');
const { MongoClient } = require('mongodb');
const pino = require('pino');
const winston = require('winston');
const IORedis = require('ioredis');
const Redis = require('redis');
const mongoose = require('mongoose');

const {
  getPinoTransport,
  getWinstonTransport,
} = require('../build/src/logger');

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
  await shutdown();
  process.exit(0);
});

const initInstrumentationTest = async (moduleName, runTest) => {
  logger.info(`Running tests for ${moduleName}`);
  try {
    await runTest();
    logger.info(`Tests for ${moduleName} passed`);
  } catch (error) {
    logger.error(`Tests for ${moduleName} failed`, error);
  }
};

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    getWinstonTransport('info', {
      detectResources: true,
    }), // append this to the existing transports
  ],
});

const pinoLogger = pino(
  pino.transport({
    targets: [
      getPinoTransport('info'),
      // other transports
    ],
  }),
);

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
    paht: '/',
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
  setTraceAttributes({
    userId: generateRandomString(8),
  });
  next();
});

app.use(express.json());

app.get('/instruments', async (req, res) => {
  await Promise.all([
    // FIXME: not working
    initInstrumentationTest('mongodb', async () => {
      const mongoClient = new MongoClient('mongodb://localhost:27017');
      await mongoClient.connect();
      const db = mongoClient.db('hyperdx');
      await db.collection('teams').find({}).toArray();
    }),
    // FIXME: not working
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
  Sentry.captureMessage('This is a test message');
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
