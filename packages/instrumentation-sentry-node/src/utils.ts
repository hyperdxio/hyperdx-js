import { diag } from '@opentelemetry/api';
import stringifySafe from 'json-stringify-safe';

export const jsonToString = (json) => {
  try {
    return JSON.stringify(json);
  } catch (e) {
    diag.error('Failed to stringify json', e);
    return stringifySafe(json);
  }
};
