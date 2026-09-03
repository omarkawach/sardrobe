import { describe, expect, it } from 'vitest'
import { ManifestError, parseManifest, resolveModelUrl } from '../src/manifest'

const valid = {
  schemaVersion: 1,
  modelId: 'isnet-general-use-1024-v1',
  modelFile: 'isnet-general-use-1024-v1.onnx',
  byteSize: 44_000_000,
  sha256: 'a'.repeat(64),
  inputName: 'input',
  outputName: 'output',
  resolution: 1024,
}

describe('parseManifest', () => {
  it('accepts a well-formed manifest', () => {
    expect(parseManifest(valid)).toEqual(valid)
  })

  it('rejects a wrong schema version', () => {
    expect(() => parseManifest({ ...valid, schemaVersion: 2 })).toThrow(ManifestError)
  })

  it('rejects a non-hex checksum', () => {
    expect(() => parseManifest({ ...valid, sha256: 'XYZ' })).toThrow(ManifestError)
  })

  it('rejects a non-integer byte size', () => {
    expect(() => parseManifest({ ...valid, byteSize: 1.5 })).toThrow(ManifestError)
  })

  it('rejects a negative resolution', () => {
    expect(() => parseManifest({ ...valid, resolution: -1 })).toThrow(ManifestError)
  })

  it('rejects unknown keys', () => {
    expect(() => parseManifest({ ...valid, extra: true })).toThrow(ManifestError)
  })

  it('rejects non-objects', () => {
    expect(() => parseManifest(null)).toThrow(ManifestError)
    expect(() => parseManifest('manifest')).toThrow(ManifestError)
  })
})

describe('manifest producer/consumer contract', () => {
  // The shape build_manifest.mjs emits must round-trip through parseManifest.
  it('parses a manifest in the exact shape the builder writes', () => {
    const builderOutput = {
      schemaVersion: 1,
      modelId: 'isnet-general-use-1024-v1',
      modelFile: 'isnet-general-use-1024.onnx',
      byteSize: 33,
      sha256: 'f7a319b8a7f4380f506618c189f30213527266227c263f96c6a62e8737ba6f7f',
      inputName: 'input',
      outputName: 'output',
      resolution: 1024,
    }
    expect(() => parseManifest(builderOutput)).not.toThrow()
  })
})

describe('resolveModelUrl', () => {
  it('resolves the model relative to the manifest URL', () => {
    const url = resolveModelUrl(valid, 'https://models.example.com/v1/manifest.json')
    expect(url).toBe('https://models.example.com/v1/isnet-general-use-1024-v1.onnx')
  })

  it('honours an absolute model URL', () => {
    const url = resolveModelUrl(
      { ...valid, modelFile: 'https://cdn.example.com/model.onnx' },
      'https://models.example.com/v1/manifest.json',
    )
    expect(url).toBe('https://cdn.example.com/model.onnx')
  })
})
