import mediumZoom, { type Zoom } from 'medium-zoom'
import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react'

type ZoomableImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'src'> & {
  alt: string
  label: string
  src: string
}

let sharedZoom: Zoom | null = null

function getSharedZoom() {
  sharedZoom ??= mediumZoom({
    background: 'rgb(28 25 21 / 0.92)',
    margin: 24,
    scrollOffset: 32,
  })

  return sharedZoom
}

export function ZoomableImage({ alt, className = '', label, src, ...imageProps }: ZoomableImageProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const zoomRef = useRef<Zoom | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)

  useEffect(() => {
    const image = imageRef.current
    if (!image) return

    const zoom = getSharedZoom().attach(image)
    const handleOpen = () => setIsZoomed(true)
    const handleClosed = () => setIsZoomed(false)

    image.addEventListener('medium-zoom:open', handleOpen)
    image.addEventListener('medium-zoom:closed', handleClosed)
    zoomRef.current = zoom

    return () => {
      image.removeEventListener('medium-zoom:open', handleOpen)
      image.removeEventListener('medium-zoom:closed', handleClosed)
      zoom.detach(image)
      zoomRef.current = null
    }
  }, [src])

  function openZoom() {
    const image = imageRef.current
    if (!image || !zoomRef.current) return

    void zoomRef.current.open({ target: image })
  }

  return (
    <>
      <button
        type="button"
        className="closet-zoom-trigger"
        aria-label={label}
        onClick={(event) => {
          // medium-zoom owns direct image clicks. The button handler covers its
          // surrounding hit area and assistive-technology generated clicks.
          if (event.target === event.currentTarget) openZoom()
        }}
      >
        <img
          {...imageProps}
          ref={imageRef}
          src={src}
          alt={alt}
          className={['closet-zoom-trigger__image', className].filter(Boolean).join(' ')}
        />
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {isZoomed ? 'Image zoomed. Press Escape to close.' : ''}
      </span>
    </>
  )
}
