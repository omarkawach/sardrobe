import { useEffect, useRef, type ImgHTMLAttributes } from 'react'
import { isImageCached, prefetchImage } from './imageCache'

type CachedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string
  /** How far ahead of the viewport to start warming the image. */
  rootMargin?: string
}

/**
 * Drop-in replacement for <img> in scroll grids that share media across views.
 *
 * Keeps native lazy loading, but additionally warms the shared image cache (see
 * imageCache.ts) just before the element enters the viewport. Because the cache is
 * module-level, an image decoded here in #wardrobe is already decoded when the same
 * URL appears in #outfits (and vice versa), so the view switch paints instantly with
 * no re-fetch or main-thread re-decode.
 */
export function CachedImage({ src, rootMargin = '600px', ...imgProps }: CachedImageProps) {
  const ref = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Already warm: bump LRU recency and skip observing.
    if (isImageCached(src)) {
      void prefetchImage(src)
      return
    }

    // No observer available: warm immediately rather than not at all.
    if (typeof IntersectionObserver === 'undefined') {
      void prefetchImage(src)
      return
    }

    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void prefetchImage(src)
            observer.disconnect()
            break
          }
        }
      },
      { rootMargin },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [src, rootMargin])

  return <img ref={ref} src={src} loading="lazy" decoding="async" {...imgProps} />
}
