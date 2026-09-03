import type { WardrobeItem } from '../wardrobe/domain'

export type OutfitRole = 'top' | 'bottom' | 'outerwear' | 'shoes' | 'bag' | 'belt' | 'accessories'

export const SINGLE_SLOT_ROLES = ['top', 'bottom', 'outerwear', 'shoes', 'bag', 'belt'] as const
export type SingleSlotRole = (typeof SINGLE_SLOT_ROLES)[number]

export const ROLE_LABEL: Record<OutfitRole, string> = {
  top: 'Top',
  bottom: 'Bottom',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  bag: 'Bag',
  belt: 'Belt',
  accessories: 'Accessories',
}

const ROLE_Z_TIERS: Record<OutfitRole, number> = {
  bag: 0,
  bottom: 1,
  shoes: 2,
  top: 3,
  outerwear: 4,
  belt: 5,
  accessories: 6,
}

const TIER_SPAN = 100
export const SCALE_MIN = 0.25
export const SCALE_MAX = 4

function defaultZIndexForRole(role: OutfitRole): number {
  return ROLE_Z_TIERS[role] * TIER_SPAN
}

export function defaultZIndexForPlacement(role: OutfitRole, placement: PlacedItem[]): number {
  const base = defaultZIndexForRole(role)
  const used = new Set(placement.map((placed) => placed.zIndex))
  let next = base

  while (used.has(next)) {
    next += 1
  }

  return next
}

export function clampScale(value: number): number {
  if (!Number.isFinite(value)) return 1
  if (value < SCALE_MIN) return SCALE_MIN
  if (value > SCALE_MAX) return SCALE_MAX
  return value
}

export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export function clampUnitWithInset(value: number, inset: number): number {
  if (!Number.isFinite(value)) return 0.5

  const safeInset = Math.min(Math.max(inset, 0), 0.5)
  if (value < safeInset) return safeInset
  if (value > 1 - safeInset) return 1 - safeInset
  return value
}

export type OutfitMedia = {
  id: string
  url: string
  width: number | null
  height: number | null
}

export type OutfitItem = {
  id: string
  outfitItemId: string
  role: OutfitRole
  x: number | null
  y: number | null
  scale: number
  rotation: number
  zIndex: number
  name: string
  category: string
  subcategory: string | null
  color: string | null
  description: string | null
  occasion: string | null
  season: string | null
  status: string
  notes: string | null
  media: OutfitMedia | null
}

export type PlacedItem = {
  item: WardrobeItem
  role: OutfitRole
  x: number
  y: number
  scale: number
  rotation: number
  zIndex: number
}

export type Outfit = {
  id: string
  name: string
  category: string | null
  source: string | null
  description: string | null
  stylingFormula: string | null
  occasion: string | null
  season: string | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  items: OutfitItem[]
}

export type OutfitFormState = {
  name: string
  category: string
  source: string
  description: string
  stylingFormula: string
  occasion: string
  season: string
  notes: string
}

export const initialOutfitFormState: OutfitFormState = {
  name: 'New outfit',
  category: '',
  source: '',
  description: '',
  stylingFormula: '',
  occasion: '',
  season: '',
  notes: '',
}

export const emptyPlacement: PlacedItem[] = []

const LEGACY_SLOT_POSITIONS: Record<OutfitRole, { x: number; y: number }> = {
  outerwear: { x: 0.32, y: 0.4 },
  top: { x: 0.5, y: 0.4 },
  bottom: { x: 0.5, y: 0.62 },
  shoes: { x: 0.5, y: 0.85 },
  bag: { x: 0.72, y: 0.5 },
  belt: { x: 0.72, y: 0.7 },
  accessories: { x: 0.5, y: 0.15 },
}

export function legacyPositionFor(role: OutfitRole, accessoryIndex: number): { x: number; y: number } {
  if (role !== 'accessories') return LEGACY_SLOT_POSITIONS[role]
  const baseY = LEGACY_SLOT_POSITIONS.accessories.y
  const offsetX = ((accessoryIndex % 4) - 1.5) * 0.12
  return { x: clampUnit(0.5 + offsetX), y: baseY }
}

export type BuilderStep = 'compose' | 'describe'
export type BuilderMode = 'create' | 'edit'
export type BuilderSaveState = 'idle' | 'saving' | 'error'
export type GalleryState = 'loading' | 'idle' | 'error'
export type DeleteState = 'idle' | 'confirming' | 'deleting' | 'error'

