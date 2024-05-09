import {
  DEFAULT_HDX_NODE_ADVANCED_NETWORK_CAPTURE,
  DEFAULT_HDX_NODE_BETA_MODE,
  DEFAULT_HDX_NODE_CONSOLE_CAPTURE,
  DEFAULT_HDX_NODE_STOP_ON_TERMINATION_SIGNALS,
} from './constants';
import { initSDK } from './otel';

// TODO: Support more instrumentation configuration options

initSDK({
  betaMode: DEFAULT_HDX_NODE_BETA_MODE,
  consoleCapture: DEFAULT_HDX_NODE_CONSOLE_CAPTURE,
  advancedNetworkCapture: DEFAULT_HDX_NODE_ADVANCED_NETWORK_CAPTURE,
  stopOnTerminationSignals: DEFAULT_HDX_NODE_STOP_ON_TERMINATION_SIGNALS,
});
