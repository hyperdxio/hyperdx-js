// FIXME: somehow it fails in gha
// @ts-ignore
import { HyperDXWinston } from '@hyperdx/node-logger';

import * as config from './config';

export const getWinsonTransport = (maxLevel = 'info') => {
  return config.HYPERDX_API_KEY
    ? new HyperDXWinston({
        apiKey: config.HYPERDX_API_KEY,
        maxLevel,
        service: config.SERVICE_NAME,
      })
    : null;
};
