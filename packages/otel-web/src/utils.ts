/*
Copyright 2020 Splunk Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import stringifySafe from 'json-stringify-safe';
import { Span } from '@opentelemetry/api';
import { wrap } from 'shimmer';

export const jsonToString = (json: any) => {
  let output = '[HyperDX] Failed to stringify';
  let error = false;
  try {
    output = JSON.stringify(json);
  } catch (ex) {
    error = true;
    // ignore error
  }

  if (error) {
    try {
      output = stringifySafe(json);
    } catch (ex) {
      // ignore error
    }
  }

  return output;
};

export function generateId(bits: number): string {
  const xes = 'x'.repeat(bits / 4);
  return xes.replace(/x/g, function () {
    return ((Math.random() * 16) | 0).toString(16);
  });
}

export function findCookieValue(cookieName: string): string | undefined {
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookies = decodedCookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const c = cookies[i].trim();
    if (c.indexOf(cookieName + '=') === 0) {
      return c.substring((cookieName + '=').length, c.length);
    }
  }
  return undefined;
}

export function limitLen(s: string, cap: number): string {
  if (s.length > cap) {
    return s.substring(0, cap);
  } else {
    return s;
  }
}

/**
 * Get plugin config from user provided value
 *
 * @template {Object|undefined} T
 * @param value Value given by user
 * @param defaults Default value
 * @param defaultDisable If undefined by user should mean false
 */
export function getPluginConfig<T>(
  value: T | boolean | undefined,
  defaults?: T,
  defaultDisable?: T | boolean,
): false | T {
  if (value === false) {
    return value;
  }

  if (value === undefined && defaultDisable) {
    return false;
  }

  return Object.assign({}, defaults, value);
}

/**
 * Type guard that checks if value is function (and acts as user-defined type guard)
 *
 * @param value Value to check
 * @returns is function
 */
export function isFunction(
  value: unknown,
): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

export function isIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

/**
 * Wrap function while keeping the toString calling the original as some frameworks
 * use it to determine if the function's native or polyfilled
 *
 * Example:
 * https://github.com/vuejs/vue/blob/0603ff695d2f41286239298210113cbe2b209e28/src/core/util/env.js#L58
 * https://github.com/vuejs/vue/blob/0603ff695d2f41286239298210113cbe2b209e28/src/core/util/next-tick.js#L42
 *
 * @param nodule Target object
 * @param name Property to patch
 * @param wrapper Wrapper
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function wrapNatively<
  Nodule extends Object,
  FieldName extends keyof Nodule,
>(
  nodule: Nodule,
  name: FieldName,
  wrapper: (original: Nodule[FieldName]) => Nodule[FieldName],
): void {
  const orig = nodule[name];
  wrap(nodule, name, wrapper) as unknown as CallableFunction;
  const wrapped = nodule[name];
  wrapped.toString = orig.toString.bind(orig);
}

/**
 * Get the original version of function (without all of the shimmer wrappings)
 */
export function getOriginalFunction<T extends CallableFunction>(func: T): T {
  // @ts-expect-error __original isn't mentioned in types
  while (func.__original && func.__original !== func) {
    // @ts-expect-error same
    func = func.__original as T;
  }

  return func;
}

/**
 * Wait for a variable to be set globally
 *
 * @param {string} identifier Name of the variable (window[identifier])
 * @param {function} callback Fired when such value is available
 * @returns {function} cleanup to call in disable (in case not defined before instrumentation is disabled)
 */
export function waitForGlobal(
  identifier: string,
  callback: (value: unknown) => void,
): () => void {
  if (window[identifier]) {
    callback(window[identifier]);
    return () => {};
  }

  const value = window[identifier]; // most cases undefined
  let used = false;
  Object.defineProperty(window, identifier, {
    get() {
      return value;
    },
    set(newVal) {
      delete window[identifier];
      used = true;
      window[identifier] = newVal;
      callback(newVal);
    },
    configurable: true,
    enumerable: false,
  });

  return () => {
    // Don't touch if value is used or another defineProperty used it
    if (used || window[identifier] !== value) {
      return;
    }

    delete window[identifier];
    if (value !== undefined) {
      window[identifier] = value;
    }
  };
}

// https://github.com/open-telemetry/opentelemetry-js/blob/b400c2e5d9729c3528482781a93393602dc6dc9f/experimental/packages/opentelemetry-instrumentation-http/src/utils.ts#L573
export function headerCapture(type: 'request' | 'response', headers: string[]) {
  const normalizedHeaders = new Map(
    headers.map((header) => [header, header.toLowerCase().replace(/-/g, '_')]),
  );

  return (
    span: Span,
    getHeader: (key: string) => undefined | string | string[] | number,
  ) => {
    for (const [capturedHeader, normalizedHeader] of normalizedHeaders) {
      const value = getHeader(capturedHeader);

      if (value === undefined) {
        continue;
      }

      const key = `http.${type}.header.${normalizedHeader}`;

      if (typeof value === 'string') {
        span.setAttribute(key, [value]);
      } else if (Array.isArray(value)) {
        span.setAttribute(key, value);
      } else {
        span.setAttribute(key, [value]);
      }
    }
  };
}
