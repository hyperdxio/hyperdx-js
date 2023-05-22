const express = require('express');
const PORT = parseInt(process.env.PORT || '7777');
const app = express();

const { Logger } = require('./build/src/logger');

const logger = new Logger({
  apiKey: 'b6d3a632-d0c8-41d4-86f7-6501b96c6a77',
  baseUrl: 'http://localhost:8002',
  service: 'dummy',
});

app.get('/', (req, res) => {
  logger.postMessage('info', 'body message', {
    headers: req.headers,
    method: req.method,
    url: req.url,
    query: req.query,
  });
  res.send('Hello World');
});

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
