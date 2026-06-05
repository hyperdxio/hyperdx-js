import type { Attributes } from '@opentelemetry/api';

/**
 * Approximate locale/region signals read from the browser environment.
 * These are HONEST PROXIES for where a user is — they are NOT IP
 * geolocation (the browser cannot determine country without a permission
 * prompt). True geo (`geo.country.name`, …) is derived in the OTel
 * collector from the client IP. See the geoip processor.
 */
export interface BrowserContext {
  /** navigator.language, e.g. "en-US" (OTel semconv `browser.language`). */
  language?: string;
  /** IANA time zone, e.g. "America/New_York". */
  timeZone?: string;
}

/** Read the browser context from the current environment (best-effort). */
export function resolveBrowserContext(): BrowserContext {
  const language =
    typeof navigator !== 'undefined' ? navigator.language : undefined;

  let timeZone: string | undefined;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    // Intl or the resolved time zone is unavailable in this environment.
    timeZone = undefined;
  }

  return { language, timeZone };
}

/**
 * Map a {@link BrowserContext} to resource attributes. `browser.language`
 * is an OpenTelemetry semantic-convention attribute; `browser.timezone` is
 * a custom companion in the same namespace. Absent values are omitted so
 * they never overwrite a user-provided attribute with an empty string.
 *
 * The context is injectable so the mapping can be unit-tested without real
 * browser globals.
 */
export function getBrowserContextResourceAttributes(
  context: BrowserContext = resolveBrowserContext(),
): Attributes {
  const attrs: Attributes = {};
  if (context.language) {
    attrs['browser.language'] = context.language;
  }
  if (context.timeZone) {
    attrs['browser.timezone'] = context.timeZone;
  }
  return attrs;
}
