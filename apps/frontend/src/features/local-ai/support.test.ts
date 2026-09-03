import { describe, expect, it } from 'vitest'
import { isMobileOrTabletDevice } from './support'

const iphone = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)',
  platform: 'iPhone',
  maxTouchPoints: 5,
}

describe('mobile and tablet detection', () => {
  it('detects iPhones and iPads using their user agent', () => {
    expect(isMobileOrTabletDevice(iphone)).toBe(true)
  })

  it('detects iPadOS when it requests a desktop site', () => {
    expect(isMobileOrTabletDevice({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    })).toBe(true)
  })

  it('detects Android phones and tablets', () => {
    expect(isMobileOrTabletDevice({
      userAgent: 'Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro) AppleWebKit/537.36 Mobile',
      platform: 'Linux armv8l',
      maxTouchPoints: 5,
    })).toBe(true)
    expect(isMobileOrTabletDevice({
      userAgent: 'Mozilla/5.0 (Linux; Android 16; Pixel Tablet) AppleWebKit/537.36',
      platform: 'Linux armv8l',
      maxTouchPoints: 10,
    })).toBe(true)
  })

  it('does not classify desktop computers as mobile devices', () => {
    expect(isMobileOrTabletDevice({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
      platform: 'MacIntel',
      maxTouchPoints: 0,
    })).toBe(false)
    expect(isMobileOrTabletDevice({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      platform: 'Win32',
      maxTouchPoints: 10,
    })).toBe(false)
  })
})
