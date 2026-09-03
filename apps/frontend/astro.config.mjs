import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sentry from '@sentry/astro'
import sitemap from '@astrojs/sitemap'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// ONNX Runtime Web ships its WASM/MJS glue as separate assets. We serve them
// same-origin (CSP forbids cross-origin scripts/wasm) under a version-pinned
// path so they cache immutably and never collide across runtime upgrades.
// `onnxruntime-web` is a dependency of @sardrobe/background-remover (not the
// frontend directly), so resolve it *through* that package to find its dist dir
// regardless of how pnpm lays out node_modules.
const requireFromHere = createRequire(import.meta.url)
const backgroundRemoverEntry = requireFromHere.resolve('@sardrobe/background-remover/package.json')
// onnxruntime-web's main entry lives inside its `dist/` directory, so its parent
// dir is the dist dir we copy WASM/MJS assets from. Resolving the bare specifier
// avoids the package's `exports` map blocking direct file/subpath access.
const onnxRuntimeDistDir = dirname(createRequire(backgroundRemoverEntry).resolve('onnxruntime-web'))
const onnxRuntimePackage = JSON.parse(
  readFileSync(join(onnxRuntimeDistDir, '..', 'package.json'), 'utf8'),
)
const onnxRuntimeVersion = onnxRuntimePackage.version
// The `onnxruntime-web/webgpu` entry selects the Asyncify build, which is below
// Cloudflare's 25 MiB per-asset limit and backs both WebGPU and WASM execution.
const onnxRuntimeAssets = [
  'ort-wasm-simd-threaded.asyncify.wasm',
  'ort-wasm-simd-threaded.asyncify.mjs',
]

// Transformers.js bundles its own ONNX Runtime version. Keep that version
// separate: mixing the generated MJS loader with another runtime's WASM is not
// supported and can fail in ways that only appear on particular browsers.
const transformersEntry = requireFromHere.resolve('@huggingface/transformers')
const transformersPackageDir = join(dirname(transformersEntry), '..')
const transformersPackage = JSON.parse(
  readFileSync(join(transformersPackageDir, 'package.json'), 'utf8'),
)
const transformersVersion = transformersPackage.version
const transformersOnnxRuntimeDistDir = dirname(
  createRequire(transformersEntry).resolve('onnxruntime-web'),
)
const transformersOnnxRuntimeAssets = [
  'ort-wasm-simd-threaded.asyncify.wasm',
  'ort-wasm-simd-threaded.asyncify.mjs',
]

// ONNX Runtime's web entrypoints contain fallback `new URL()` references that
// cause Vite to emit extra 20–25 MB WASM files even when wasmPaths is explicitly
// configured. The app always points both runtimes at the versioned vendor files
// copied below, so these hashed `_astro` copies are unreachable.
const removeUnreachableOnnxAssets = {
  name: 'remove-unreachable-onnx-assets',
  generateBundle(_options, bundle) {
    for (const [fileName, output] of Object.entries(bundle)) {
      if (
        output.type === 'asset' &&
        fileName.startsWith('_astro/') &&
        fileName.includes('ort-wasm-simd-threaded.asyncify')
      ) {
        delete bundle[fileName]
      }
    }
  },
}
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
const sentryOrg = process.env.SENTRY_ORG
const sentryProject = process.env.SENTRY_PROJECT
const sentryIntegration =
  sentryAuthToken && sentryOrg && sentryProject
    ? sentry({
        org: sentryOrg,
        project: sentryProject,
        authToken: sentryAuthToken,
      })
    : null

export default defineConfig({
  site: process.env.PUBLIC_APP_URL ?? 'http://localhost:4321',
  integrations: [
    react(),
    ...(sentryIntegration ? [sentryIntegration] : []),
    sitemap({
      filter: (page) => !new URL(page).pathname.startsWith('/app'),
    }),
  ],
  image: {
    service: {
      entrypoint: 'astro/assets/services/noop',
    },
  },
  server: {
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  vite: {
    envPrefix: ['PUBLIC_', 'APP_ENV'],
    define: {
      __BACKGROUND_ONNX_RUNTIME_VERSION__: JSON.stringify(onnxRuntimeVersion),
      __TRANSFORMERS_VERSION__: JSON.stringify(transformersVersion),
    },
    plugins: [
      viteStaticCopy({
        targets: [
          ...onnxRuntimeAssets.map((file) => ({
            src: join(onnxRuntimeDistDir, file),
            dest: `vendor/onnxruntime/${onnxRuntimeVersion}`,
            rename: { stripBase: true, name: file },
          })),
          ...transformersOnnxRuntimeAssets.map((file) => ({
            src: join(transformersOnnxRuntimeDistDir, file),
            dest: `vendor/transformers/${transformersVersion}`,
            rename: { stripBase: true, name: file },
          })),
        ],
      }),
      removeUnreachableOnnxAssets,
    ],
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8787',
          changeOrigin: true,
          headers: {
            'x-forwarded-host': 'localhost:4321',
            'x-forwarded-proto': 'http',
          },
        },
        // Keep local browser testing same-origin. The production model host is
        // intentionally separate, but its immutable manifest/ONNX assets do
        // not need to expose localhost through CORS just to support dev.
        '/local-models': {
          target: 'https://models.sardrobe.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/local-models/, ''),
        },
      },
    },
  },
})
