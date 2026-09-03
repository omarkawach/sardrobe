import { describe, expect, it, vi } from 'vitest'
import {
  buildInputTensor,
  composeAlpha,
  inferWithFallback,
  planBackends,
  type SessionLike,
  type SessionProvider,
} from '../src/pipeline'
import { BackgroundRemovalError, type ResolvedBackend } from '../src/types'
import type { ModelManifest } from '../src/manifest'

const manifest: ModelManifest = {
  schemaVersion: 1,
  modelId: 'test',
  modelFile: 'test.onnx',
  byteSize: 1,
  sha256: 'a'.repeat(64),
  inputName: 'input',
  outputName: 'output',
  resolution: 2,
}

function makeProvider(opts: {
  webgpu: boolean
  sessions?: Partial<Record<ResolvedBackend, () => Promise<SessionLike>>>
}): SessionProvider {
  return {
    isWebGpuAvailable: async () => opts.webgpu,
    getSession: async (backend) => {
      const factory = opts.sessions?.[backend]
      if (factory) return factory()
      return { backend }
    },
  }
}

describe('planBackends', () => {
  it('uses only wasm when requested', async () => {
    expect(await planBackends('wasm', makeProvider({ webgpu: true }))).toEqual(['wasm'])
  })

  it('uses only webgpu when requested', async () => {
    expect(await planBackends('webgpu', makeProvider({ webgpu: false }))).toEqual(['webgpu'])
  })

  it('auto prefers webgpu with wasm fallback when available', async () => {
    expect(await planBackends('auto', makeProvider({ webgpu: true }))).toEqual(['webgpu', 'wasm'])
  })

  it('auto uses wasm only when webgpu is unavailable', async () => {
    expect(await planBackends('auto', makeProvider({ webgpu: false }))).toEqual(['wasm'])
  })
})

describe('inferWithFallback', () => {
  const input = new Float32Array(12)

  it('runs on webgpu when it succeeds', async () => {
    const infer = vi.fn(async () => new Float32Array([1, 2, 3, 4]))
    const result = await inferWithFallback(input, manifest, 'auto', makeProvider({ webgpu: true }), infer)
    expect(result.backend).toBe('webgpu')
    expect(infer).toHaveBeenCalledTimes(1)
  })

  it('falls back to wasm when webgpu session creation fails', async () => {
    const provider = makeProvider({
      webgpu: true,
      sessions: {
        webgpu: async () => {
          throw new Error('no device')
        },
      },
    })
    const infer = vi.fn(async (handle: SessionLike) => {
      expect(handle.backend).toBe('wasm')
      return new Float32Array([0, 0, 0, 0])
    })
    const onFallback = vi.fn()
    const result = await inferWithFallback(input, manifest, 'auto', provider, infer, { onFallback })
    expect(result.backend).toBe('wasm')
    expect(onFallback).toHaveBeenCalledWith('webgpu', 'wasm', expect.any(Error))
  })

  it('falls back to wasm when webgpu inference fails mid-run', async () => {
    const provider = makeProvider({ webgpu: true })
    const infer = vi.fn(async (handle: SessionLike) => {
      if (handle.backend === 'webgpu') throw new Error('inference exploded')
      return new Float32Array([9, 9, 9, 9])
    })
    const result = await inferWithFallback(input, manifest, 'auto', provider, infer)
    expect(result.backend).toBe('wasm')
    expect(infer).toHaveBeenCalledTimes(2)
  })

  it('does not fall back when webgpu is explicitly requested', async () => {
    const provider = makeProvider({ webgpu: true })
    const infer = vi.fn(async () => {
      throw new Error('boom')
    })
    await expect(
      inferWithFallback(input, manifest, 'webgpu', provider, infer),
    ).rejects.toBeInstanceOf(BackgroundRemovalError)
    expect(infer).toHaveBeenCalledTimes(1)
  })

  it('throws when every backend fails', async () => {
    const provider = makeProvider({ webgpu: true })
    const infer = vi.fn(async () => {
      throw new Error('always fails')
    })
    await expect(
      inferWithFallback(input, manifest, 'auto', provider, infer),
    ).rejects.toBeInstanceOf(BackgroundRemovalError)
    expect(infer).toHaveBeenCalledTimes(2)
  })
})

describe('buildInputTensor', () => {
  it('produces a [3 * resolution^2] tensor', () => {
    const rgba = new Uint8ClampedArray(2 * 2 * 4)
    const tensor = buildInputTensor(rgba, 2)
    expect(tensor.length).toBe(3 * 2 * 2)
  })
})

describe('composeAlpha', () => {
  it('normalizes, resamples, and writes alpha at full resolution', () => {
    // 2x2 RGBA, all opaque to start.
    const rgba = new Uint8ClampedArray(2 * 2 * 4).fill(255)
    // Model mask at 2x2: a gradient that min-max normalizes to 0,.33,.66,1.
    const rawMask = new Float32Array([0, 1, 2, 3])
    composeAlpha(rgba, rawMask, 2, 2, 2)
    expect(rgba[3]).toBe(0)
    expect(rgba[15]).toBe(255)
    // RGB preserved
    expect(rgba[0]).toBe(255)
  })
})
