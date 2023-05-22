const express = require('express');
const PORT = parseInt(process.env.PORT || '7777');
const winston = require('winston');
const app = express();

const { Logger } = require('./build/src/logger');
const { HyperDXWinston } = require('./build/src');

const logger = new Logger({
  apiKey: 'b6d3a632-d0c8-41d4-86f7-6501b96c6a77',
  baseUrl: 'http://localhost:8002',
  service: 'native',
});

const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new HyperDXWinston({
      apiKey: 'b6d3a632-d0c8-41d4-86f7-6501b96c6a77',
      maxLevel: 'info',
      service: 'winston',
      baseUrl: 'http://localhost:8002',
    }),
  ],
});

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
  res.send('Hello World');
});

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
