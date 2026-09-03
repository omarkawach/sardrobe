import type { BackgroundRemovalProgress, BackgroundRemovalStage } from '@sardrobe/background-remover'
import type { ImportDraft, ImportDraftCounts, ImportDraftFilter, ImportStatusTone } from './domain'

const onnxRuntimeWasmBaseUrl = `/vendor/onnxruntime/${__BACKGROUND_ONNX_RUNTIME_VERSION__}/`
const alphaVisibleThreshold = 8
const alphaOpaqueThreshold = 248
const tinySubjectVisibleRatioThreshold = 0.03
const transparencySampleMaxSide = 512
const supportedImageExtensionPattern = /\.(png|jpe?g|webp|heic|heif)$/i
const heicImageExtensionPattern = /\.(heic|heif)$/i

export const heicUnsupportedMessage =
  'HEIC/HEIF photos can be added on Safari but not in this browser. Convert it to JPEG or PNG, or re-add it from Safari.'

export const maxSourceFileBytes = 12 * 1024 * 1024

function calculateTrimmedBounds(imageData: ImageData) {
  const { data, width, height } = imageData
  let top = height
  let right = 0
  let bottom = 0
  let left = width

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3]

      if (alpha > alphaVisibleThreshold) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }

  if (left > right || top > bottom) {
    return null
  }

  return { top, right, bottom, left }
}

function keepLargestVisibleAlphaComponent(imageData: ImageData) {
  const { data, width, height } = imageData
  const totalPixels = width * height
  const labels = new Int32Array(totalPixels)
  const queue = new Int32Array(totalPixels)
  let nextLabel = 0
  let largestLabel = 0
  let largestSize = 0

  for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex += 1) {
    if (labels[pixelIndex] !== 0 || data[pixelIndex * 4 + 3] <= alphaVisibleThreshold) {
      continue
    }

    nextLabel += 1
    let queueStart = 0
    let queueEnd = 0
    let componentSize = 0

    labels[pixelIndex] = nextLabel
    queue[queueEnd] = pixelIndex
    queueEnd += 1

    while (queueStart < queueEnd) {
      const current = queue[queueStart]
      queueStart += 1
      componentSize += 1

      const x = current % width
      const y = (current - x) / width
      const minY = Math.max(0, y - 1)
      const maxY = Math.min(height - 1, y + 1)
      const minX = Math.max(0, x - 1)
      const maxX = Math.min(width - 1, x + 1)

      for (let neighborY = minY; neighborY <= maxY; neighborY += 1) {
        for (let neighborX = minX; neighborX <= maxX; neighborX += 1) {
          if (neighborX === x && neighborY === y) {
            continue
          }

          const neighborIndex = neighborY * width + neighborX

          if (labels[neighborIndex] !== 0 || data[neighborIndex * 4 + 3] <= alphaVisibleThreshold) {
            continue
          }

          labels[neighborIndex] = nextLabel
          queue[queueEnd] = neighborIndex
          queueEnd += 1
        }
      }
    }

    if (componentSize > largestSize) {
      largestSize = componentSize
      largestLabel = nextLabel
    }
  }

  if (nextLabel <= 1 || largestLabel === 0) {
    return {
      componentCount: nextLabel,
      keptVisiblePixelRatio: largestSize > 0 ? largestSize / totalPixels : 0,
    }
  }

  for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex += 1) {
    if (labels[pixelIndex] !== 0 && labels[pixelIndex] !== largestLabel) {
      data[pixelIndex * 4 + 3] = 0
    }
  }

  return {
    componentCount: nextLabel,
    keptVisiblePixelRatio: largestSize / totalPixels,
  }
}

function hasMeaningfulTransparency(imageData: ImageData) {
  const { data, width, height } = imageData
  const totalPixels = width * height
  let transparentPixels = 0
  let visiblePixels = 0

  for (let index = 3; index < data.length; index += 4) {
    const alpha = data[index]

    if (alpha <= alphaVisibleThreshold) {
      transparentPixels += 1
    }

    if (alpha >= alphaOpaqueThreshold) {
      visiblePixels += 1
    }
  }

  return transparentPixels / totalPixels >= 0.005 && visiblePixels / totalPixels >= 0.02
}

