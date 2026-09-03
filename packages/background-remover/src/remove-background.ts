import { memoize } from 'lodash-es'
import { parseOptions } from './config'
import { fetchManifest, fetchModelBytes } from './fetch-model'
import { decodeBlob, encodeWebp, rasterizeFull, rasterizeToSquare } from './image-io'
import { resolveModelUrl, type ModelManifest } from './manifest'
import { buildInputTensor, composeAlpha, inferWithFallback, type SessionProvider } from './pipeline'
import { getSession as getOrtSession, isWebGpuAvailable, type SessionHandle } from './session'
import { runInference } from './inference'
import {
  BackgroundRemovalError,
  type BackgroundRemovalProgress,
  type BackgroundRemovalStage,
  type NormalizedOptions,
  type RemoveBackgroundOptions,
  type ResolvedBackend,
} from './types'

interface LoadedModel {
  manifest: ModelManifest
  modelUrl: string
  bytes: ArrayBuffer
}

async function loadModelUncached(
  manifestUrl: string,
  onDownloadProgress?: (received: number, total: number) => void,
): Promise<LoadedModel> {
  try {
    const manifest = await fetchManifest(manifestUrl)
    const bytes = await fetchModelBytes(manifest, manifestUrl, onDownloadProgress)
    return { manifest, modelUrl: resolveModelUrl(manifest, manifestUrl), bytes }
  } catch (error) {
    // Evict so a failed download can be retried on the next call.
    loadModel.cache.delete(manifestUrl)
    throw error
  }
}

const loadModel = memoize(loadModelUncached)

/** Reset module-level model/session caches. Test-only. */
export function resetModelCache(): void {
  loadModel.cache.clear?.()
}

export async function removeBackground(
  input: Blob,
  options: RemoveBackgroundOptions,
): Promise<Blob> {
  const config = parseOptions(options)
  const progress = createProgressReporter(config)

  progress('fetch-manifest', 0.02)
  const { manifest, modelUrl, bytes } = await loadModel(
    config.manifestUrl,
    (received, total) => progress('fetch-model', 0.02 + (received / total) * 0.33),
  )
  progress('fetch-model', 0.35)

  progress('decode', 0.4)
  const bitmap = await decodeBlob(input)

  try {
    progress('preprocess', 0.45)
    const square = rasterizeToSquare(bitmap, manifest.resolution)
    const full = rasterizeFull(bitmap)
    const tensor = buildInputTensor(square.data, manifest.resolution)

    progress('init-session', 0.5)
    const provider = createSessionProvider(bytes, modelUrl, config)

    progress('inference', 0.6)
    const { mask, backend } = await inferWithFallback(
      tensor,
      manifest,
      config.backend,
      provider,
      runInference,
      {
        onFallback: (from, to, error) => {
          if (config.debug) {
            console.warn(`[background-remover] ${from} failed, falling back to ${to}`, error)
          }
        },
      },
    )
    progress('postprocess', 0.85, backend)

    composeAlpha(full.data, mask, manifest.resolution, full.width, full.height)

    progress('encode', 0.92, backend)
    const webp = await encodeWebp(full, config.quality)

    progress('done', 1, backend)
    return webp
  } finally {
    bitmap.close()
  }
}

function createSessionProvider(
  bytes: ArrayBuffer,
  modelUrl: string,
  config: NormalizedOptions,
): SessionProvider<SessionHandle> {
  return {
    isWebGpuAvailable,
    getSession: (backend) => getOrtSession(backend, bytes, modelUrl, config.wasmBaseUrl),
  }
}

function createProgressReporter(config: NormalizedOptions) {
  let lastRatio = 0
  let lastReportedRatio = -1
  let lastStage: BackgroundRemovalStage | null = null

  return (stage: BackgroundRemovalStage, ratio: number, backend?: ResolvedBackend) => {
    // Keep the reported ratio monotonic so a UI bar never jumps backwards.
    lastRatio = Math.max(lastRatio, ratio)
    const shouldReport =
      stage !== lastStage ||
      lastRatio === 1 ||
      lastRatio - lastReportedRatio >= 0.01

    if (!shouldReport) {
      return
    }

    const event: BackgroundRemovalProgress = { stage, ratio: lastRatio }
    if (backend) {
      event.backend = backend
    }
    if (config.debug) {
      console.debug(`[background-remover] ${stage} ${Math.round(lastRatio * 100)}%`)
    }
    config.onProgress?.(event)
    lastStage = stage
    lastReportedRatio = lastRatio
  }
}

export { BackgroundRemovalError }
