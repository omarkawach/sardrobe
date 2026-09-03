import { describe, expect, it } from 'vitest'
import { isProtectedAppPath, requiresCrossOriginIsolation } from './isolation'

describe('isProtectedAppPath', () => {
  it('matches the authenticated app shell and nested routes', () => {
    expect(isProtectedAppPath('/app')).toBe(true)
    expect(isProtectedAppPath('/app/upload')).toBe(true)
    expect(isProtectedAppPath('/')).toBe(false)
    expect(isProtectedAppPath('/vendor/onnxruntime/1.29.0/ort-wasm-simd-threaded.asyncify.mjs')).toBe(false)
  })
})

describe('requiresCrossOriginIsolation', () => {
  it('keeps app pages isolated', () => {
    expect(requiresCrossOriginIsolation('/app')).toBe(true)
    expect(requiresCrossOriginIsolation('/app/wardrobe')).toBe(true)
  })

  it('keeps astro bundles isolated', () => {
    expect(requiresCrossOriginIsolation('/_astro/client.abc123.js')).toBe(true)
  })

  it('keeps ONNX runtime glue isolated for background removal', () => {
    expect(requiresCrossOriginIsolation('/vendor/onnxruntime/1.29.0/ort-wasm-simd-threaded.asyncify.mjs')).toBe(true)
    expect(requiresCrossOriginIsolation('/vendor/onnxruntime/1.29.0/ort-wasm-simd-threaded.asyncify.wasm')).toBe(true)
  })

  it('does not isolate unrelated public assets', () => {
    expect(requiresCrossOriginIsolation('/favicon.svg')).toBe(false)
  })
})
