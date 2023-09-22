import { _parseConsoleArgs } from '../src/instrumentations/console';
import { getShouldRecordBody } from '../src/instrumentations/http';

describe('instrumentations', () => {
  describe('console', () => {
    it('should parse console args', () => {
      expect(_parseConsoleArgs([])).toEqual('');
      expect(_parseConsoleArgs(['foo'])).toEqual('foo');
      expect(_parseConsoleArgs(['foo', 'bar'])).toEqual('foo bar');
      expect(_parseConsoleArgs([{ foo: 'bar' }])).toEqual({ foo: 'bar' });
      expect(
        _parseConsoleArgs([
          () => 1,
          function () {
            const i = 1;
          },
        ]),
      ).toEqual('');
      expect(_parseConsoleArgs(['foo', { foo: 'bar' }])).toEqual({
        foo: 'bar',
        message: 'foo {"foo":"bar"}',
      });
      expect(_parseConsoleArgs(['foo', [1, 2, 3]])).toEqual('foo [1,2,3]');
      expect(_parseConsoleArgs(['foo', [1, 2, 3], { foo: 'bar' }])).toEqual({
        foo: 'bar',
        message: 'foo [1,2,3] {"foo":"bar"}',
      });
      expect(
        _parseConsoleArgs([
          'foo',
          [1, 2, 3],
          { foo: 'bar', message: 'this will be overwritten' },
        ]),
      ).toEqual({
        foo: 'bar',
        message:
          'foo [1,2,3] {"foo":"bar","message":"this will be overwritten"}',
      });
    });
  });

  describe('http', () => {
    it('getShouldRecordBody', () => {
      const defaultShouldRecordBody = getShouldRecordBody();
      expect(defaultShouldRecordBody('foo bar')).toEqual(true);
      expect(defaultShouldRecordBody('password: abc')).toEqual(false);
      expect(defaultShouldRecordBody('secret: abc')).toEqual(false);

      const customShouldRecordBody = getShouldRecordBody('foo,bar');
      expect(customShouldRecordBody('foo hello world')).toEqual(false);
      expect(customShouldRecordBody('hello world')).toEqual(true);
    });
  });
});
