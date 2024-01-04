import HyperDXWinston from './winston';
import { HyperDXNestLoggerModule } from './nest';
import { Logger } from './logger';

import type { HyperDXNestLogger as HyperDXNestLoggerT } from './nest';

export type HyperDXNestLogger = HyperDXNestLoggerT;

export { HyperDXWinston, HyperDXNestLoggerModule, Logger };