export async function imageHasPrecutAlpha(blob: Blob) {
  let bitmap: ImageBitmap

  try {
    bitmap = await createImageBitmap(blob)
  } catch {
    return false
  }

  try {
    const largestSide = Math.max(bitmap.width, bitmap.height)
    const sampleScale = largestSide > transparencySampleMaxSide ? transparencySampleMaxSide / largestSide : 1
    const sampleWidth = Math.max(1, Math.round(bitmap.width * sampleScale))
    const sampleHeight = Math.max(1, Math.round(bitmap.height * sampleScale))
    const canvas = document.createElement('canvas')
    canvas.width = sampleWidth
    canvas.height = sampleHeight

    const context = canvas.getContext('2d', { willReadFrequently: true })

    if (!context) {
      return false
    }

    context.drawImage(bitmap, 0, 0, sampleWidth, sampleHeight)

    return hasMeaningfulTransparency(context.getImageData(0, 0, sampleWidth, sampleHeight))
  } finally {
    bitmap.close()
  }
}

export function isHeicImageFile(file: File) {
  return file.type === 'image/heic' || file.type === 'image/heif' || heicImageExtensionPattern.test(file.name)
}

export async function isUnsupportedHeic(file: File) {
  if (!isHeicImageFile(file)) {
    return false
  }

  try {
    const bitmap = await createImageBitmap(file)
    bitmap.close()
    return false
  } catch {
    return true
  }
}

