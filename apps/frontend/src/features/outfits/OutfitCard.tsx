import { useMemo } from 'react'
import type { WardrobeItem } from '../wardrobe/domain'
import { outfitToPlacement, type Outfit } from './domain'
import { Canvas } from './OutfitCanvas'

type OutfitCardProps = {
  outfit: Outfit
  wardrobe: WardrobeItem[]
  onOpen: () => void
}

export function OutfitCard({ outfit, wardrobe, onOpen }: OutfitCardProps) {
  const placement = useMemo(() => outfitToPlacement(outfit, wardrobe), [outfit, wardrobe])

  return (
    <article className="closet-outfit-card">
      <button
        className="closet-outfit-card__open"
        type="button"
        aria-label={`Open outfit ${outfit.name}, ${outfit.items.length} ${outfit.items.length === 1 ? 'piece' : 'pieces'}`}
        onClick={onOpen}
      >
        <span className="closet-outfit-card__preview" aria-hidden="true">
          <Canvas placement={placement} interactive={false} />
        </span>
        <span className="closet-outfit-card__title">{outfit.name}</span>
        <span className="closet-outfit-card__meta">
          {outfit.items.length} {outfit.items.length === 1 ? 'piece' : 'pieces'}
        </span>
      </button>
    </article>
  )
}
