const axios = require('axios');
const compression = require('compression');
const express = require('express');
const http = require('http');
const pino = require('pino');
const winston = require('winston');

const {
  getPinoTransport,
  getWinstonTransport,
} = require('../build/src/logger');
const { setTraceAttributes } = require('../build/src');
// const { shutdown } = require('@hyperdx/node-opentelemetry');

// process.on('SIGINT', async () => {
//   await shutdown();
//   process.exit(0);
// });

const PORT = parseInt(process.env.PORT || '7788');
const app = express();

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

app.use(compression());

// set custom trace attributes
app.use((req, res, next) => {
  setTraceAttributes({
    userId: generateRandomString(8),
  });
  next();
});

app.use(express.json());

app.post('/dump', (req, res) => {
  const body = req.body;
  console.log(body);
  res.send('Hello World');
});

app.get('/', async (req, res) => {
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

  console.log(await sendGetRequest());
  // console.log(await axios.get('https://hyperdx.free.beeceptor.com'));

  res.json({
    foo: 'bar',
    random: generateRandomString(8),
  });
});

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
