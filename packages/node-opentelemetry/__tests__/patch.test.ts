import { _parseConsoleArgs } from '../src/patch';

describe('patch', () => {
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
      message: 'foo [1,2,3] {"foo":"bar","message":"this will be overwritten"}',
    });
  });
});
