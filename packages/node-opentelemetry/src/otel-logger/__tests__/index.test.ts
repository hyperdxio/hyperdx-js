import { getSeverityNumber, parseLogAttributes } from '..';

describe('otel-logger', () => {
  it('getSeverityNumber', () => {
    expect({
      alert: getSeverityNumber('alert'),
      debug: getSeverityNumber('debug'),
      emerg: getSeverityNumber('emerg'),
      error: getSeverityNumber('error'),
      info: getSeverityNumber('info'),
      verbose: getSeverityNumber('verbose'),
      warn: getSeverityNumber('warn'),
      warning: getSeverityNumber('warning'),
    }).toMatchSnapshot();
  });

  it('parseLogAttributes', () => {
    expect(
      parseLogAttributes({
        a: 1,
        b: '2',
        c: [{ d: 3 }],
        e: [1, 2, 3],
        f: ['a', 'b', 'c'],
        g: {
          h: 'i',
        },
      }),
    ).toMatchSnapshot();
  });
});
