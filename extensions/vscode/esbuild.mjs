import { build, context } from 'esbuild'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync, mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isWatch = process.argv.includes('--watch')

const alias = { '@': resolve(__dirname, '../../src') }

function nodePolyfillPlugin() {
  return {
    name: 'node-polyfill',
    setup(build) {
      build.onResolve({ filter: /^(fs|path)$/ }, () => ({
        path: 'node-empty',
        namespace: 'node-polyfill'
      }))
      build.onLoad({ filter: /.*/, namespace: 'node-polyfill' }, () => ({
        contents: 'export default {}; export const readFileSync = () => {}; export const dirname = (p) => p; export const join = (...args) => args.join("/");',
        loader: 'js'
      }))
    }
  }
}

function copyAssetsPlugin() {
  return {
    name: 'copy-assets',
    setup(build) {
      build.onEnd(() => {
        mkdirSync(resolve(__dirname, 'dist'), { recursive: true })
        copyFileSync(
          resolve(__dirname, 'node_modules/canvaskit-wasm/bin/canvaskit.wasm'),
          resolve(__dirname, 'dist/canvaskit.wasm')
        )
        copyFileSync(
          resolve(__dirname, '../../dist/Inter-Regular.ttf'),
          resolve(__dirname, 'dist/Inter-Regular.ttf')
        )
      })
    }
  }
}

const extensionConfig = {
  entryPoints: [resolve(__dirname, 'src/extension.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['vscode'],
  outfile: resolve(__dirname, 'dist/extension.js'),
  alias,
  sourcemap: true,
  minify: !isWatch,
  tsconfig: resolve(__dirname, 'tsconfig.json')
}

const webviewConfig = {
  entryPoints: [resolve(__dirname, 'webview/preview.ts')],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  outfile: resolve(__dirname, 'dist/webview.js'),
  alias,
  sourcemap: true,
  minify: !isWatch,
  tsconfig: resolve(__dirname, 'tsconfig.json'),
  plugins: [nodePolyfillPlugin(), copyAssetsPlugin()],
  define: {
    'process.env.NODE_ENV': '"production"'
  }
}

if (isWatch) {
  const extCtx = await context(extensionConfig)
  const webCtx = await context(webviewConfig)
  await Promise.all([extCtx.watch(), webCtx.watch()])
  console.log('Watching for changes...')
} else {
  await Promise.all([build(extensionConfig), build(webviewConfig)])
  console.log('Build complete.')
}
