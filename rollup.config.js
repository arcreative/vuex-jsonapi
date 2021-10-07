import babel from '@rollup/plugin-babel'
import replace from '@rollup/plugin-replace'
import resolve from '@rollup/plugin-node-resolve'

import pkg from './package.json';

let plugins = [
  babel({
    exclude: 'node_modules/**',
    babelHelpers: 'bundled',
  }),
  replace({
    __VERSION__: pkg.version,
    preventAssignment: true,
  }),
  resolve()
];

export default [
  {
    input: 'src/index.esm.js',
    output: {
      name: 'VuexJsonapi',
      file: pkg.browser,
      format: 'umd',
      exports: 'named'
    },
    plugins: plugins
  },

  {
    input: 'src/index.esm.js',
    external: Object.keys(pkg.dependencies),
    output: [
      { file: pkg.main, format: 'cjs', exports: 'named' },
      { file: pkg.module, format: 'es', exports: 'named' }
    ],
    plugins: plugins
  }
];
