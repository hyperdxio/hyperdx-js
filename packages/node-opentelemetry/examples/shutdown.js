/* Run via:
HDX_NODE_STOP_ON_TERMINATION_SIGNALS=false DEBUG=hyperdx npx ts-node -r "@hyperdx/node-opentelemetry/build/src/tracing" examples/shutdown.ts

OR:
HDX_NODE_STOP_ON_TERMINATION_SIGNALS=false npx opentelemetry-instrument examples/shutdown.js
*/

const { shutdown } = require('@hyperdx/node-opentelemetry');
// import { shutdown } from '@hyperdx/node-opentelemetry';

console.log(shutdown.toString());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

console.log('pid', process.pid);

async function handleTerm() {
  console.log('EXPLICITLY HANDLING Termination');
  await sleep(1000);
  console.log('Terminating now...');
  shutdown().then(() => {
    process.exit(0);
  });
}

process.on('SIGINT', async () => {
  await handleTerm();
});

process.on('SIGTERM', async () => {
  await handleTerm();
});

(async () => {
  // Test concurrent and sequential shutdowns work properly
  // shutdown();
  // await shutdown();
  // shutdown();

  setInterval(() => {}, 1000);

  // Test crashing still works as normal
  // setTimeout(() => {
  //   throw new Error('oh noes!!');
  // }, 1000);
})();
