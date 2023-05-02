import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
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
    }),
    // visualizer({
    //   sourcemap: true,
    //   open: true,
    // }),
  ],
};
