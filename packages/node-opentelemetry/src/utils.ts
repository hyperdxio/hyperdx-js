import stringifySafe from 'json-stringify-safe';

import hdx from './debug';

export const jsonToString = (json) => {
  try {
    return JSON.stringify(json);
  } catch (ex) {
    hdx(`Failed to stringify json. e = ${ex}`);
    return stringifySafe(json);
  }
};

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
