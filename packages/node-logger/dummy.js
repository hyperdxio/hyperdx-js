const express = require('express');
const PORT = parseInt(process.env.PORT || '7788');
const winston = require('winston');
const pino = require('pino');
const app = express();

const { Logger } = require('./build/src/logger');
const { HyperDXWinston } = require('./build/src');

// RANDOM API KEY
const HDX_API_KEY = '<KEY1>';
const HDX_API_KEY2 = '<KEY2>';
const HDX_API_URL = 'http://localhost:4318/v1/logs';
const DETECT_RESOURCES = false;

const logger = new Logger({
  apiKey: HDX_API_KEY,
  baseUrl: HDX_API_URL,
  service: 'native',
  bufferSize: 100,
  queueSize: 10,
});

const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new HyperDXWinston({
      detectResources: DETECT_RESOURCES,
      apiKey: HDX_API_KEY,
      maxLevel: 'info',
      service: 'winston',
      baseUrl: HDX_API_URL,
    }),
  ],
});

const winstonLogger2 = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new HyperDXWinston({
      detectResources: DETECT_RESOURCES,
      apiKey: HDX_API_KEY2,
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
          detectResources: DETECT_RESOURCES,
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
  // winstonLogger.info('🍕');
  // winstonLogger.error({
  //   message: 'BANG !!!',
  //   headers: req.headers,
  // });
  // winstonLogger2.info('🤯🤯🤯');
  pinoLogger.info('🍕');
  pinoLogger.error({
    message: 'BANG !!!',
    headers: req.headers,
  });
  pinoLogger.warn({
    foo: 'bar',
  });
  res.send('Hello World');
});

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
