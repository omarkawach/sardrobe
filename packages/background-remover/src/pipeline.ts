import type { ModelManifest } from './manifest'
import {
  applyMaskAsAlpha,
  normalizeMask,
  resampleMaskBilinear,
  rgbaToNchwFloat32,
} from './image-ops'
import { runInference } from './inference'
import type { ResolvedBackend } from './types'
import { BackgroundRemovalError } from './types'

export interface SessionLike {
  backend: ResolvedBackend
}
export interface SessionProvider<S extends SessionLike = SessionLike> {
  /** True if a WebGPU adapter is available in this environment. */
  isWebGpuAvailable(): Promise<boolean>
  /** Resolve (creating if needed) a session for the given backend. */
  getSession(backend: ResolvedBackend): Promise<S>
}

export type Inferencer<S extends SessionLike = SessionLike> = (
  handle: S,
  input: Float32Array,
  manifest: ModelManifest,
) => Promise<Float32Array>

/**
 * Decide which backends to attempt, in order, for the requested selection.
 * `auto` prefers WebGPU when an adapter exists and always keeps WASM as a
 * trailing fallback. Explicit `webgpu`/`wasm` attempt only that backend.
 */
export async function planBackends(
  requested: 'auto' | 'webgpu' | 'wasm',
  provider: SessionProvider<SessionLike>,
): Promise<ResolvedBackend[]> {
  if (requested === 'wasm') return ['wasm']
  if (requested === 'webgpu') return ['webgpu']

  const webGpu = await provider.isWebGpuAvailable()
  return webGpu ? ['webgpu', 'wasm'] : ['wasm']
}

/**
 * Run inference with automatic fallback. Each candidate backend gets a full
 * attempt — session creation *and* inference — so a WebGPU device that creates a
 * session but fails mid-inference still falls through to WASM. The last error
 * is surfaced if every backend fails.
 */
export async function inferWithFallback<S extends SessionLike>(
  input: Float32Array,
  manifest: ModelManifest,
  requested: 'auto' | 'webgpu' | 'wasm',
  provider: SessionProvider<S>,
  infer: Inferencer<S>,
  hooks?: {
    onBackendResolved?: (backend: ResolvedBackend) => void
    onFallback?: (from: ResolvedBackend, to: ResolvedBackend, error: unknown) => void
  },
): Promise<{ mask: Float32Array; backend: ResolvedBackend }> {
  const backends = await planBackends(requested, provider)
  let lastError: unknown = null

  for (let i = 0; i < backends.length; i += 1) {
    const backend = backends[i]!
    try {
      const handle = await provider.getSession(backend)
      const mask = await infer(handle, input, manifest)
      hooks?.onBackendResolved?.(backend)
      return { mask, backend }
    } catch (error) {
      lastError = error
      const next = backends[i + 1]
      if (next) {
        hooks?.onFallback?.(backend, next, error)
      }
    }
  }

  throw new BackgroundRemovalError(
    `All inference backends failed (${backends.join(', ')})`,
    lastError,
  )
}

/**
 * Compose a normalized model mask onto a full-resolution RGBA buffer as alpha.
 * The mask (at model resolution) is min-max normalized, bilinearly resampled to
 * the image dimensions, and written into the alpha channel in place.
 */
export function composeAlpha(
  rgba: Uint8ClampedArray,
  rawMask: Float32Array,
  modelResolution: number,
  width: number,
  height: number,
): Uint8ClampedArray {
  const normalized = normalizeMask(rawMask)
  const resized = resampleMaskBilinear(normalized, modelResolution, modelResolution, width, height)
  return applyMaskAsAlpha(rgba, resized, width, height)
}

/** Build the model input tensor from square RGBA pixels. */
export function buildInputTensor(squareRgba: Uint8ClampedArray, resolution: number): Float32Array {
  return rgbaToNchwFloat32(squareRgba, resolution, resolution)
}

export { runInference }
