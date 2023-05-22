const express = require('express');
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

app.get('/', (req, res) => {
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
  res.send('Hello World');
});

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
