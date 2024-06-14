import type { Event } from '@sentry/types';

import { _hyperdxIntegration } from '../hyperdx';

describe('hyperdxIntegration', () => {
  it('processEvent filters out useless stacktrace frames', () => {
    const hyperdxIntegration = _hyperdxIntegration({});
    const event: Event = {
      exception: {
        values: [
          {
            stacktrace: {
              frames: [
                {
                  filename:
                    'https://www.hyperdx.io/_next/static/chunks/framework-84ff07185b56904f.js',
                  function: 'test',
                  lineno: 1,
                  colno: 88323,
                },
                {
                  filename:
                    'https://www.hyperdx.io/_next/static/chunks/framework-84ff07185b56904f.js',
                  function: 'test',
                  lineno: 1,
                  colno: 221,
                },
                {
                  filename:
                    'https://www.hyperdx.io/_next/static/chunks/pages/_app-133eed17a0a77fd6.js',
                  function: 'test',
                  lineno: 1,
                  colno: 88323,
                },
                {
                  filename:
                    'https://www.hyperdx.io/_next/static/chunks/9524-20fe05d50852a6b9.js',
                  function: 'test',
                  lineno: 1,
                  colno: 88323,
                },
                {
                  filename: '',
                  function: 'test',
                  lineno: 1,
                  colno: 88323,
                },
                {
                  filename:
                    'https://www.hyperdx.io/_next/static/chunks/somefile.js',
                  function: '?',
                  lineno: 1,
                  colno: 88323,
                },
                {
                  filename:
                    'https://www.hyperdx.io/_next/static/chunks/somefile.js',
                  function: 'hdxReport',
                  lineno: 1,
                  colno: 88323,
                },
                {
                  filename:
                    'https://www.hyperdx.io/_next/static/chunks/somefile.js',
                  function: 'hdxReportString',
                  lineno: 1,
                  colno: 88323,
                },
              ],
            },
          },
        ],
      },
    };
    const result = hyperdxIntegration.processEvent(event);
    expect(result.exception.values[0].stacktrace.frames).toEqual([
      {
        filename:
          'https://www.hyperdx.io/_next/static/chunks/pages/_app-133eed17a0a77fd6.js',
        function: 'test',
        lineno: 1,
        colno: 88323,
      },
      {
        filename:
          'https://www.hyperdx.io/_next/static/chunks/9524-20fe05d50852a6b9.js',
        function: 'test',
        lineno: 1,
        colno: 88323,
      },
      {
        filename: '',
        function: 'test',
        lineno: 1,
        colno: 88323,
      },
    ]);
  });
});
