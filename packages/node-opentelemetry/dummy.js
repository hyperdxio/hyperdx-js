const express = require('express');
const PORT = parseInt(process.env.PORT || '9999');
const app = express();

const winston = require('winston');
const { getWinsonTransport, init } = require('./build/src/logger');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    getWinsonTransport('info'), // append this to the existing transports
  ],
});

app.get('/', (req, res) => {
  console.debug({
    headers: req.headers,
    method: req.method,
    url: req.url,
    query: req.query,
  });
  console.error('BANG !!!');
  logger.info('YOOOOOOOOOOOOOOOOOO');
  res.send('Hello World');
});

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
