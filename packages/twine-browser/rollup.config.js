import path from 'path'

import babel      from 'rollup-plugin-babel'
import resolve    from 'rollup-plugin-node-resolve'
import commonjs   from 'rollup-plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import { sizeSnapshot } from 'rollup-plugin-size-snapshot'

const globals = {
  //Example: react-dom: 'ReactDOM'
}

const defaultPlugins = [
  resolve({
    mainFields: ['browser', 'module', 'main'],
    customResolveOptions: {
      moduleDirectory: [
        path.resolve(__dirname, 'node_modules'),
        path.resolve(__dirname, 'node_modules', '@inmar', 'twine-core', 'node_modules')
      ]
    }
  }),
  commonjs(),
]

const getBabel = ({ useESModules = true, targets = {browsers: ['ie >= 11']} } = {}) => {
  return babel({
    exclude: 'node_modules/**',
    runtimeHelpers: true,
    presets: [['@babel/preset-env', { modules: false, targets }]],
    plugins: [['@babel/transform-runtime', { helpers: true, regenerator: true, useESModules }]],
  })
}

//Creates CommonJS, ESM, and UMD builds
function createConfig(entry, out, globalName) {
  return [
    {
      input: entry,
      output: { file: `./dist/${out}.esm.js`, format: 'esm', sourcemap: true },
      plugins: [...defaultPlugins, getBabel()],
      external: Object.keys(globals),
    },
    {
      input: entry,
      output: { file: `./dist/${out}.cjs.js`, format: 'cjs', sourcemap: true },
      plugins: [...defaultPlugins, getBabel({ useESModules: false })],
      external: Object.keys(global)
    },
    ...(!globalName ? [] : [
        {
          input: entry,
          output: {
            file: `./dist/${out}.js`,
            format: 'umd',
            name: globalName,
            globals,
            sourcemap: true
          },
          external: Object.keys(globals),
          plugins: [...defaultPlugins, getBabel()],
        },
        {
          input: entry,
          output: {
            file: `./dist/${out}.min.js`,
            format: 'umd',
            name: globalName,
            globals,
            sourcemap: true
          },
          external: Object.keys(globals),
          plugins: [
            ...defaultPlugins,
            getBabel(),
            terser(),
            sizeSnapshot()
          ],
        },
      ]
    )
  ]
}

export default [
  ...createConfig('./src/index.js', 'twine-browser', 'Twine'),
]