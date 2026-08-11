/* eslint-disable header/header */

import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import replace from 'rollup-plugin-re';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

const { babelPlugin, nodeResolvePlugin } = require('../../rollup.shared');

export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/artifacts/otel-web-session-recorder.js',
      format: 'iife',
      name: 'OtelSessionRecorder',
      sourcemap: true,
    },
    plugins: [
      // FIXME: a patch to the unsafe-eval issue
      // https://github.com/protobufjs/protobuf.js/issues/593
      // need to get rid of LogsProto.js
      replace({
        patterns: [
          {
            test: /eval.*\(moduleName\);/g,
            replace: 'undefined;',
          },
        ],
      }),
      json(),
      nodeResolvePlugin,
      commonjs({
        include: /node_modules/,
        sourceMap: true,
        transformMixedEsModules: true,
      }),
      typescript({ tsconfig: './tsconfig.base.json' }),
      babelPlugin,
      terser({ output: { comments: false } }),
    ],
    context: 'window',
  },
];
