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

import * as assert from 'assert';
import { findCookieValue, generateId } from '../src/utils';

describe('generateId', () => {
  it('should generate IDs of 64 and 128 bits', () => {
    const id64 = generateId(64);
    const id128 = generateId(128);
    assert.strictEqual(id64.length, 16);
    assert.strictEqual(id128.length, 32);
    assert.ok(id64.match('^[0-9a-z]+$'));
    assert.ok(id128.match('^[0-9a-z]+$'));
  });
});
describe('findCookieValue', () => {
  const expireCookie = (name: string) => {
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
  };

  it('should not find unset cookie', () => {
    assert.ok(findCookieValue('nosuchCookie') === undefined);
  });

  it('should decode the value of the requested cookie', () => {
    document.cookie =
      'testDecoded=' + encodeURIComponent('{"a":"b c"}') + ';path=/';
    try {
      assert.strictEqual(findCookieValue('testDecoded'), '{"a":"b c"}');
    } finally {
      expireCookie('testDecoded');
    }
  });

  it('should not throw when an unrelated cookie is not percent-encoded', () => {
    // Cookie values may legally contain a bare '%'. Decoding the whole
    // document.cookie string made any such cookie throw a URIError here,
    // which propagated out of session tracking and into the host page.
    document.cookie = 'testMalformed=100%;path=/';
    document.cookie = 'testNeighbour=' + encodeURIComponent('ok') + ';path=/';
    try {
      assert.strictEqual(findCookieValue('testNeighbour'), 'ok');
      assert.ok(findCookieValue('nosuchCookie') === undefined);
    } finally {
      expireCookie('testMalformed');
      expireCookie('testNeighbour');
    }
  });
});
