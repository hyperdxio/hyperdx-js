import { stringifyValue } from '../utils';

describe('stringifyValue', () => {
  it('should JSON.stringify plain objects instead of producing [object Object]', () => {
    const obj = { errorId: 'abc-123', details: 'something broke' };
    const result = stringifyValue(obj);

    expect(result).not.toContain('[object Object]');
    expect(result).toContain('errorId');
    expect(result).toContain('abc-123');
    expect(result).toBe('{"errorId":"abc-123","details":"something broke"}');
  });

  it('should handle nested objects', () => {
    const result = stringifyValue({ outer: { inner: 'value' } });

    expect(result).not.toContain('[object Object]');
    expect(result).toContain('inner');
    expect(result).toBe('{"outer":{"inner":"value"}}');
  });

  it('should handle null', () => {
    expect(stringifyValue(null)).toBe('null');
  });

  it('should handle undefined', () => {
    expect(stringifyValue(undefined)).toBe('(undefined)');
  });

  it('should use error.message for Error objects instead of JSON.stringify', () => {
    const err = new Error('something failed');
    const result = stringifyValue(err);

    // JSON.stringify(err) would produce "{}" because Error properties are non-enumerable
    expect(result).not.toBe('{}');
    expect(result).toContain('something failed');
  });

  it('should handle Error objects with no message', () => {
    const err = new Error();
    const result = stringifyValue(err);

    // Should fall back to toString() which gives "Error"
    expect(result).toBeTruthy();
  });

  it('should handle arrays', () => {
    const result = stringifyValue([1, 2, 3]);

    expect(result).not.toContain('[object Object]');
    expect(result).toBe('[1,2,3]');
  });

  it('should handle strings as-is', () => {
    expect(stringifyValue('hello')).toBe('hello');
  });

  it('should handle numbers', () => {
    expect(stringifyValue(42)).toBe('42');
  });

  it('should handle booleans', () => {
    expect(stringifyValue(true)).toBe('true');
    expect(stringifyValue(false)).toBe('false');
  });

  it('should handle objects with circular references gracefully', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: any = { a: 1 };
    obj.self = obj;

    // Should not throw, falls back to toString()
    const result = stringifyValue(obj);
    expect(result).toBeDefined();
  });

  it('should produce correct output for the reported console.error scenario', () => {
    // Simulates: console.error('FatalErrorBoundary caught an error', { errorId, error, errorInfo })
    // The hdxReport method joins stringifyValue results with spaces
    const args = [
      'FatalErrorBoundary caught an error',
      {
        errorId: 'err-001',
        error: 'TypeError: Cannot read properties of null',
        errorInfo: { componentStack: 'at App' },
      },
    ];

    const message = args.map((x) => stringifyValue(x)).join(' ');

    expect(message).not.toContain('[object Object]');
    expect(message).toContain('FatalErrorBoundary caught an error');
    expect(message).toContain('errorId');
    expect(message).toContain('err-001');
  });
});
