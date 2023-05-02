const express = require('express');

const PORT = parseInt(process.env.PORT || '9999');
const app = express();

app.get('/', (req, res) => {
  console.debug({
    headers: req.headers,
    method: req.method,
    url: req.url,
    query: req.query,
  });
  console.error('BANG !!!');
  res.send('Hello World');
});

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
