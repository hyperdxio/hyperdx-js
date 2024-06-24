const express = require('express');
const HyperDX = require('../build/src');

HyperDX.init({
  apiKey: '',
  service: 'hard-crash',
});

// Crash immediately
coleiscool();

// unhandledRejection
// new Promise((resolve, reject) => {
//   reject(new Error('🦄🦄🦄🦄'));
// });

const PORT = parseInt(process.env.PORT || '7788');
const app = express();

app.get('/uncaught', async (req, res) => {
  setTimeout(() => {
    throw new Error('💥💥💥💥');
  }, 2000);
  res.send('Uncaught exception in 2 seconds');
});

app.get('/crash', (req, res) => {
  throw new Error('🧨🧨🧨🧨');
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// HyperDX.setupExpressErrorHandler(app);

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
