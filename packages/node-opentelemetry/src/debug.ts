import debug from 'debug';

import { name as PKG_NAME, version as PKG_VERSION } from '../package.json';

const NAMESPACE = 'hyperdx';

const env = process.env;

export const LOG_PREFIX = `[${PKG_NAME} v${PKG_VERSION}]`;

export const HDX_DEBUG_MODE_ENABLED = env.DEBUG?.includes(NAMESPACE);

export default (message: string) =>
  debug(NAMESPACE)(`${LOG_PREFIX} ${message}`);
