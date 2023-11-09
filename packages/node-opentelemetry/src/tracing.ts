import { initSDK } from './otel';
import { stringToBoolean } from './utils';

const env = process.env;

// TODO: Support more instrumentation configuration options

initSDK({
  betaMode: stringToBoolean(env.HDX_NODE_BETA_MODE),
  consoleCapture: stringToBoolean(env.HDX_NODE_CONSOLE_CAPTURE),
  advancedNetworkCapture: stringToBoolean(
    env.HDX_NODE_ADVANCED_NETWORK_CAPTURE,
  ),
  stopOnTerminationSignals:
    stringToBoolean(env.HDX_NODE_STOP_ON_TERMINATION_SIGNALS) ?? true,
});
