import {
  Button,
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from '@sardrobe/react-components'
import { ClosetIcon } from '../../components/closet/ClosetIcon'
import { WardrobeSelect } from '../../components/closet/FormControls'
import {
  closetFacetLabels,
  closetFacetOrder,
  closetGroupOptions,
  type ClosetFacetFilters,
  type ClosetFacetKey,
  type ClosetGroupBy,
} from './domain'

type FiltersDrawerProps = {
  activeFilterCount: number
  clearClosetFilters: () => void
  closetFacetFilters: ClosetFacetFilters
  closetFacetOptions: Record<ClosetFacetKey, { value: string; count: number }[]>
  closetGroupBy: ClosetGroupBy
  isMobileViewport: boolean
  mobileFiltersOpen: boolean
  setClosetFacet: (facet: ClosetFacetKey, value: string) => void
  setClosetGroupBy: (groupBy: ClosetGroupBy) => void
  setMobileFiltersOpen: (open: boolean) => void
}

export function FiltersDrawer({
  activeFilterCount,
  clearClosetFilters,
  closetFacetFilters,
  closetFacetOptions,
  closetGroupBy,
  isMobileViewport,
  mobileFiltersOpen,
  setClosetFacet,
  setClosetGroupBy,
  setMobileFiltersOpen,
}: FiltersDrawerProps) {
  return (
    <Drawer open={mobileFiltersOpen} modal onOpenChange={setMobileFiltersOpen}>
      <DrawerPortal>
        <DrawerBackdrop />
        <DrawerViewport>
          <DrawerPopup
            side={isMobileViewport ? 'bottom' : 'right'}
            className="closet-filters-drawer"
            id="wardrobe-filters-drawer"
          >
            <DrawerContent className="closet-filters-drawer__content" data-base-ui-swipe-ignore>
              <div className="closet-filters-drawer__top">
                <DrawerTitle className="closet-filters-drawer__title">Filters</DrawerTitle>
                <DrawerClose className="closet-filters-drawer__close" aria-label="Close filters">
                  <ClosetIcon name="close" />
                </DrawerClose>
              </div>

              <div className="closet-filters-drawer__fields">
                <div
                  className="closet-filters-drawer__organize"
                  role="group"
                  aria-labelledby="wardrobe-filter-organize-title"
                >
                  <p className="closet-filters-drawer__section-label" id="wardrobe-filter-organize-title">
                    Organize
                  </p>
                  <div className="closet-field">
                    <span>Group items by</span>
                    <WardrobeSelect
                      ariaLabel="Group items by"
                      value={closetGroupBy}
                      onValueChange={(next) => setClosetGroupBy((next || 'category') as ClosetGroupBy)}
                      placeholder="Group items by"
                      positionerClassName="closet-filters-drawer__select-positioner"
                      options={closetGroupOptions.map((option) => ({ value: option.value, label: option.label }))}
                    />
                  </div>
                </div>

                <div
                  className="closet-filters-drawer__filter-group"
                  role="group"
                  aria-labelledby="wardrobe-filter-facets-title"
                >
                  <p className="closet-filters-drawer__section-label" id="wardrobe-filter-facets-title">
                    Filter by
                  </p>
                  {closetFacetOrder.map((facet) => (
                    <div className="closet-field" key={facet}>
                      <span>{closetFacetLabels[facet]}</span>
                      <WardrobeSelect
                        ariaLabel={`Filter by ${closetFacetLabels[facet].toLowerCase()}`}
                        value={closetFacetFilters[facet][0] ?? ''}
                        onValueChange={(next) => setClosetFacet(facet, next)}
                        placeholder={`Any ${closetFacetLabels[facet].toLowerCase()}`}
                        positionerClassName="closet-filters-drawer__select-positioner"
                        options={[
                          { value: '', label: `Any ${closetFacetLabels[facet].toLowerCase()}` },
                          ...closetFacetOptions[facet].slice(0, 12).map((option) => ({
                            value: option.value,
                            label: `${option.value} (${option.count})`,
                          })),
                        ]}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="closet-filters-drawer__actions">
                <Button color="primary" type="button" onClick={() => setMobileFiltersOpen(false)}>
                  Done
                </Button>
                <Button
                  variant="outline"
                  color="neutral"
                  type="button"
                  onClick={clearClosetFilters}
                  disabled={activeFilterCount === 0}
                >
                  Clear filters
                </Button>
              </div>
            </DrawerContent>
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  )
}
