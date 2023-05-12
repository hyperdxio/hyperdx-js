import HyperDXWinston from './winston';
import { HyperDXNestLoggerModule } from './nest';

import type { HyperDXNestLogger as HyperDXNestLoggerT } from './nest';

export type HyperDXNestLogger = HyperDXNestLoggerT;

export default {
  HyperDXNestLoggerModule,
  HyperDXWinston,
};
