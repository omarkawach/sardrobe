import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The session module imports `onnxruntime-web/webgpu`, which expects a browser.
// Mock it so we can exercise the caching/eviction semantics under Node.
const createMock = vi.fn()

vi.mock('onnxruntime-web/webgpu', () => ({
  env: { wasm: { wasmPaths: '' } },
  InferenceSession: {
    create: (...args: unknown[]) => createMock(...args),
  },
  Tensor: class {},
}))

import { getSession, resetSessionCache } from '../src/session'

const bytes = new Uint8Array([1, 2, 3]).buffer
const modelUrl = 'https://models.example.com/v1/m.onnx'
const wasmBase = 'https://app.example.com/vendor/onnxruntime/1.29.0/'

beforeEach(() => {
  resetSessionCache()
  createMock.mockReset()
})

afterEach(() => {
  resetSessionCache()
})

describe('getSession caching', () => {
  it('creates one session per backend and reuses it', async () => {
    createMock.mockImplementation(async () => ({ id: 'session' }))

    const a = await getSession('webgpu', bytes, modelUrl, wasmBase)
    const b = await getSession('webgpu', bytes, modelUrl, wasmBase)
    expect(a).toBe(b)
    expect(a.backend).toBe('webgpu')
    expect(createMock).toHaveBeenCalledTimes(1)
  })

  it('caches webgpu and wasm separately', async () => {
    createMock.mockImplementation(async () => ({ id: 'session' }))

    await getSession('webgpu', bytes, modelUrl, wasmBase)
    await getSession('wasm', bytes, modelUrl, wasmBase)
    expect(createMock).toHaveBeenCalledTimes(2)
  })

  it('shares a single in-flight creation between concurrent callers', async () => {
    let resolveCreate: (value: unknown) => void = () => {}
    createMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve
        }),
    )

    const p1 = getSession('webgpu', bytes, modelUrl, wasmBase)
    const p2 = getSession('webgpu', bytes, modelUrl, wasmBase)
    resolveCreate({ id: 'session' })
    const [a, b] = await Promise.all([p1, p2])
    expect(a).toBe(b)
    expect(createMock).toHaveBeenCalledTimes(1)
  })

  it('evicts a rejected session so the next call retries', async () => {
    createMock.mockRejectedValueOnce(new Error('device lost'))
    await expect(getSession('webgpu', bytes, modelUrl, wasmBase)).rejects.toThrow()

    createMock.mockResolvedValueOnce({ id: 'session' })
    const ok = await getSession('webgpu', bytes, modelUrl, wasmBase)
    expect(ok.backend).toBe('webgpu')
    expect(createMock).toHaveBeenCalledTimes(2)
  })
})
