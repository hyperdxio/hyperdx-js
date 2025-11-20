import { parseOtlpHeaders } from '../otel';

describe('Parse OTLP Headers', () => {
  it('should return an empty object when no headers string is provided', () => {
    expect(parseOtlpHeaders()).toEqual({});
  });

  it('should correctly parse a single header', () => {
    expect(parseOtlpHeaders('key1=value1')).toEqual({ key1: 'value1' });
  });

  it('should correctly parse multiple headers', () => {
    expect(parseOtlpHeaders('key1=value1,key2=value2')).toEqual({
      key1: 'value1',
      key2: 'value2',
    });
  });

  it('should handle spaces around keys and values', () => {
    expect(parseOtlpHeaders(' key1 = value1 , key2 = value2 ')).toEqual({
      key1: 'value1',
      key2: 'value2',
    });
  });

  it('should ignore malformed headers without "="', () => {
    expect(parseOtlpHeaders('key1=value1,malformedHeader,key2=value2')).toEqual(
      {
        key1: 'value1',
        key2: 'value2',
      },
    );
  });

  it('should handle empty values', () => {
    expect(parseOtlpHeaders('key1=,key2=value2')).toEqual({
      key1: '',
      key2: 'value2',
    });
  });

  it('should handle special characters in values', () => {
    expect(
      parseOtlpHeaders(
        'Authorization=Bearer token123,Content-Type=application/json',
      ),
    ).toEqual({
      Authorization: 'Bearer token123',
      'Content-Type': 'application/json',
    });
  });

  it('should handle trailing comma', () => {
    expect(parseOtlpHeaders('key1=value1,')).toEqual({
      key1: 'value1',
    });
  });

  it('should handle leading comma', () => {
    expect(parseOtlpHeaders(',key1=value1')).toEqual({
      key1: 'value1',
    });
  });

  it('should handle multiple consecutive commas', () => {
    expect(parseOtlpHeaders('key1=value1,,key2=value2')).toEqual({
      key1: 'value1',
      key2: 'value2',
    });
  });
});
