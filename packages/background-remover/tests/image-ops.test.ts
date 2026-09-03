import { describe, expect, it } from 'vitest'
import {
  applyMaskAsAlpha,
  normalizeMask,
  resampleMaskBilinear,
  rgbaToNchwFloat32,
} from '../src/image-ops'

describe('rgbaToNchwFloat32', () => {
  it('normalizes RGB as v/255 - 0.5 and drops alpha', () => {
    // One pixel: R=255, G=0, B=128, A=200 (alpha ignored).
    const rgba = new Uint8ClampedArray([255, 0, 128, 200])
    const tensor = rgbaToNchwFloat32(rgba, 1, 1)
    expect(tensor.length).toBe(3)
    expect(tensor[0]).toBeCloseTo(0.5, 6) // R
    expect(tensor[1]).toBeCloseTo(-0.5, 6) // G
    expect(tensor[2]).toBeCloseTo(128 / 255 - 0.5, 6) // B
  })

  it('lays out channels in planar (CHW) order', () => {
    // 2x1 image: pixel0 = (10,20,30), pixel1 = (40,50,60)
    const rgba = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255])
    const tensor = rgbaToNchwFloat32(rgba, 2, 1)
    // R plane: pixels 0..1; G plane: 2..3; B plane: 4..5
    expect(tensor[0]).toBeCloseTo(10 / 255 - 0.5, 6)
    expect(tensor[1]).toBeCloseTo(40 / 255 - 0.5, 6)
    expect(tensor[2]).toBeCloseTo(20 / 255 - 0.5, 6)
    expect(tensor[3]).toBeCloseTo(50 / 255 - 0.5, 6)
    expect(tensor[4]).toBeCloseTo(30 / 255 - 0.5, 6)
    expect(tensor[5]).toBeCloseTo(60 / 255 - 0.5, 6)
  })

  it('throws when the buffer is too small', () => {
    expect(() => rgbaToNchwFloat32(new Uint8ClampedArray(4), 2, 2)).toThrow(RangeError)
  })
})

describe('normalizeMask', () => {
  it('min-max scales to [0,1]', () => {
    const result = normalizeMask([2, 4, 6])
    expect(Array.from(result)).toEqual([0, 0.5, 1])
  })

  it('preserves a uniform in-range mask (clamped), not collapsing to zero', () => {
    // All-foreground sigmoid values stay opaque rather than becoming transparent.
    // 0.5 round-trips exactly through Float32.
    expect(Array.from(normalizeMask([0.5, 0.5, 0.5]))).toEqual([0.5, 0.5, 0.5])
  })

  it('clamps a uniform out-of-range mask', () => {
    expect(Array.from(normalizeMask([3, 3, 3]))).toEqual([1, 1, 1])
    expect(Array.from(normalizeMask([-2, -2, -2]))).toEqual([0, 0, 0])
  })

  it('handles an empty mask', () => {
    expect(normalizeMask([]).length).toBe(0)
  })

  it('handles negative values', () => {
    const result = normalizeMask([-1, 0, 1])
    expect(result[0]).toBeCloseTo(0, 6)
    expect(result[1]).toBeCloseTo(0.5, 6)
    expect(result[2]).toBeCloseTo(1, 6)
  })
})

describe('applyMaskAsAlpha', () => {
  it('writes mask values into the alpha channel', () => {
    const rgba = new Uint8ClampedArray([1, 2, 3, 0, 4, 5, 6, 0])
    applyMaskAsAlpha(rgba, [0, 1], 2, 1)
    expect(rgba[3]).toBe(0)
    expect(rgba[7]).toBe(255)
    // RGB untouched
    expect(Array.from(rgba.slice(0, 3))).toEqual([1, 2, 3])
  })

  it('clamps mask values outside [0,1]', () => {
    const rgba = new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 0])
    applyMaskAsAlpha(rgba, [-1, 2], 2, 1)
    expect(rgba[3]).toBe(0)
    expect(rgba[7]).toBe(255)
  })

  it('throws when the mask length does not match', () => {
    expect(() => applyMaskAsAlpha(new Uint8ClampedArray(8), [0], 2, 1)).toThrow(RangeError)
  })
})

describe('resampleMaskBilinear', () => {
  it('returns a copy at identical dimensions', () => {
    const mask = new Float32Array([0, 1, 1, 0])
    const out = resampleMaskBilinear(mask, 2, 2, 2, 2)
    expect(Array.from(out)).toEqual([0, 1, 1, 0])
    expect(out).not.toBe(mask)
  })

  it('upscales 2x2 to 3x3 with interpolated midpoints', () => {
    // Gradient: top row 0..1, bottom row 0..1
    const mask = new Float32Array([0, 1, 0, 1])
    const out = resampleMaskBilinear(mask, 2, 2, 3, 3)
    // Center pixel should be the average (0.5)
    expect(out[4]).toBeCloseTo(0.5, 5)
    // Corners preserved
    expect(out[0]).toBeCloseTo(0, 5)
    expect(out[2]).toBeCloseTo(1, 5)
  })

  it('throws when the mask does not match source dimensions', () => {
    expect(() => resampleMaskBilinear(new Float32Array(3), 2, 2, 4, 4)).toThrow(RangeError)
  })
})
