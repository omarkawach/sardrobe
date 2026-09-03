import { Button, Input } from '@sardrobe/react-components'
import { ClosetIcon } from '../../components/closet/ClosetIcon'
import { ClosetEmptyState, ClosetPanel } from '../../components/closet/ClosetPrimitives'
import { CachedImage } from '../shared/CachedImage'
import type { WardrobeItem } from './domain'

type WardrobeLibraryViewProps = {
  activeFilterCount: number
  closetGroups: { label: string; items: WardrobeItem[] }[]
  closetSummaryLabel: string
  items: WardrobeItem[]
  mobileFiltersOpen: boolean
  mobileSearchOpen: boolean
  onNavigateToImport: () => void
  onOpenFilters: () => void
  onOpenItem: (item: WardrobeItem) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export function WardrobeLibraryView({
  activeFilterCount,
  closetGroups,
  closetSummaryLabel,
  items,
  mobileFiltersOpen,
  mobileSearchOpen,
  onNavigateToImport,
  onOpenFilters,
  onOpenItem,
  searchQuery,
  setSearchQuery,
}: WardrobeLibraryViewProps) {
  return (
    <section className="closet-library" aria-labelledby="library-title">
      <ClosetPanel className="closet-library__panel">
        <div className="closet-library__header">
          <div>
            <h1 id="library-title">Wardrobe</h1>
            <span className="closet-library__count">{closetSummaryLabel}</span>
          </div>
          <div className="closet-library__actions">
            <label
              className={mobileSearchOpen ? 'closet-search closet-search--mobile-open' : 'closet-search'}
            >
              <ClosetIcon name="search" />
              <span className="sr-only">Search wardrobe</span>
              <Input
                value={searchQuery}
                placeholder="Search wardrobe"
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <Button
              variant="outline"
              color="neutral"
              type="button"
              className="closet-library__filter-button"
              aria-expanded={mobileFiltersOpen}
              aria-controls="wardrobe-filters-drawer"
              aria-haspopup="dialog"
              onClick={onOpenFilters}
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>
          </div>
        </div>

        {items.length > 0 ? (
          closetGroups.length > 0 ? (
            <div className="closet-groups" aria-live="polite">
              {closetGroups.map((group) => (
                <section className="closet-group" key={group.label} aria-labelledby={`closet-group-${group.label.replace(/\W+/g, '-').toLowerCase()}`}>
                  <div className="closet-group__header">
                    <h2 id={`closet-group-${group.label.replace(/\W+/g, '-').toLowerCase()}`}>{group.label}</h2>
                    <span>
                      {group.items.length} {group.items.length === 1 ? 'piece' : 'pieces'}
                    </span>
                  </div>
                  <div className="closet-grid">
                    {group.items.map((item) => (
                      <article className="closet-item-card" key={item.id}>
                        <button
                          className="closet-item-card__open"
                          type="button"
                          aria-label={`View details for ${item.name}`}
                          onClick={() => onOpenItem(item)}
                        >
                          <span className="closet-item-card__media">
                            {item.media ? (
                              <CachedImage className="closet-card-image" src={item.media.url} alt="" />
                            ) : (
                              <span className="closet-card-fallback">No cutout</span>
                            )}
                          </span>
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <ClosetEmptyState
              title="No pieces match those filters."
              description="Clear filters or search for something broader."
            />
          )
        ) : (
          <ClosetEmptyState
            title="Your closet is ready for its first cutout."
            description="Upload one piece to start building the grid."
          >
            <Button color="primary" type="button" onClick={onNavigateToImport}>
              Upload clothes
            </Button>
          </ClosetEmptyState>
        )}
      </ClosetPanel>
    </section>
  )
}
