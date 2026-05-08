import { diag } from '@opentelemetry/api';
import stringifySafe from 'json-stringify-safe';

export const jsonToString = (json) => {
  try {
    return JSON.stringify(json);
  } catch (ex) {
    diag.debug(`Failed to stringify json. e = ${ex}`);
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

/**
 * Parses OTEL_EXPORTER_OTLP_HEADERS environment variable into a structured headers object.
 * Format: "key1=value1,key2=value2" -> { key1: "value1", key2: "value2" }
 */
export const parseOtlpHeaders = (
  headersString?: string,
): Record<string, string> => {
  if (!headersString) {
    return {};
  }

  const headers: Record<string, string> = {};
  const pairs = headersString.split(',');

  for (const pair of pairs) {
    const trimmedPair = pair.trim();
    if (!trimmedPair) {
      continue;
    }

    const equalIndex = trimmedPair.indexOf('=');
    if (equalIndex === -1) {
      // Skip malformed pairs without '='
      continue;
    }

    const key = trimmedPair.substring(0, equalIndex).trim();
    const value = trimmedPair.substring(equalIndex + 1).trim();

    if (key) {
      headers[key] = value;
    }
  }

  return headers;
};
