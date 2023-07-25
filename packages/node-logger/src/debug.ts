import debug from 'debug';

import { name as PKG_NAME, version as PKG_VERSION } from '../package.json';

export const LOG_PREFIX = `[${PKG_NAME} v${PKG_VERSION}]`;

export default (message: string) =>
  debug('hyperdx')(`${LOG_PREFIX} ${message}`);
