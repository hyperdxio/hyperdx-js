/*
Copyright 2026 HyperDX, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0
*/

import * as assert from 'assert';

import {
  DEFAULT_MASK_PLACEHOLDER,
  headerCapture,
  maskBody,
  shouldMaskHeader,
} from '../src/utils';

describe('shouldMaskHeader', () => {
  it('matches headers case-insensitively', () => {
    assert.strictEqual(shouldMaskHeader('Authorization', ['authorization']), true);
    assert.strictEqual(shouldMaskHeader('AUTHORIZATION', ['Authorization']), true);
    assert.strictEqual(shouldMaskHeader('x-api-key', ['X-API-KEY']), true);
  });

  it('returns false when no fields are configured', () => {
    assert.strictEqual(shouldMaskHeader('authorization', undefined), false);
    assert.strictEqual(shouldMaskHeader('authorization', []), false);
  });

  it('returns false for non-matching headers', () => {
    assert.strictEqual(
      shouldMaskHeader('content-type', ['authorization', 'x-api-key']),
      false,
    );
  });
});

describe('maskBody', () => {
  it('returns the original body when no fields are configured', () => {
    const body = JSON.stringify({ password: 'secret' });
    assert.strictEqual(maskBody(body, undefined), body);
    assert.strictEqual(maskBody(body, []), body);
  });

  it('masks top-level fields by name', () => {
    const body = JSON.stringify({ username: 'alice', password: 'secret' });
    const masked = JSON.parse(maskBody(body, ['password']));
    assert.deepStrictEqual(masked, {
      username: 'alice',
      password: DEFAULT_MASK_PLACEHOLDER,
    });
  });

  it('masks nested fields via dotted paths', () => {
    const body = JSON.stringify({
      user: 'alice',
      creditCard: { number: '4111111111111111', cvv: '123' },
    });
    const masked = JSON.parse(maskBody(body, ['creditCard.number']));
    assert.deepStrictEqual(masked, {
      user: 'alice',
      creditCard: { number: DEFAULT_MASK_PLACEHOLDER, cvv: '123' },
    });
  });

  it('does not mask nested fields when only a bare key is provided', () => {
    // Path-exact matching: a bare 'token' only matches root-level token,
    // not nested instances. Users wanting to mask a nested field must
    // supply its full path.
    const body = JSON.stringify({
      token: 'root',
      inner: { token: 'nested' },
    });
    const masked = JSON.parse(maskBody(body, ['token']));
    assert.deepStrictEqual(masked, {
      token: DEFAULT_MASK_PLACEHOLDER,
      inner: { token: 'nested' },
    });
  });

  it('masks fields inside arrays via indexed paths', () => {
    const body = JSON.stringify({
      users: [
        { name: 'alice', password: 'a' },
        { name: 'bob', password: 'b' },
      ],
    });
    const masked = JSON.parse(
      maskBody(body, ['users[0].password', 'users[1].password']),
    );
    assert.deepStrictEqual(masked, {
      users: [
        { name: 'alice', password: DEFAULT_MASK_PLACEHOLDER },
        { name: 'bob', password: DEFAULT_MASK_PLACEHOLDER },
      ],
    });
  });

  it('returns the original body unchanged when it is not JSON', () => {
    const body = 'username=alice&password=secret';
    assert.strictEqual(maskBody(body, ['password']), body);
  });

  it('serializes non-string body values via JSON.stringify before masking', () => {
    const body = { token: 'secret', keep: 'me' };
    const masked = JSON.parse(maskBody(body, ['token']));
    assert.deepStrictEqual(masked, {
      token: DEFAULT_MASK_PLACEHOLDER,
      keep: 'me',
    });
  });
});

describe('headerCapture with masking', () => {
  function makeFakeSpan() {
    const attributes: Record<string, unknown> = {};
    return {
      attributes,
      setAttribute(key: string, value: unknown) {
        attributes[key] = value;
      },
    };
  }

  it('masks matching header values with the default placeholder', () => {
    const span = makeFakeSpan();
    const headers = { authorization: 'Bearer secret', 'content-type': 'application/json' };
    headerCapture('request', Object.keys(headers), {
      maskFields: ['authorization'],
    })(span as any, (h) => headers[h as keyof typeof headers]);

    assert.deepStrictEqual(span.attributes['http.request.header.authorization'], [
      DEFAULT_MASK_PLACEHOLDER,
    ]);
    assert.deepStrictEqual(span.attributes['http.request.header.content_type'], [
      'application/json',
    ]);
  });

  it('matches header names case-insensitively', () => {
    const span = makeFakeSpan();
    headerCapture('request', ['Authorization'], {
      maskFields: ['authorization'],
    })(span as any, () => 'Bearer secret');

    assert.deepStrictEqual(span.attributes['http.request.header.authorization'], [
      DEFAULT_MASK_PLACEHOLDER,
    ]);
  });

  it('passes values through unchanged when no maskFields are configured', () => {
    const span = makeFakeSpan();
    headerCapture('response', ['x-trace-id'])(span as any, () => 'abc123');

    assert.deepStrictEqual(span.attributes['http.response.header.x_trace_id'], [
      'abc123',
    ]);
  });

  it('masks each element when the header value is an array', () => {
    const span = makeFakeSpan();
    headerCapture('response', ['set-cookie'], {
      maskFields: ['set-cookie'],
    })(span as any, () => ['session=abc123', 'csrf=def456']);

    assert.deepStrictEqual(
      span.attributes['http.response.header.set_cookie'],
      [DEFAULT_MASK_PLACEHOLDER, DEFAULT_MASK_PLACEHOLDER],
    );
  });
});
