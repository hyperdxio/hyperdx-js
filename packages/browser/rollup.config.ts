import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import replace from 'rollup-plugin-re';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'build/index.js',
      format: 'umd',
      name: 'HyperDX',
    },
  ],
  plugins: [
    // FIXME: a patch to the unsafe-eval issue
    // https://github.com/protobufjs/protobuf.js/issues/593
    replace({
      patterns: [
        {
          test: /eval.*\(moduleName\);/g,
          replace: 'undefined;',
        },
      ],
    }),
    json(),
    typescript(),
    commonjs(),
    resolve({
      mainFields: ['module', 'browser', 'main'],
      dedupe: [
        '@opentelemetry/semantic-conventions',
        '@opentelemetry/sdk-trace-web',
        '@opentelemetry/instrumentation',
        '@opentelemetry/core',
        '@opentelemetry/api',
      ],
    }),
    terser({
      sourceMap: true,
      keep_fnames: new RegExp('.report'),
    }),
    // visualizer({
    //   sourcemap: true,
    //   open: true,
    // }),
  ],
};
