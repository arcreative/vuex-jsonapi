import babel from 'rollup-plugin-babel';

import pkg from './package.json';

let babelPlugin = babel({
  exclude: 'node_modules/**'
});

export default [
  {
    input: 'src/index.esm.js',
    output: {
      name: 'VueJsonapi',
      file: pkg.browser,
      format: 'umd'
    },
    plugins: [
      babelPlugin
    ]
  },

  {
    input: 'src/index.esm.js',
    external: Object.keys(pkg.dependencies),
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' }
    ],
    plugins: [
      babelPlugin
    ]
  }
];
