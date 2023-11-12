const Koa = require('koa');
const Router = require('@koa/router');

const opentelemetry = require('@opentelemetry/api');

// Initialize Koa app and router
const app = new Koa();
const router = new Router();

router.get('/', (ctx) => {
  const span = opentelemetry.trace.getActiveSpan();
  span.setAttribute('code.filepath', __filename);
  ctx.body = { message: 'Hello, World! A' };
  ctx.status = 200;
});

router.get('/bang', (ctx) => {
  ctx.status = 500;
});

router.get('/api', (ctx) => {
  ctx.status = 400;
});

// Register routes with the app
app.use(router.routes()).use(router.allowedMethods());

// Start the server
const PORT = parseInt(process.env.PORT || '7777');
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
