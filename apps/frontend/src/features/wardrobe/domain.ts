export type WardrobeItem = {
  id: string
  name: string
  category: string
  subcategory: string | null
  color: string | null
  description: string | null
  occasion: string | null
  season: string | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  media: {
    id: string
    url: string
    width: number | null
    height: number | null
  } | null
}

export type WardrobeFormState = {
  name: string
  category: string
  subcategory: string
  color: string
  description: string
  occasion: string
  season: string
  status: string
  notes: string
}

export type CutoutState = {
  file: File
  url: string
  width: number
  height: number
}

export type ImportDraftStatus = 'queued' | 'processing' | 'ready' | 'failed' | 'saving'
export type ImportFailureStage = 'processing' | 'saving'
export type ImportStatusTone = 'idle' | 'processing' | 'ready' | 'saving' | 'error'
export type DetailState = 'idle' | 'loading' | 'saving' | 'deleting' | 'error'
export type ImportDraftFilter = 'processing' | 'ready' | 'failed'
export type ImportMobileView = 'gallery' | 'review'
export type ClosetGroupBy = 'category' | 'subcategory' | 'season' | 'occasion' | 'color'
export type ClosetFacetKey = ClosetGroupBy
export type ClosetFacetFilters = Record<ClosetFacetKey, string[]>

export type ImportDraft = {
  id: string
  file: File
  fileName: string
  fileSize: number
  originalUrl: string | null
  cutout: CutoutState | null
  form: WardrobeFormState
  status: ImportDraftStatus
  progress: number
  failureStage: ImportFailureStage | null
  message: string
  error: string | null
}

export type ImportDraftCounts = {
  total: number
  processing: number
  ready: number
  failed: number
  saving: number
  complete: number
}

export type CreateItemResponse = {
  item: {
    id: string
    name: string
    category: string
    media?: {
      id: string
      url: string
    } | null
  }
}

// Hard cap on wardrobe items. Enforced authoritatively by the backend; the UI
// disables uploads at the cap. Mirrored by WARDROBE_ITEM_LIMIT in apps/backend/src/index.ts.
export const WARDROBE_ITEM_LIMIT = 500

export const categories = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Bags', 'Accessories', 'Dresses', 'Skirts']

export const COLORS = [
  'Black',
  'White',
  'Gray',
  'Beige',
  'Brown',
  'Navy',
  'Blue',
  'Green',
  'Yellow',
  'Orange',
  'Red',
  'Pink',
  'Purple',
  'Multicolor',
] as const

export const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const

export const OCCASIONS = [
  'Casual',
  'Work',
  'Formal',
  'Date Night',
  'Athletic',
  'Loungewear',
  'Vacation',
  'Special Event',
] as const

export const SUBCATEGORIES_BY_CATEGORY: Record<string, readonly string[]> = {
  Tops: ['T-shirt', 'Shirt', 'Blouse', 'Sweater', 'Cardigan', 'Hoodie', 'Tank top', 'Polo'],
  Bottoms: ['Jeans', 'Trousers', 'Shorts', 'Leggings'],
  Outerwear: ['Jacket', 'Coat', 'Blazer', 'Vest'],
  Shoes: ['Sneakers', 'Boots', 'Heels', 'Flats', 'Sandals'],
  Bags: ['Tote', 'Shoulder bag', 'Crossbody', 'Backpack', 'Clutch'],
  Accessories: ['Belt', 'Hat', 'Scarf', 'Jewelry', 'Sunglasses'],
  Dresses: ['Casual', 'Cocktail', 'Maxi', 'Mini'],
  Skirts: ['Mini', 'Midi', 'Maxi', 'Pencil', 'A-line'],
}

export const closetGroupOptions: { value: ClosetGroupBy; label: string }[] = [
  { value: 'category', label: 'Category' },
  { value: 'subcategory', label: 'Subcategory' },
  { value: 'season', label: 'Season' },
  { value: 'occasion', label: 'Occasion' },
  { value: 'color', label: 'Color' },
]

export const closetFacetLabels: Record<ClosetFacetKey, string> = {
  category: 'Category',
  subcategory: 'Subcategory',
  season: 'Season',
  occasion: 'Occasion',
  color: 'Color',
}

export const closetFacetOrder: ClosetFacetKey[] = ['category', 'subcategory', 'season', 'occasion', 'color']
export const closetFacetAll: ClosetFacetKey[] = ['category', 'subcategory', 'season', 'occasion', 'color']

export const initialClosetFacetFilters: ClosetFacetFilters = {
  category: [],
  subcategory: [],
  season: [],
  occasion: [],
  color: [],
}

const ungroupedLabel = 'Unspecified'
const itemDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
const fileSizeFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
})

export const initialFormState: WardrobeFormState = {
  name: '',
  category: categories[0],
  subcategory: '',
  color: '',
  description: '',
  occasion: '',
  season: '',
  status: 'owned',
  notes: '',
}

export function formFromItem(item: WardrobeItem): WardrobeFormState {
  return {
    name: item.name,
    category: item.category,
    subcategory: item.subcategory ?? '',
    color: item.color ?? '',
    description: item.description ?? '',
    occasion: item.occasion ?? '',
    season: item.season ?? '',
    status: item.status,
    notes: item.notes ?? '',
  }
}

