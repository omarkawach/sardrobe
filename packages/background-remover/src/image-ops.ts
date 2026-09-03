import ndarray from 'ndarray'

export function rgbaToNchwFloat32(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): Float32Array {
  const pixelCount = width * height
  if (rgba.length < pixelCount * 4) {
    throw new RangeError(
      `rgba length ${rgba.length} too small for ${width}x${height} (need ${pixelCount * 4})`,
    )
  }

  const tensor = new Float32Array(pixelCount * 3)

  const source = ndarray(rgba, [height, width, 4])
  const dest = ndarray(tensor, [3, height, width])

  for (let channel = 0; channel < 3; channel += 1) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        dest.set(channel, y, x, source.get(y, x, channel) / 255 - 0.5)
      }
    }
  }

  return tensor
}

export function normalizeMask(mask: Float32Array | number[]): Float32Array {
  const length = mask.length
  const out = new Float32Array(length)
  if (length === 0) {
    return out
  }

  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < length; i += 1) {
    const value = mask[i]!
    if (value < min) min = value
    if (value > max) max = value
  }

  const range = max - min
  if (range <= 0) {
    // Uniform mask: preserve the shared (already-sigmoid) value, clamped.
    const uniform = min <= 0 ? 0 : min >= 1 ? 1 : min
    if (uniform !== 0) {
      out.fill(uniform)
    }
    return out
  }

  for (let i = 0; i < length; i += 1) {
    out[i] = (mask[i]! - min) / range
  }

  return out
}

/**
 * Apply a single-channel `[0,1]` mask as the alpha channel of an RGBA buffer,
 * in place. The mask must have exactly one value per pixel; alpha is written as
 * `round(mask * 255)` clamped to `[0,255]`. Returns the same buffer for
 * chaining.
 */
export function applyMaskAsAlpha(
  rgba: Uint8ClampedArray,
  mask: Float32Array | number[],
  width: number,
  height: number,
): Uint8ClampedArray {
  const pixelCount = width * height
  if (mask.length !== pixelCount) {
    throw new RangeError(
      `mask length ${mask.length} does not match ${width}x${height} (${pixelCount})`,
    )
  }
  if (rgba.length < pixelCount * 4) {
    throw new RangeError(
      `rgba length ${rgba.length} too small for ${width}x${height} (need ${pixelCount * 4})`,
    )
  }

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const alpha = Math.round(clamp01(mask[pixel]!) * 255)
    rgba[pixel * 4 + 3] = alpha
  }

  return rgba
}

/**
 * Bilinearly resample a single-channel float mask from `src` dimensions to
 * `dst` dimensions. Used to scale the model's fixed-resolution mask back to the
 * decoded image size before it is applied as alpha.
 */
export function resampleMaskBilinear(
  mask: Float32Array | number[],
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
): Float32Array {
  if (mask.length !== srcWidth * srcHeight) {
    throw new RangeError(
      `mask length ${mask.length} does not match source ${srcWidth}x${srcHeight}`,
    )
  }

  const out = new Float32Array(dstWidth * dstHeight)
  if (dstWidth === srcWidth && dstHeight === srcHeight) {
    out.set(mask as ArrayLike<number>)
    return out
  }

  // Map dst pixel centers back into src space. Guard against 1px dimensions,
  // where the scale denominator would be zero.
  const scaleX = dstWidth > 1 ? (srcWidth - 1) / (dstWidth - 1) : 0
  const scaleY = dstHeight > 1 ? (srcHeight - 1) / (dstHeight - 1) : 0

  for (let y = 0; y < dstHeight; y += 1) {
    const srcY = y * scaleY
    const y0 = Math.floor(srcY)
    const y1 = Math.min(y0 + 1, srcHeight - 1)
    const wy = srcY - y0

    for (let x = 0; x < dstWidth; x += 1) {
      const srcX = x * scaleX
      const x0 = Math.floor(srcX)
      const x1 = Math.min(x0 + 1, srcWidth - 1)
      const wx = srcX - x0

      const top = lerp(mask[y0 * srcWidth + x0]!, mask[y0 * srcWidth + x1]!, wx)
      const bottom = lerp(mask[y1 * srcWidth + x0]!, mask[y1 * srcWidth + x1]!, wx)
      out[y * dstWidth + x] = lerp(top, bottom, wy)
    }
  }

  return out
}

function clamp01(value: number): number {
  if (value <= 0) return 0
  if (value >= 1) return 1
  return value
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
