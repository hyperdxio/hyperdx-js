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

initSDK({
  captureConsole: stringToBoolean(env.HDX_JS_CONSOLE_INSTRUMENT),
});
