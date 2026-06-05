import * as assert from 'assert';

import {
  getBrowserContextResourceAttributes,
  resolveBrowserContext,
} from '../src/browserContext';

describe('browserContext', () => {
  it('maps language and timeZone to resource attributes', () => {
    assert.deepStrictEqual(
      getBrowserContextResourceAttributes({
        language: 'en-US',
        timeZone: 'America/New_York',
      }),
      {
        'browser.language': 'en-US',
        'browser.timezone': 'America/New_York',
      },
    );
  });

  it('omits absent values so it never overwrites with empty attributes', () => {
    assert.deepStrictEqual(getBrowserContextResourceAttributes({}), {});
    assert.deepStrictEqual(
      getBrowserContextResourceAttributes({ timeZone: 'UTC' }),
      { 'browser.timezone': 'UTC' },
    );
  });

  it('treats an empty-string language as absent', () => {
    assert.deepStrictEqual(
      getBrowserContextResourceAttributes({ language: '' }),
      {},
    );
  });

  it('resolveBrowserContext reads a non-empty IANA time zone from the environment', () => {
    const { timeZone } = resolveBrowserContext();
    assert.strictEqual(typeof timeZone, 'string');
    assert.ok((timeZone as string).length > 0);
  });

  it('resolveBrowserContext reads navigator.language when available', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: 'fr-FR' },
      configurable: true,
    });
    try {
      assert.strictEqual(resolveBrowserContext().language, 'fr-FR');
    } finally {
      if (original) {
        Object.defineProperty(globalThis, 'navigator', original);
      } else {
        delete (globalThis as any).navigator;
      }
    }
  });
});
