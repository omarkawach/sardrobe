import { Button, Input } from '@sardrobe/react-components'
import type { WardrobeItem } from '../wardrobe/domain'
import { CachedImage } from '../shared/CachedImage'
import {
  isItemPlaced,
  PICKER_TABS,
  ROLE_LABEL,
  wardrobeCategoryToRole,
  type PickerTab,
  type PlacedItem,
} from './domain'

type ComposePickerProps = {
  tab: PickerTab
  search: string
  items: WardrobeItem[]
  placement: PlacedItem[]
  wardrobeEmpty: boolean
  onTabChange: (tab: PickerTab) => void
  onSearchChange: (value: string) => void
  onPlaceItem: (item: WardrobeItem) => void
  onNavigateToUpload: () => void
}

export function ComposePicker({
  tab,
  search,
  items,
  placement,
  wardrobeEmpty,
  onTabChange,
  onSearchChange,
  onPlaceItem,
  onNavigateToUpload,
}: ComposePickerProps) {
  return (
    <section className="closet-builder__picker" aria-label="Wardrobe picker">
      <div className="closet-builder__picker-tabs" role="tablist" aria-label="Filter by category">
        {PICKER_TABS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={tab === option.value}
            className={
              tab === option.value
                ? 'closet-builder__picker-tab closet-builder__picker-tab--active'
                : 'closet-builder__picker-tab'
            }
            onClick={() => onTabChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <label className="closet-builder__picker-search closet-field">
        <span className="sr-only">Search wardrobe</span>
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search pieces"
          aria-label="Search wardrobe"
        />
      </label>

      {wardrobeEmpty ? (
        <div className="closet-builder__picker-empty">
          <strong>No pieces in your wardrobe yet.</strong>
          <span>Upload clothes to start building outfits.</span>
          <Button color="primary" type="button" onClick={onNavigateToUpload}>
            Upload clothes
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="closet-builder__picker-empty">
          <span>No pieces match this view.</span>
        </div>
      ) : (
        <div className="closet-builder__picker-grid" role="list">
          {items.map((item) => {
            const placed = isItemPlaced(placement, item.id)
            const role = wardrobeCategoryToRole(item)
            return (
              <button
                key={item.id}
                type="button"
                role="listitem"
                className={
                  placed
                    ? 'closet-builder__picker-card closet-builder__picker-card--placed'
                    : 'closet-builder__picker-card'
                }
                aria-pressed={placed}
                aria-label={
                  placed
                    ? `Remove ${item.name} from outfit`
                    : `Add ${item.name} as ${ROLE_LABEL[role].toLowerCase()}`
                }
                onClick={() => onPlaceItem(item)}
              >
                {item.media ? (
                  <CachedImage className="closet-card-image" src={item.media.url} alt="" />
                ) : (
                  <span className="closet-card-fallback">No cutout</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
