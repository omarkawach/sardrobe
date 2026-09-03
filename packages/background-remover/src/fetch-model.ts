import { BackgroundRemovalError } from './types'
import { parseManifest, resolveModelUrl, type ModelManifest } from './manifest'

export interface FetchedModel {
  manifest: ModelManifest
  modelUrl: string
  bytes: ArrayBuffer
}

/** Fetch and validate the manifest JSON at `manifestUrl`. */
export async function fetchManifest(manifestUrl: string): Promise<ModelManifest> {
  let response: Response
  try {
    response = await fetch(manifestUrl, { credentials: 'omit' })
  } catch (cause) {
    throw new BackgroundRemovalError(`Could not fetch model manifest from ${manifestUrl}`, cause)
  }

  if (!response.ok) {
    throw new BackgroundRemovalError(
      `Model manifest request failed (${response.status} ${response.statusText})`,
    )
  }

  let json: unknown
  try {
    json = await response.json()
  } catch (cause) {
    throw new BackgroundRemovalError('Model manifest is not valid JSON', cause)
  }

  return parseManifest(json)
}

/**
 * Download the model binary referenced by `manifest`, streaming progress to
 * `onChunk`, and verify it matches the manifest's byte size and SHA-256. A
 * mismatch throws rather than returning corrupt or substituted weights.
 */
export async function fetchModelBytes(
  manifest: ModelManifest,
  manifestUrl: string,
  onChunk?: (received: number, total: number) => void,
): Promise<ArrayBuffer> {
  const modelUrl = resolveModelUrl(manifest, manifestUrl)

  let response: Response
  try {
    response = await fetch(modelUrl, { credentials: 'omit' })
  } catch (cause) {
    throw new BackgroundRemovalError(`Could not fetch model from ${modelUrl}`, cause)
  }

  if (!response.ok) {
    throw new BackgroundRemovalError(
      `Model request failed (${response.status} ${response.statusText})`,
    )
  }

  const bytes = await readBodyWithProgress(response, manifest.byteSize, onChunk)

  if (bytes.byteLength !== manifest.byteSize) {
    throw new BackgroundRemovalError(
      `Model size mismatch: expected ${manifest.byteSize} bytes, got ${bytes.byteLength}`,
    )
  }

  const digest = await sha256Hex(bytes)
  if (digest !== manifest.sha256) {
    throw new BackgroundRemovalError(
      `Model checksum mismatch: expected ${manifest.sha256}, got ${digest}`,
    )
  }

  return bytes
}

async function readBodyWithProgress(
  response: Response,
  total: number,
  onChunk?: (received: number, total: number) => void,
): Promise<ArrayBuffer> {
  // Without a readable stream (or a progress callback) just buffer the body.
  if (!response.body || !onChunk) {
    return response.arrayBuffer()
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      received += value.byteLength
      onChunk(received, total)
    }
  }

  const out = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out.buffer
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