export function createDraftId() {
  return globalThis.crypto?.randomUUID?.() ?? `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function isSupportedImageFile(file: File) {
  return file.type.startsWith('image/') || supportedImageExtensionPattern.test(file.name)
}

export function hasRequiredDraftDetails(draft: ImportDraft) {
  return Boolean(draft.form.name.trim() && draft.form.category.trim())
}

export function canSubmitDraft(draft: ImportDraft) {
  const canRetrySave = draft.status === 'failed' && draft.failureStage === 'saving'
  return Boolean((draft.status === 'ready' || canRetrySave) && draft.cutout && hasRequiredDraftDetails(draft))
}

export function draftStatusLabel(draft: ImportDraft) {
  if (draft.status === 'queued') return 'Pending'
  if (draft.status === 'processing') return 'Processing'
  if (draft.status === 'ready') return 'Ready'
  if (draft.status === 'saving') return 'Saving'
  if (draft.failureStage === 'saving') return 'Save failed'
  return 'Failed'
}

export function draftStatusTone(draft: ImportDraft): ImportStatusTone {
  if (draft.status === 'failed') return 'error'
  if (draft.status === 'saving') return 'saving'
  if (draft.status === 'queued' || draft.status === 'processing') return 'processing'
  if (draft.status === 'ready') return 'ready'
  return 'idle'
}

export function draftImageUrl(draft: ImportDraft) {
  return draft.cutout?.url ?? draft.originalUrl
}

export function draftImageLabel(draft: ImportDraft) {
  if (draft.status === 'failed') return 'Failed'
  if (draft.status === 'queued' || draft.status === 'processing') return 'Processing'
  if (draft.status === 'saving') return 'Saving'
  return 'Ready'
}

export function revokeDraftUrls(draft: ImportDraft) {
  if (draft.originalUrl) {
    URL.revokeObjectURL(draft.originalUrl)
  }

  if (draft.cutout?.url) {
    URL.revokeObjectURL(draft.cutout.url)
  }
}

export function countDrafts(drafts: ImportDraft[]): ImportDraftCounts {
  const processing = drafts.filter((draft) => draft.status === 'queued' || draft.status === 'processing').length
  const ready = drafts.filter((draft) => draft.status === 'ready').length
  const failed = drafts.filter((draft) => draft.status === 'failed').length
  const saving = drafts.filter((draft) => draft.status === 'saving').length

  return {
    total: drafts.length,
    processing,
    ready,
    failed,
    saving,
    complete: ready + failed,
  }
}

export function summarizeDraftCounts(counts: ImportDraftCounts) {
  if (counts.total === 0) {
    return 'No import drafts.'
  }

  const parts = [`${counts.total} ${counts.total === 1 ? 'photo' : 'photos'}`]

  if (counts.processing) parts.push(`${counts.processing} processing`)
  if (counts.saving) parts.push(`${counts.saving} saving`)
  if (counts.ready) parts.push(`${counts.ready} ready`)
  if (counts.failed) parts.push(`${counts.failed} failed`)

  return parts.join(' · ')
}

export function draftMatchesFilter(draft: ImportDraft, filter: ImportDraftFilter) {
  if (filter === 'processing') return draft.status === 'queued' || draft.status === 'processing' || draft.status === 'saving'
  return draft.status === filter
}

export function nextAvailableDraftFilter(drafts: ImportDraft[], preferred: ImportDraftFilter): ImportDraftFilter {
  if (drafts.some((draft) => draftMatchesFilter(draft, preferred))) {
    return preferred
  }

  const fallbackOrder: ImportDraftFilter[] = ['ready', 'processing', 'failed']
  return fallbackOrder.find((filter) => drafts.some((draft) => draftMatchesFilter(draft, filter))) ?? preferred
}

export function backgroundRemovalProgressLabel(event: BackgroundRemovalProgress) {
  const labels: Record<BackgroundRemovalStage, string> = {
    'fetch-manifest': 'Loading removal model...',
    'fetch-model': `Downloading removal model... ${Math.round(
      Math.max(0, Math.min(1, (event.ratio - 0.02) / 0.33)) * 100,
    )}%`,
    decode: 'Preparing photo...',
    preprocess: 'Preparing photo...',
    'init-session': 'Starting background remover...',
    inference: 'Removing background...',
    postprocess: 'Refining cutout...',
    encode: 'Encoding cutout...',
    done: 'Finishing cutout...',
  }

  return labels[event.stage]
}

export async function removeBackgroundFromFile(
  file: File,
  onProgress?: (event: BackgroundRemovalProgress) => void,
): Promise<Blob> {
  const configuredManifestUrl = import.meta.env.PUBLIC_BACKGROUND_REMOVAL_MANIFEST_URL

  if (!configuredManifestUrl) {
    throw new Error('Background removal is not configured (missing PUBLIC_BACKGROUND_REMOVAL_MANIFEST_URL).')
  }

  const configuredUrl = new URL(configuredManifestUrl, window.location.origin)
  const manifestUrl = import.meta.env.DEV
    && /^(?:localhost|127\.0\.0\.1)$/.test(window.location.hostname)
    && configuredUrl.origin !== window.location.origin
    ? new URL(`/local-models${configuredUrl.pathname}${configuredUrl.search}`, window.location.origin).toString()
    : configuredUrl.toString()
  const wasmBaseUrl = new URL(onnxRuntimeWasmBaseUrl, window.location.origin).toString()

  const { removeBackground } = await import('@sardrobe/background-remover')

  return removeBackground(file, {
    manifestUrl,
    wasmBaseUrl,
    backend: 'auto',
    quality: 0.88,
    onProgress,
  })
}

export async function blobToWebp(blob: Blob, fileName: string, options?: { isolateMainSubject?: boolean }) {
  const MAX_CUTOUT_EDGE_PX = 2048
  const TARGET_CUTOUT_BYTES = 700 * 1024
  const MIN_CUTOUT_EDGE_PX = 720
  const DOWNSCALE_FACTOR = 0.86
  const MAX_OPTIMIZATION_PASSES = 7
  const WEBP_QUALITY_STEPS = [0.84, 0.76, 0.68, 0.6, 0.52, 0.44, 0.36] as const

  const bitmap = await createImageBitmap(blob)
  const sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = bitmap.width
  sourceCanvas.height = bitmap.height

  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true })

  if (!sourceContext) {
    bitmap.close()
    throw new Error('Could not prepare image conversion')
  }

  sourceContext.drawImage(bitmap, 0, 0)
  bitmap.close()

  const sourceImageData = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
  const isolatedMainSubject = options?.isolateMainSubject ?? false
  const cleanupResult = isolatedMainSubject ? keepLargestVisibleAlphaComponent(sourceImageData) : null

  if (cleanupResult) {
    sourceContext.putImageData(sourceImageData, 0, 0)
  }

  const bounds = calculateTrimmedBounds(sourceImageData)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Could not prepare image conversion')
  }

  if (bounds) {
    const cropWidth = bounds.right - bounds.left + 1
    const cropHeight = bounds.bottom - bounds.top + 1
    const padding = Math.max(16, Math.round(Math.max(cropWidth, cropHeight) * 0.08))

    canvas.width = cropWidth + padding * 2
    canvas.height = cropHeight + padding * 2
    context.drawImage(
      sourceCanvas,
      bounds.left,
      bounds.top,
      cropWidth,
      cropHeight,
      padding,
      padding,
      cropWidth,
      cropHeight,
    )
  } else {
    canvas.width = sourceCanvas.width
    canvas.height = sourceCanvas.height
    context.drawImage(sourceCanvas, 0, 0)
  }

  function resizeCanvas(source: HTMLCanvasElement, width: number, height: number) {
    const resizedCanvas = document.createElement('canvas')
    resizedCanvas.width = width
    resizedCanvas.height = height
    const resizedContext = resizedCanvas.getContext('2d')

    if (!resizedContext) {
      throw new Error('Could not prepare image resizing')
    }

    resizedContext.drawImage(source, 0, 0, width, height)
    return resizedCanvas
  }

  let workingCanvas = canvas

  if (Math.max(workingCanvas.width, workingCanvas.height) > MAX_CUTOUT_EDGE_PX) {
    const scale = MAX_CUTOUT_EDGE_PX / Math.max(workingCanvas.width, workingCanvas.height)
    workingCanvas = resizeCanvas(
      workingCanvas,
      Math.max(1, Math.round(workingCanvas.width * scale)),
      Math.max(1, Math.round(workingCanvas.height * scale)),
    )
  }

  async function encodeWebpAt(source: HTMLCanvasElement, quality: number) {
    return new Promise<Blob>((resolve, reject) => {
      source.toBlob(
        (result) => {
          if (result) {
            resolve(result)
          } else {
            reject(new Error('Could not convert image to WebP'))
          }
        },
        'image/webp',
        quality,
      )
    })
  }

  let selectedBlob: Blob | null = null
  let selectedCanvas = workingCanvas

  for (let pass = 0; pass < MAX_OPTIMIZATION_PASSES; pass += 1) {
    for (const quality of WEBP_QUALITY_STEPS) {
      const candidateBlob = await encodeWebpAt(workingCanvas, quality)

      if (!selectedBlob || candidateBlob.size < selectedBlob.size) {
        selectedBlob = candidateBlob
        selectedCanvas = workingCanvas
      }

      if (candidateBlob.size <= TARGET_CUTOUT_BYTES) {
        selectedBlob = candidateBlob
        selectedCanvas = workingCanvas
        break
      }
    }

    if (selectedBlob && selectedBlob.size <= TARGET_CUTOUT_BYTES) {
      break
    }

    const largestEdge = Math.max(workingCanvas.width, workingCanvas.height)
    if (largestEdge <= MIN_CUTOUT_EDGE_PX) {
      break
    }

    const nextScale = Math.max(MIN_CUTOUT_EDGE_PX / largestEdge, DOWNSCALE_FACTOR)
    const nextWidth = Math.max(1, Math.round(workingCanvas.width * nextScale))
    const nextHeight = Math.max(1, Math.round(workingCanvas.height * nextScale))

    if (nextWidth === workingCanvas.width && nextHeight === workingCanvas.height) {
      break
    }

    workingCanvas = resizeCanvas(workingCanvas, nextWidth, nextHeight)
  }

  if (!selectedBlob) {
    throw new Error('Could not convert image to WebP')
  }

  const tinySubjectWarning = cleanupResult
    ? cleanupResult.componentCount > 1 &&
      cleanupResult.keptVisiblePixelRatio > 0 &&
      cleanupResult.keptVisiblePixelRatio < tinySubjectVisibleRatioThreshold
    : false

  return {
    file: new File([selectedBlob], fileName.replace(/\.[^.]+$/, '') + '-cutout.webp', {
      type: 'image/webp',
    }),
    width: selectedCanvas.width,
    height: selectedCanvas.height,
    tinySubjectWarning,
  }
}
