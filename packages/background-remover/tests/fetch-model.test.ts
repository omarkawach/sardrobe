import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchManifest, fetchModelBytes } from '../src/fetch-model'
import { BackgroundRemovalError } from '../src/types'
import type { ModelManifest } from '../src/manifest'

const manifestUrl = 'https://models.example.com/v1/manifest.json'

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json' },
  })
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchManifest', () => {
  const valid = {
    schemaVersion: 1,
    modelId: 'm',
    modelFile: 'm.onnx',
    byteSize: 4,
    sha256: 'a'.repeat(64),
    inputName: 'input',
    outputName: 'output',
    resolution: 1024,
  }

  it('fetches and validates the manifest', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(valid)))
    expect(await fetchManifest(manifestUrl)).toEqual(valid)
  })

  it('throws on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })))
    await expect(fetchManifest(manifestUrl)).rejects.toBeInstanceOf(BackgroundRemovalError)
  })

  it('throws on invalid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', { status: 200 })))
    await expect(fetchManifest(manifestUrl)).rejects.toBeInstanceOf(BackgroundRemovalError)
  })

  it('throws on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline')
    }))
    await expect(fetchManifest(manifestUrl)).rejects.toBeInstanceOf(BackgroundRemovalError)
  })
})

describe('fetchModelBytes', () => {
  const bytes = new Uint8Array([1, 2, 3, 4]).buffer

  async function manifestFor(buffer: ArrayBuffer): Promise<ModelManifest> {
    return {
      schemaVersion: 1,
      modelId: 'm',
      modelFile: 'm.onnx',
      byteSize: buffer.byteLength,
      sha256: await sha256Hex(buffer),
      inputName: 'input',
      outputName: 'output',
      resolution: 1024,
    }
  }

  it('returns bytes when size and checksum match', async () => {
    const manifest = await manifestFor(bytes)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(bytes, { status: 200 })))
    const result = await fetchModelBytes(manifest, manifestUrl)
    expect(new Uint8Array(result)).toEqual(new Uint8Array(bytes))
  })

  it('throws on a size mismatch', async () => {
    const manifest = { ...(await manifestFor(bytes)), byteSize: 999 }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(bytes, { status: 200 })))
    await expect(fetchModelBytes(manifest, manifestUrl)).rejects.toThrow(/size mismatch/i)
  })

  it('throws on a checksum mismatch', async () => {
    const manifest = { ...(await manifestFor(bytes)), sha256: 'b'.repeat(64) }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(bytes, { status: 200 })))
    await expect(fetchModelBytes(manifest, manifestUrl)).rejects.toThrow(/checksum mismatch/i)
  })

  it('reports streamed download progress', async () => {
    const manifest = await manifestFor(bytes)
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]))
        controller.enqueue(new Uint8Array([3, 4]))
        controller.close()
      },
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stream, { status: 200 })))
    const onChunk = vi.fn()
    await fetchModelBytes(manifest, manifestUrl, onChunk)
    expect(onChunk).toHaveBeenCalled()
    const [received, total] = onChunk.mock.calls.at(-1)!
    expect(received).toBe(4)
    expect(total).toBe(4)
  })
})
