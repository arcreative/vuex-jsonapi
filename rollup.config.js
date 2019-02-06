import babel from 'rollup-plugin-babel';
import replace from 'rollup-plugin-replace';

import pkg from './package.json';

let plugins = [
  babel({
    exclude: 'node_modules/**'
  }),
  replace({
    __VERSION__: pkg.version
  })
];

export default [
  {
    input: 'src/index.esm.js',
    output: {
      name: 'VuexJsonapi',
      file: pkg.browser,
      format: 'umd'
    },
    plugins: plugins
  },

  {
    input: 'src/index.esm.js',
    external: Object.keys(pkg.dependencies),
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' }
    ],
    plugins: plugins
  }
];
