const express = require('express');
const PORT = parseInt(process.env.PORT || '7788');
const winston = require('winston');
const app = express();

const { HyperDXWinston } = require('./build/src');

// RANDOM API KEY
const HDX_API_KEY = '<KEY1>';
const HDX_API_URL = 'http://localhost:4318/v1/logs';
const DETECT_RESOURCES = false;

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

app.get('/', (req, res) => {
  winstonLogger.info('🍕', {
    message: 'BANG !!!',
    foo: 'bar',
  });
  winstonLogger.info('🍕', {
    foo: 'bar',
  });
  winstonLogger.info(
    {
      foo: 'bar',
    },
    {
      foo1: 'bar1',
    },
  );
  res.send('Hello World');
});

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
