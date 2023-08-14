import { initSDK } from './otel';

const env = process.env;

export const stringToBoolean = (stringValue: string | undefined) => {
  switch (stringValue?.toLowerCase()?.trim()) {
    case 'true':
    case 'yes':
    case '1':
      return true;

    case 'false':
    case 'no':
    case '0':
      return false;

    default:
      return undefined;
  }
};

// TODO: Support more instrumentation configuration options

initSDK({
  consoleCapture: stringToBoolean(env.HDX_NODE_CONSOLE_CAPTURE),
  advancedNetworkCapture: stringToBoolean(
    env.HDX_NODE_ADVANCED_NETWORK_CAPTURE,
  ),
});
