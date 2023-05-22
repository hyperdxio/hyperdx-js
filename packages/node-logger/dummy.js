const express = require('express');
const PORT = parseInt(process.env.PORT || '7777');
const winston = require('winston');
const pino = require('pino');
const app = express();

const { Logger } = require('./build/src/logger');
const { HyperDXWinston } = require('./build/src');

const HDX_API_KEY = 'b6d3a632-d0c8-41d4-86f7-6501b96c6a77';
const HDX_API_URL = 'http://localhost:8002';

const logger = new Logger({
  apiKey: HDX_API_KEY,
  baseUrl: HDX_API_URL,
  service: 'native',
});

const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new HyperDXWinston({
      apiKey: HDX_API_KEY,
      maxLevel: 'info',
      service: 'winston',
      baseUrl: HDX_API_URL,
    }),
  ],
});

const pinoLogger = pino(
  pino.transport({
    targets: [
      {
        target: './build/src/pino',
        options: {
          apiKey: HDX_API_KEY,
          service: 'pino',
          baseUrl: HDX_API_URL,
        },
        level: 'info',
      },
    ],
  }),
);

app.get('/', (req, res) => {
  logger.postMessage('info', 'body message', {
    headers: req.headers,
    method: req.method,
    url: req.url,
    query: req.query,
  });
  winstonLogger.info('🍕');
  winstonLogger.error({
    message: 'BANG !!!',
    headers: req.headers,
  });
  pinoLogger.info('🍕');
  res.send('Hello World');
});

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