export function formFromFile(file: File): WardrobeFormState {
  return {
    ...initialFormState,
    name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
  }
}

export function normalizeTextValue(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return ''

  return trimmed.replace(/\s+/g, ' ')
}

export function titleCase(value: string) {
  return value
    .split(/\s+/)
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(' ')
}

export function inferCategoryFromText(value: string) {
  const normalized = value.toLowerCase()

  if (/\b(dress|gown)\b/.test(normalized)) return 'Dresses'
  if (/\b(skirt)\b/.test(normalized)) return 'Skirts'
  if (/\b(shoes?|sneakers?|boots?|loafers?|heels?|sandals?|flats?|pumps?)\b/.test(normalized)) return 'Shoes'
  if (/\b(bag|tote|purse|clutch|backpack|crossbody)\b/.test(normalized)) return 'Bags'
  if (/\b(coat|jacket|blazer|trench|parka|vest|waistcoat)\b/.test(normalized)) return 'Outerwear'
  if (/\b(pants?|jeans?|trousers?|shorts|leggings?)\b/.test(normalized)) return 'Bottoms'
  if (/\b(belt|hat|scarf|jewelry|necklace|bracelet|ring|sunglasses|watch)\b/.test(normalized)) return 'Accessories'
  if (/\b(top|shirt|tee|t-shirt|blouse|sweater|tank|camisole|bodysuit|polo|hoodie)\b/.test(normalized)) return 'Tops'

  return ''
}

export function normalizeCategory(item: WardrobeItem) {
  const savedCategory = normalizeTextValue(item.category)
  const directCategory = categories.find((category) => category.toLowerCase() === savedCategory.toLowerCase())

  if (directCategory) return directCategory

  const categoryPrefix = savedCategory.split('/')[0]?.trim()
  const prefixCategory = categories.find((category) => category.toLowerCase() === categoryPrefix.toLowerCase())

  if (prefixCategory) return prefixCategory

  return (
    inferCategoryFromText([item.subcategory, item.name, item.description].filter(Boolean).join(' ')) ||
    savedCategory ||
    ungroupedLabel
  )
}

export function normalizeSubcategory(item: WardrobeItem) {
  const subcategory = normalizeTextValue(item.subcategory)

  if (subcategory) return titleCase(subcategory)

  const categoryParts = normalizeTextValue(item.category).split('/').map((part) => part.trim()).filter(Boolean)

  if (categoryParts.length > 1) return titleCase(categoryParts[1])

  return ungroupedLabel
}

export function splitFieldValues(value: string | null | undefined) {
  return normalizeTextValue(value)
    .split(/[,/|]+/)
    .map((part) => titleCase(part.trim()))
    .filter(Boolean)
}

export function csvToArray(value: string): string[] {
  return value.split(',').map((v) => v.trim()).filter(Boolean)
}

export function arrayToCsv(values: string[]): string {
  return values.map((v) => v.trim()).filter(Boolean).join(',')
}

export function itemValuesForFacet(item: WardrobeItem, facet: ClosetFacetKey) {
  if (facet === 'category') return [normalizeCategory(item)]

  return splitFieldValues(item[facet])
}

export function itemGroupValues(item: WardrobeItem, groupBy: ClosetGroupBy) {
  if (groupBy === 'subcategory') return [normalizeSubcategory(item)]
  if (groupBy === 'category') return [normalizeCategory(item)]

  const values = splitFieldValues(item[groupBy])
  return values.length > 0 ? values : [ungroupedLabel]
}

export function buildFacetOptions(items: WardrobeItem[], facet: ClosetFacetKey) {
  const counts = new Map<string, number>()

  for (const item of items) {
    for (const value of itemValuesForFacet(item, facet)) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  }

  return Array.from(counts, ([value, count]) => ({ value, count })).sort((first, second) => {
    if (second.count !== first.count) return second.count - first.count
    return first.value.localeCompare(second.value)
  })
}

export function itemMatchesFacetFilters(item: WardrobeItem, filters: ClosetFacetFilters) {
  return closetFacetOrder.every((facet) => {
    const selected = filters[facet]
    if (selected.length === 0) return true

    const values = itemValuesForFacet(item, facet)
    return selected.some((value) => values.includes(value))
  })
}

export function itemMatchesSearch(item: WardrobeItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) return true

  return [
    item.name,
    item.category,
    item.subcategory,
    item.color,
    item.description,
    item.occasion,
    item.season,
    item.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery)
}

export function groupClosetItems(items: WardrobeItem[], groupBy: ClosetGroupBy) {
  const groups = new Map<string, WardrobeItem[]>()

  for (const item of items) {
    for (const value of itemGroupValues(item, groupBy)) {
      const label = value || ungroupedLabel
      groups.set(label, [...(groups.get(label) ?? []), item])
    }
  }

  return Array.from(groups, ([label, groupItems]) => ({ label, items: groupItems })).sort((first, second) => {
    if (first.label === ungroupedLabel) return 1
    if (second.label === ungroupedLabel) return -1
    if (second.items.length !== first.items.length) return second.items.length - first.items.length
    return first.label.localeCompare(second.label)
  })
}

export function formatItemDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return itemDateFormatter.format(date)
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${fileSizeFormatter.format(bytes / 1024)} KB`
  }

  return `${fileSizeFormatter.format(bytes / (1024 * 1024))} MB`
}
