import { useMemo, useState } from 'react'
import {
  buildFacetOptions,
  closetFacetAll,
  closetFacetOrder,
  groupClosetItems,
  initialClosetFacetFilters,
  itemMatchesFacetFilters,
  itemMatchesSearch,
  type ClosetFacetFilters,
  type ClosetFacetKey,
  type ClosetGroupBy,
  type WardrobeItem,
} from './domain'

export function useClosetFilters(items: WardrobeItem[]) {
  const [searchQuery, setSearchQuery] = useState('')
  const [closetGroupBy, setClosetGroupBy] = useState<ClosetGroupBy>('category')
  const [closetFacetFilters, setClosetFacetFilters] = useState<ClosetFacetFilters>(initialClosetFacetFilters)

  const itemCountLabel = useMemo(() => `${items.length} saved ${items.length === 1 ? 'item' : 'items'}`, [items.length])
  const activeFacetCount = closetFacetOrder.reduce((total, facet) => total + closetFacetFilters[facet].length, 0)
  const hasSearchQuery = searchQuery.trim().length > 0
  const activeFilterCount = activeFacetCount + (hasSearchQuery ? 1 : 0)
  const filteredClosetItems = useMemo(
    () => items.filter((item) => itemMatchesFacetFilters(item, closetFacetFilters) && itemMatchesSearch(item, searchQuery)),
    [closetFacetFilters, items, searchQuery],
  )
  const closetGroups = useMemo(
    () => groupClosetItems(filteredClosetItems, closetGroupBy),
    [closetGroupBy, filteredClosetItems],
  )
  const closetFacetOptions = useMemo(
    () =>
      closetFacetAll.reduce(
        (result, facet) => ({
          ...result,
          [facet]: buildFacetOptions(items, facet),
        }),
        {} as Record<ClosetFacetKey, { value: string; count: number }[]>,
      ),
    [items],
  )
  const filteredItemCountLabel = `${filteredClosetItems.length} ${filteredClosetItems.length === 1 ? 'item' : 'items'} shown`
  const closetSummaryLabel =
    activeFilterCount === 0 ? itemCountLabel : `${filteredItemCountLabel} from ${itemCountLabel.replace(' saved', '')}`

  function setClosetFacet(facet: ClosetFacetKey, value: string) {
    setClosetFacetFilters((current) => ({
      ...current,
      [facet]: value ? [value] : [],
    }))
  }

  function clearClosetFilters() {
    setClosetFacetFilters(initialClosetFacetFilters)
    setSearchQuery('')
  }

  return {
    activeFilterCount,
    clearClosetFilters,
    closetFacetFilters,
    closetFacetOptions,
    closetGroupBy,
    closetGroups,
    closetSummaryLabel,
    items,
    searchQuery,
    setClosetFacet,
    setClosetGroupBy,
    setSearchQuery,
  }
}
