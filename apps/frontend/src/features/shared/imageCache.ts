// Module-level cache of decoded images, shared across every view in the app.
//
// Wardrobe and outfit views render the *same* media URLs (/api/wardrobe/media/{id}).
// Without this, switching between #wardrobe and #outfits re-mounts <img> tags and
// forces the browser to re-decode each image on the main thread — the lag felt on
// underpowered phones/tablets. By keeping the decoded HTMLImageElement alive in a
// module-level Map (which survives component unmount/remount), an image decoded in
// one view repaints instantly in the other.
//
// We deliberately do NOT preload everything: callers prefetch incrementally (just
// ahead of the viewport), and an LRU cap bounds memory even for large wardrobes.

const cache = new Map<string, HTMLImageElement>()
const inflight = new Map<string, Promise<HTMLImageElement>>()

// Caps the number of decoded images kept in JS memory. Eviction only drops our
// reference — the browser HTTP cache (immutable, max-age=1y) still serves the bytes,
// so re-display stays cheap (decode only, no network).
const MAX_CACHED_IMAGES = 120

function isClient(): boolean {
  return typeof window !== 'undefined' && typeof Image !== 'undefined'
}

// Map preserves insertion order, so the first key is the least-recently-used.
function touch(url: string): void {
  const img = cache.get(url)
  if (img) {
    cache.delete(url)
    cache.set(url, img)
  }
}

function store(url: string, img: HTMLImageElement): void {
  cache.delete(url)
  cache.set(url, img)
  while (cache.size > MAX_CACHED_IMAGES) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
}

/**
 * Fetch + decode an image once and keep it warm. Idempotent and deduped by url:
 * concurrent callers share one in-flight promise, and repeat calls reuse the cached
 * decoded element. SSR-safe (resolves to a throwaway element when off the client).
 */
export function prefetchImage(url: string): Promise<HTMLImageElement> {
  if (!isClient()) {
    return Promise.resolve(undefined as unknown as HTMLImageElement)
  }

  const cached = cache.get(url)
  if (cached) {
    touch(url)
    return Promise.resolve(cached)
  }

  const pending = inflight.get(url)
  if (pending) {
    return pending
  }

  const img = new Image()
  img.decoding = 'async'
  img.src = url

  const settle = img.decode
    ? img.decode()
    : new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
      })

  // Cache on success and on failure: a decode error usually means the bytes are
  // already in transit/cached, and re-trying on every scroll would be wasteful.
  const promise = settle
    .then(() => img)
    .catch(() => img)
    .then((result) => {
      store(url, result)
      return result
    })
    .finally(() => {
      inflight.delete(url)
    })

  inflight.set(url, promise)
  return promise
}

/** True if the url's decoded element is already in the cache (instant-paint path). */
export function isImageCached(url: string): boolean {
  return cache.has(url)
}

/** Returns the cached decoded element if present, else undefined. */
export function getCachedImage(url: string): HTMLImageElement | undefined {
  return cache.get(url)
}
