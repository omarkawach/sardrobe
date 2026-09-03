import { describe, expect, it } from 'vitest'
import { parseOptions } from '../src/config'
import { BackgroundRemovalError } from '../src/types'

const base = {
  manifestUrl: 'https://models.example.com/m/manifest.json',
  wasmBaseUrl: 'https://app.example.com/vendor/onnxruntime/1.29.0/',
}

describe('parseOptions', () => {
  it('applies defaults', () => {
    const result = parseOptions(base)
    expect(result.backend).toBe('auto')
    expect(result.quality).toBe(0.88)
    expect(result.debug).toBe(false)
    expect(result.onProgress).toBeUndefined()
  })

  it('keeps explicit values', () => {
    const onProgress = () => {}
    const result = parseOptions({ ...base, backend: 'wasm', quality: 0.5, debug: true, onProgress })
    expect(result.backend).toBe('wasm')
    expect(result.quality).toBe(0.5)
    expect(result.debug).toBe(true)
    expect(result.onProgress).toBe(onProgress)
  })

  it('rejects an invalid manifest URL', () => {
    expect(() => parseOptions({ ...base, manifestUrl: 'not-a-url' })).toThrow(BackgroundRemovalError)
  })

  it('rejects an invalid wasm base URL', () => {
    expect(() => parseOptions({ ...base, wasmBaseUrl: 'nope' })).toThrow(BackgroundRemovalError)
  })

  it('rejects out-of-range quality', () => {
    expect(() => parseOptions({ ...base, quality: 0 })).toThrow(BackgroundRemovalError)
    expect(() => parseOptions({ ...base, quality: 1.5 })).toThrow(BackgroundRemovalError)
  })

  it('rejects an unknown backend', () => {
    // @ts-expect-error intentionally invalid backend
    expect(() => parseOptions({ ...base, backend: 'cuda' })).toThrow(BackgroundRemovalError)
  })

  it('rejects unknown keys', () => {
    // @ts-expect-error intentionally extra key
    expect(() => parseOptions({ ...base, device: 'gpu' })).toThrow(BackgroundRemovalError)
  })
})
