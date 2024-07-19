#!/usr/bin/env node

import fs from 'fs';
import process from 'process';
import { promisify } from 'util';

const realpath = promisify(fs.realpath);

const start = async () => {
  await import('../src/tracing');

  // argv has form of nodePath, thisBigPath, givenEntryPath, ...rest
  const givenEntryPath = process.argv[2];
  const realEntryPath = await realpath(givenEntryPath);

  // when running `node .` the second argument is automatically converted, so we're doing the same thing here
  process.argv[2] = realEntryPath;

  // remove argument showing that the opentelemetry-node was the original caller
  process.argv.splice(1, 1);

  // at this point the real script should have `process.argv` defined as it would be originally called
  require(realEntryPath);
};

start().catch((error) => {
  // Without this catch block, node would print a unhandled promise exception which would change the behaviour how
  // scripts acts with opentelemetry-node running.
  // Instead we log the error into the stderr and finish the process with error code status.
  console.error(error);
  process.exit(1);
});
