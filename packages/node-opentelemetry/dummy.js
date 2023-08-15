const express = require('express');
const http = require('http');
const axios = require('axios');
const PORT = parseInt(process.env.PORT || '7777');
const app = express();

const pino = require('pino');
const winston = require('winston');
const {
  getWinsonTransport,
  getPinoTransport,
  init,
} = require('./build/src/logger');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    getWinsonTransport('info'), // append this to the existing transports
  ],
});

const pinoLogger = pino();

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

app.use(express.json());

app.post('/dump', (req, res) => {
  const body = req.body;
  console.log(body);
  res.send('Hello World');
});

app.get('/', async (req, res) => {
  console.info('@@@@@@@@@@@@');
  console.debug({
    headers: req.headers,
    method: req.method,
    url: req.url,
    query: req.query,
  });
  console.error('BANG !!!');
  logger.info({
    message: '🍕',
    headers: req.headers,
    method: req.method,
    url: req.url,
  });
  pinoLogger.info('🍕');

  console.log(await sendGetRequest());
  // console.log(await axios.get('https://hyperdx.free.beeceptor.com'));

  res.send('Hello World');
});

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
