import babel from 'rollup-plugin-babel'
import replace from 'rollup-plugin-replace'
import resolve from 'rollup-plugin-node-resolve'

import pkg from './package.json';

let plugins = [
  babel({
    exclude: 'node_modules/**'
  }),
  replace({
    __VERSION__: pkg.version
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
    external: (id) => id.startsWith('lodash-es') || Object.keys(pkg.dependencies).includes(id),
    output: [
      { file: pkg.main, format: 'cjs', exports: 'named' },
      { file: pkg.module, format: 'es', exports: 'named' }
    ],
    plugins: plugins
  },

  // Pinia build
  {
    input: 'src/pinia.esm.js',
    external: (id) => id.startsWith('lodash-es') || id === 'vue' || id === 'pinia' || Object.keys(pkg.dependencies).includes(id),
    output: [
      { file: 'dist/pinia-jsonapi.cjs.js', format: 'cjs', exports: 'named' },
      { file: 'dist/pinia-jsonapi.esm.js', format: 'es', exports: 'named' }
    ],
    plugins: plugins
  }
];
