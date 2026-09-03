export const OUTFIT_ROLES = [
  'top',
  'bottom',
  'outerwear',
  'shoes',
  'bag',
  'belt',
  'accessories',
] as const

export type OutfitRole = (typeof OUTFIT_ROLES)[number]

export const SINGLE_SLOT_OUTFIT_ROLES = new Set<OutfitRole>([
  'top',
  'bottom',
  'outerwear',
  'shoes',
  'bag',
  'belt',
])

export const ROLE_Z_TIERS: Record<OutfitRole, number> = {
  bag: 0,
  bottom: 1,
  shoes: 2,
  top: 3,
  outerwear: 4,
  belt: 5,
  accessories: 6,
}

export const TIER_SPAN = 100

export function defaultZIndexForRole(role: OutfitRole): number {
  return ROLE_Z_TIERS[role] * TIER_SPAN
}

export const OUTFIT_CANVAS_ASPECT_RATIO = 3 / 4

export const SCALE_MIN = 0.25
export const SCALE_MAX = 4

export function clampPosition(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export function clampScale(value: number): number {
  if (!Number.isFinite(value)) return 1
  if (value < SCALE_MIN) return SCALE_MIN
  if (value > SCALE_MAX) return SCALE_MAX
  return value
}

export function normalizeRotation(value: number): number {
  if (!Number.isFinite(value)) return 0
  const wrapped = ((value + 180) % 360 + 360) % 360 - 180
  return wrapped
}
