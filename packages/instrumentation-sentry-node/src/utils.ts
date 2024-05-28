import stringifySafe from 'json-stringify-safe';
import { diag } from '@opentelemetry/api';

export const jsonToString = (json) => {
  try {
    return JSON.stringify(json);
  } catch (e) {
    diag.error('Failed to stringify json', e);
    return stringifySafe(json);
  }
};
