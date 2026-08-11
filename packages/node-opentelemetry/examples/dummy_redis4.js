const express = require('express');
const Redis = require('redis');
const HyperDX = require('../build/src');

HyperDX.init({
  apiKey: '',
  service: 'dummy_redis4',
});

const PORT = parseInt(process.env.PORT || '7788');
const app = express();

app.use(express.json());
app.get('/', async (req, res) => {
  const client = await Redis.createClient({
    host: 'localhost',
    port: 6379,
  }).connect();
  // await redis.commandsExecutor('set', 'foo', 'bar');
  await client.set('foo1', 'bar1');
  await client.get('foo1');
  // await redis.sendCommand(['SET', 'foo1', 'bar1']);
  // await redis.sendCommand(['GET', 'foo1']);
  // const [setKeyReply, otherKeyValue] = await client
  //   .multi()
  //   .set('key', 'value')
  //   .get('another-key')
  //   .exec(); // ['OK', 'another-value']
  await client.disconnect();
  res.send('Hello World!!!');
});

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
