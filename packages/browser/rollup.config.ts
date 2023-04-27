import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'build/index.js',
      format: 'umd',
      name: 'HyperDX',
      plugins: [terser()],
    },
  ],
  plugins: [
    json(),
    typescript(),
    commonjs(),
    resolve({
      browser: true,
    }),
  ],
};
