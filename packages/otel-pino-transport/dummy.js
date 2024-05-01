const express = require('express');
const PORT = parseInt(process.env.PORT || '7788');
const pino = require('pino');
const app = express();

// RANDOM API KEY
const HDX_API_KEY = '<KEY1>';
const HDX_API_URL = 'http://localhost:4318/v1/logs';
const DETECT_RESOURCES = false;

const pinoLogger = pino(
  pino.transport({
    targets: [
      {
        target: './build',
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
  pinoLogger.error('🍕');
  pinoLogger.error({
    pizza: '🍕',
    message: 'BANG !!!',
    foo: 'bar',
  });
  res.send('Hello World');
});

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
