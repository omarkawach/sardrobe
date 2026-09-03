/**
 * Browser-only image I/O: decoding a Blob, rasterizing to RGBA at a target
 * size, and encoding RGBA back to a transparent WebP. These touch `document` /
 * `OffscreenCanvas` and are kept apart from the pure math in `image-ops.ts` so
 * that module stays testable under Node.
 */

export interface RasterImage {
  data: Uint8ClampedArray
  width: number
  height: number
}

/**
 * A 2D raster surface. Prefers `OffscreenCanvas` (works in workers) and falls
 * back to a DOM canvas. Encapsulated so the rest of the pipeline never branches
 * on which surface it got.
 */
interface Surface {
  readonly width: number
  readonly height: number
  readonly context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  toBlob(type: string, quality: number): Promise<Blob>
}

function createSurface(width: number, height: number): Surface {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) {
      throw new Error('Could not acquire a 2D context')
    }
    return {
      width,
      height,
      context,
      toBlob: (type, quality) => canvas.convertToBlob({ type, quality }),
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Could not acquire a 2D context')
  }
  return {
    width,
    height,
    context,
    toBlob: (type, quality) =>
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob returned null'))),
          type,
          quality,
        )
      }),
  }
}

/** Decode a Blob into an ImageBitmap, throwing a readable error on failure. */
export async function decodeBlob(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob)
  } catch (cause) {
    throw new Error('Could not decode image', { cause })
  }
}

/**
 * Draw `bitmap` into a `size x size` square (the model's fixed input
 * resolution) and read back RGBA pixels. The image is stretched to fill the
 * square; aspect ratio is restored later when the mask is resampled back onto
 * the original dimensions.
 */
export function rasterizeToSquare(bitmap: ImageBitmap, size: number): RasterImage {
  const surface = createSurface(size, size)
  surface.context.drawImage(bitmap, 0, 0, size, size)
  const imageData = surface.context.getImageData(0, 0, size, size)
  return { data: imageData.data, width: size, height: size }
}

/** Read full-resolution RGBA pixels from a decoded bitmap. */
export function rasterizeFull(bitmap: ImageBitmap): RasterImage {
  const surface = createSurface(bitmap.width, bitmap.height)
  surface.context.drawImage(bitmap, 0, 0)
  const imageData = surface.context.getImageData(0, 0, bitmap.width, bitmap.height)
  return { data: imageData.data, width: bitmap.width, height: bitmap.height }
}

/** Encode an RGBA buffer as a transparent WebP Blob at the given quality. */
export async function encodeWebp(image: RasterImage, quality: number): Promise<Blob> {
  const surface = createSurface(image.width, image.height)
  // Allocate an ImageData via the context so its backing buffer is a plain
  // ArrayBuffer (constructing `new ImageData(typedArray, ...)` is rejected when
  // the array might be backed by a SharedArrayBuffer), then copy pixels in.
  const imageData = surface.context.createImageData(image.width, image.height)
  imageData.data.set(image.data)
  surface.context.putImageData(imageData, 0, 0)
  return surface.toBlob('image/webp', quality)
}
