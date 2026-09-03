import * as ort from 'onnxruntime-web/webgpu'
import { BackgroundRemovalError, type ResolvedBackend } from './types'

export interface SessionHandle {
  session: ort.InferenceSession
  backend: ResolvedBackend
}

const sessionCache = new Map<string, Promise<SessionHandle>>()

let configuredWasmPath: string | null = null

function configureWasm(wasmBaseUrl: string): void {
  const base = wasmBaseUrl.endsWith('/') ? wasmBaseUrl : `${wasmBaseUrl}/`
  if (configuredWasmPath === base) return
  ort.env.wasm.wasmPaths = base
  configuredWasmPath = base
}

function cacheKey(backend: ResolvedBackend, modelUrl: string): string {
  return `${backend}:${modelUrl}`
}

export function resetSessionCache(): void {
  sessionCache.clear()
  configuredWasmPath = null
}

export async function getSession(
  backend: ResolvedBackend,
  modelBytes: ArrayBuffer,
  modelUrl: string,
  wasmBaseUrl: string,
): Promise<SessionHandle> {
  configureWasm(wasmBaseUrl)

  const key = cacheKey(backend, modelUrl)
  const cached = sessionCache.get(key)
  if (cached) {
    return cached
  }

  const creation = createSession(backend, modelBytes).catch((error: unknown) => {
    sessionCache.delete(key)
    throw error
  })

  sessionCache.set(key, creation)
  return creation
}

async function createSession(
  backend: ResolvedBackend,
  modelBytes: ArrayBuffer,
): Promise<SessionHandle> {
  const executionProviders: ort.InferenceSession.ExecutionProviderConfig[] =
    backend === 'webgpu' ? ['webgpu'] : ['wasm']

  try {
    const session = await ort.InferenceSession.create(modelBytes, {
      executionProviders,
      graphOptimizationLevel: 'all',
    })
    return { session, backend }
  } catch (cause) {
    throw new BackgroundRemovalError(`Could not create ${backend} inference session`, cause)
  }
}

/** Whether the current environment exposes a WebGPU adapter. */
export async function isWebGpuAvailable(): Promise<boolean> {
  // Typed structurally to avoid depending on @webgpu/types, which the rest of
  // the package does not need.
  const gpu = (globalThis.navigator as { gpu?: { requestAdapter(): Promise<unknown> } } | undefined)
    ?.gpu
  if (!gpu) return false
  try {
    const adapter = await gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

export { ort }
