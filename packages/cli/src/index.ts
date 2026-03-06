#!/usr/bin/env node
import { program } from 'commander';
import { uploadSourcemaps } from './lib.js';

program.name('@hyperdx/cli').description('HyperDX Command Line Interface');

program
  .command('upload-sourcemaps')
  .option('-k, --serviceKey <string>', 'The HyperDX service account API key')
  .option(
    '-u, --apiUrl [string]',
    'An optional api url for self-hosted deployments',
  )
  .option(
    '-rid, --releaseId [string]',
    'An optional release id to associate the sourcemaps with',
  )
  .option(
    '-p, --path [string]',
    'Sets the directory of where the sourcemaps are',
    '.',
  )
  .option(
    '-bp, --basePath [string]',
    'An optional base path for the uploaded sourcemaps',
  )
  .option(
    '-v, --apiVersion [string]',
    'The API version to use (default: "v1")',
    'v1',
  )
  .action(uploadSourcemaps);

program.parse();
