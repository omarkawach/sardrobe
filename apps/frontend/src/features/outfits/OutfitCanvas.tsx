import { useGesture } from '@use-gesture/react'
import { ChevronsDown, ChevronsUp, Minus, Plus, Trash2 } from 'lucide-react'
import { useMemo, useRef, type PointerEvent, type RefObject, type WheelEvent } from 'react'
import { CachedImage } from '../shared/CachedImage'
import {
  clampScale,
  clampUnitWithInset,
  ROLE_LABEL,
  SCALE_MAX,
  SCALE_MIN,
  type PlacedItem,
} from './domain'

type CanvasProps = {
  placement: PlacedItem[]
  interactive: boolean
  selectedItemId?: string | null
  onSelectItem?: (itemId: string | null) => void
  onMoveItem?: (itemId: string, x: number, y: number) => void
  onScaleItem?: (itemId: string, scale: number) => void
  onAdjustZIndex?: (itemId: string, mode: 'front' | 'back') => void
  onRemovePlacedItem?: (itemId: string) => void
}

export function Canvas({
  placement,
  interactive,
  selectedItemId = null,
  onSelectItem,
  onMoveItem,
  onScaleItem,
  onAdjustZIndex,
  onRemovePlacedItem,
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const sorted = useMemo(
    () => [...placement].sort((a, b) => a.zIndex - b.zIndex),
    [placement],
  )
  const selectedItem = selectedItemId
    ? placement.find((placed) => placed.item.id === selectedItemId) ?? null
    : null

  function handleCanvasPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!interactive) return
    if (event.target === event.currentTarget) {
      onSelectItem?.(null)
    }
  }

  function handleCanvasWheel(event: WheelEvent<HTMLDivElement>) {
    if (!interactive || !selectedItem) return
    event.preventDefault()
    const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08
    onScaleItem?.(selectedItem.item.id, selectedItem.scale * factor)
  }

  return (
    <div
      className="closet-builder__canvas-wrap"
      data-base-ui-swipe-ignore={interactive ? '' : undefined}
    >
      <section
        ref={canvasRef}
        className={
          interactive
            ? 'closet-builder__canvas closet-builder__canvas--interactive'
            : 'closet-builder__canvas'
        }
        aria-label="Outfit canvas"
        onPointerDown={handleCanvasPointerDown}
        onWheel={handleCanvasWheel}
      >
        {placement.length === 0 ? (
          <p className="closet-builder__canvas-empty">
            {interactive ? 'Tap pieces from your closet to add them.' : 'No pieces selected.'}
          </p>
        ) : (
          sorted.map((placed) => (
            <CanvasPiece
              key={placed.item.id}
              placed={placed}
              interactive={interactive}
              selected={interactive && placed.item.id === selectedItemId}
              canvasRef={canvasRef}
              onSelect={() => onSelectItem?.(placed.item.id)}
              onMove={(x, y) => onMoveItem?.(placed.item.id, x, y)}
              onScale={(scale) => onScaleItem?.(placed.item.id, scale)}
            />
          ))
        )}
      </section>
      {interactive ? (
        <div className="closet-builder__canvas-toolbar" role="toolbar" aria-label="Item controls">
          <button
            type="button"
            className="closet-builder__canvas-tool"
            aria-label="Shrink"
            disabled={!selectedItem}
            onClick={() =>
              selectedItem && onScaleItem?.(selectedItem.item.id, selectedItem.scale * 0.9)
            }
          >
            <Minus size={16} strokeWidth={1.4} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="closet-builder__canvas-tool"
            aria-label="Enlarge"
            disabled={!selectedItem}
            onClick={() =>
              selectedItem && onScaleItem?.(selectedItem.item.id, selectedItem.scale * 1.1)
            }
          >
            <Plus size={16} strokeWidth={1.4} aria-hidden="true" />
          </button>
          <span className="closet-builder__canvas-toolbar-divider" aria-hidden="true" />
          <button
            type="button"
            className="closet-builder__canvas-tool"
            aria-label="Send to back"
            disabled={!selectedItem}
            onClick={() => selectedItem && onAdjustZIndex?.(selectedItem.item.id, 'back')}
          >
            <ChevronsDown size={16} strokeWidth={1.4} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="closet-builder__canvas-tool"
            aria-label="Send to front"
            disabled={!selectedItem}
            onClick={() => selectedItem && onAdjustZIndex?.(selectedItem.item.id, 'front')}
          >
            <ChevronsUp size={16} strokeWidth={1.4} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="closet-builder__canvas-tool closet-builder__canvas-tool--destructive"
            aria-label={selectedItem ? `Remove ${selectedItem.item.name}` : 'Remove piece'}
            disabled={!selectedItem}
            onClick={() => selectedItem && onRemovePlacedItem?.(selectedItem.item.id)}
          >
            <Trash2 size={16} strokeWidth={1.4} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  )
}

type CanvasPieceProps = {
  placed: PlacedItem
  interactive: boolean
  selected: boolean
  canvasRef: RefObject<HTMLDivElement | null>
  onSelect: () => void
  onMove: (x: number, y: number) => void
  onScale: (scale: number) => void
}

function CanvasPiece({
  placed,
  interactive,
  selected,
  canvasRef,
  onSelect,
  onMove,
  onScale,
}: CanvasPieceProps) {
  const { item, role, x, y, scale, rotation, zIndex } = placed
  const roleLabel = ROLE_LABEL[role]
  const pieceRef = useRef<HTMLDivElement | null>(null)

  useGesture(
    {
      onDrag: ({ xy: [pointerX, pointerY], first, memo }) => {
        if (!interactive) return memo
        const canvas = canvasRef.current
        if (!canvas) return memo

        let grabOffset = memo as { dx: number; dy: number } | undefined
        if (first || !grabOffset) {
          onSelect()
          const pieceRect = pieceRef.current?.getBoundingClientRect()
          const itemCenterX = pieceRect ? pieceRect.left + pieceRect.width / 2 : pointerX
          const itemCenterY = pieceRect ? pieceRect.top + pieceRect.height / 2 : pointerY
          grabOffset = { dx: pointerX - itemCenterX, dy: pointerY - itemCenterY }
        }

        const rect = canvas.getBoundingClientRect()
        const pieceRect = pieceRef.current?.getBoundingClientRect()
        const nextX = (pointerX - grabOffset.dx - rect.left) / rect.width
        const nextY = (pointerY - grabOffset.dy - rect.top) / rect.height
        const insetX = pieceRect && rect.width > 0 ? pieceRect.width / 2 / rect.width : 0
        const insetY = pieceRect && rect.height > 0 ? pieceRect.height / 2 / rect.height : 0
        onMove(clampUnitWithInset(nextX, insetX), clampUnitWithInset(nextY, insetY))
        return grabOffset
      },
      onPinch: ({ offset: [pinchScale], first }) => {
        if (!interactive) return
        if (first) onSelect()
        onScale(clampScale(pinchScale))
      },
    },
    {
      target: pieceRef,
      drag: { filterTaps: true },
      pinch: { from: () => [scale, 0], scaleBounds: { min: SCALE_MIN, max: SCALE_MAX } },
      enabled: interactive,
    },
  )

  const className = [
    'closet-builder__piece',
    `closet-builder__piece--${role}`,
    interactive ? 'closet-builder__piece--interactive' : '',
    selected ? 'closet-builder__piece--selected' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={pieceRef}
      className={className}
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
        zIndex,
        touchAction: interactive ? 'none' : undefined,
      }}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `${roleLabel}: ${item.name}` : undefined}
      aria-pressed={interactive ? selected : undefined}
      onClick={interactive ? onSelect : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect()
              }
            }
          : undefined
      }
    >
      {item.media ? (
        <CachedImage src={item.media.url} alt="" draggable={false} />
      ) : (
        <span className="closet-builder__piece-fallback">No cutout</span>
      )}
      <span className="sr-only">{`${roleLabel}: ${item.name}`}</span>
    </div>
  )
}
