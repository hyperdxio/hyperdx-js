import { initSDK } from './otel';
import { stringToBoolean } from './utils';

const env = process.env;

// TODO: Support more instrumentation configuration options

initSDK({
  betaMode: stringToBoolean(env.HDX_NODE_BETA_MODE),
  consoleCapture: stringToBoolean(env.HDX_NODE_CONSOLE_CAPTURE),
  networkHeadersCapture: stringToBoolean(env.HDX_NODE_NETWORK_HEADERS_CAPTURE),
  networkBodyCapture: stringToBoolean(env.HDX_NODE_NETWORK_BODY_CAPTURE),
  stopOnTerminationSignals:
    stringToBoolean(env.HDX_NODE_STOP_ON_TERMINATION_SIGNALS) ?? true,
});