export type PickerTab =
  | 'Tops'
  | 'Bottoms'
  | 'Outerwear'
  | 'Shoes'
  | 'Bags'
  | 'Accessories'
  | 'Dresses'
  | 'Skirts'
export const PICKER_TABS: { value: PickerTab; label: string }[] = [
  { value: 'Tops', label: 'Tops' },
  { value: 'Bottoms', label: 'Bottoms' },
  { value: 'Outerwear', label: 'Outerwear' },
  { value: 'Shoes', label: 'Shoes' },
  { value: 'Bags', label: 'Bags' },
  { value: 'Accessories', label: 'Accessories' },
  { value: 'Dresses', label: 'Dresses' },
  { value: 'Skirts', label: 'Skirts' },
]

export type CreateOutfitItemPayload = {
  itemId: string
  role: OutfitRole
  x: number
  y: number
  scale: number
  rotation: number
  zIndex: number
}

export type CreateOutfitPayload = {
  name: string
  category?: string | null
  source?: string | null
  description?: string | null
  stylingFormula?: string | null
  occasion?: string | null
  season?: string | null
  notes?: string | null
  items: CreateOutfitItemPayload[]
}

export function wardrobeCategoryToRole(item: WardrobeItem): OutfitRole {
  const category = (item.category ?? '').trim()
  const subcategory = (item.subcategory ?? '').trim().toLowerCase()

  if (category === 'Tops') return 'top'
  if (category === 'Outerwear') return 'outerwear'
  if (category === 'Bottoms' || category === 'Skirts' || category === 'Dresses') return 'bottom'
  if (category === 'Shoes') return 'shoes'
  if (category === 'Bags') return 'bag'
  if (category === 'Accessories') {
    if (subcategory === 'belt') return 'belt'
    return 'accessories'
  }
  return 'accessories'
}

export function emptyFormFromOutfit(outfit: Outfit): OutfitFormState {
  return {
    name: outfit.name,
    category: outfit.category ?? '',
    source: outfit.source ?? '',
    description: outfit.description ?? '',
    stylingFormula: outfit.stylingFormula ?? '',
    occasion: outfit.occasion ?? '',
    season: outfit.season ?? '',
    notes: outfit.notes ?? '',
  }
}

function outfitItemsToWardrobe(items: OutfitItem[]): WardrobeItem[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    color: item.color,
    description: item.description,
    occasion: item.occasion,
    season: item.season,
    status: item.status,
    notes: item.notes,
    createdAt: '',
    updatedAt: '',
    media: item.media,
  }))
}

export function outfitToPlacement(outfit: Outfit, wardrobe: WardrobeItem[]): PlacedItem[] {
  const wardrobeById = new Map(wardrobe.map((item) => [item.id, item]))
  const fallback = outfitItemsToWardrobe(outfit.items)
  const fallbackById = new Map(fallback.map((item) => [item.id, item]))
  const sorted = [...outfit.items].sort((a, b) => a.zIndex - b.zIndex)

  let accessoryIndex = 0
  const placement: PlacedItem[] = []

  for (const item of sorted) {
    const wardrobeItem = wardrobeById.get(item.id) ?? fallbackById.get(item.id)
    if (!wardrobeItem) continue

    const legacy = legacyPositionFor(item.role, accessoryIndex)
    if (item.role === 'accessories') accessoryIndex += 1

    placement.push({
      item: wardrobeItem,
      role: item.role,
      x: item.x === null ? legacy.x : clampUnit(item.x),
      y: item.y === null ? legacy.y : clampUnit(item.y),
      scale: clampScale(item.scale ?? 1),
      rotation: Number.isFinite(item.rotation) ? item.rotation : 0,
      zIndex: Number.isInteger(item.zIndex) ? item.zIndex : defaultZIndexForRole(item.role),
    })
  }

  return placement
}

export function placementToPayload(placement: PlacedItem[]): CreateOutfitItemPayload[] {
  return placement.map((placed) => ({
    itemId: placed.item.id,
    role: placed.role,
    x: clampUnit(placed.x),
    y: clampUnit(placed.y),
    scale: clampScale(placed.scale),
    rotation: placed.rotation,
    zIndex: placed.zIndex,
  }))
}

export function isItemPlaced(placement: PlacedItem[], itemId: string): boolean {
  return placement.some((placed) => placed.item.id === itemId)
}

export function findSingleSlotPlacementIndex(placement: PlacedItem[], role: SingleSlotRole): number {
  return placement.findIndex((placed) => placed.role === role)
}
