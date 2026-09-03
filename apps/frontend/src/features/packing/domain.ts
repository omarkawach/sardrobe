import type { Outfit } from '../outfits/domain'
import type { WardrobeItem } from '../wardrobe/domain'

export type PackingPlanStatus = 'planning' | 'packed'

export type PackingPlanSummary = {
  id: string
  plan: string
  startDate: string | null
  endDate: string | null
  status: PackingPlanStatus
  notes: string | null
  createdAt: string
  updatedAt: string
  totalCount: number
  packedCount: number
  outfitCount: number
  itemCount: number
}

export type PackingPlanOutfit = {
  id: string
  packedAt: string | null
  createdAt: string
  outfit: Outfit
}

export type PackingPlanItem = {
  id: string
  packedAt: string | null
  createdAt: string
  item: WardrobeItem
}

export type PackingPlan = PackingPlanSummary & {
  outfits: PackingPlanOutfit[]
  items: PackingPlanItem[]
}

export type PackingPlanFormState = {
  plan: string
  startDate: string
  endDate: string
  status: PackingPlanStatus
  notes: string
}

export type PackingPlanCreateRows = {
  outfitIds: string[]
  itemIds: string[]
}

export type PackingGalleryState = 'loading' | 'idle' | 'error'
export type PackingDetailState = 'idle' | 'loading' | 'saving' | 'deleting' | 'error'
export type PackingMobileView = 'plans' | 'checklist'
export type PackingAddMode = 'outfits' | 'items'

export const initialPackingPlanForm: PackingPlanFormState = {
  plan: '',
  startDate: '',
  endDate: '',
  status: 'planning',
  notes: '',
}

export const PACKING_STATUS_OPTIONS: { value: PackingPlanStatus; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'packed', label: 'Packed' },
]

export function derivedPackingStatus(plan: Pick<PackingPlan, 'status' | 'totalCount' | 'packedCount'>): PackingPlanStatus | null {
  const target: PackingPlanStatus = plan.totalCount > 0 && plan.packedCount === plan.totalCount ? 'packed' : 'planning'
  return target === plan.status ? null : target
}

export function formFromPackingPlan(plan: PackingPlan): PackingPlanFormState {
  return {
    plan: plan.plan,
    startDate: plan.startDate ?? '',
    endDate: plan.endDate ?? '',
    status: plan.status,
    notes: plan.notes ?? '',
  }
}

export function packingPayloadFromForm(form: PackingPlanFormState, rows?: PackingPlanCreateRows) {
  const payload: {
    plan: string
    startDate: string | null
    endDate: string | null
    status: PackingPlanStatus
    notes: string | null
    outfitIds?: string[]
    itemIds?: string[]
  } = {
    plan: form.plan.trim(),
    startDate: form.startDate.trim() || null,
    endDate: form.endDate.trim() || null,
    status: form.status,
    notes: form.notes.trim() || null,
  }

  if (rows?.outfitIds.length) payload.outfitIds = rows.outfitIds
  if (rows?.itemIds.length) payload.itemIds = rows.itemIds

  return payload
}

export function packingSummaryFromPlan(plan: PackingPlan): PackingPlanSummary {
  return {
    id: plan.id,
    plan: plan.plan,
    startDate: plan.startDate,
    endDate: plan.endDate,
    status: plan.status,
    notes: plan.notes,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    totalCount: plan.totalCount,
    packedCount: plan.packedCount,
    outfitCount: plan.outfitCount,
    itemCount: plan.itemCount,
  }
}

export function formatPackingDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return 'No dates'
  if (startDate && endDate) return `${formatPackingDate(startDate)} to ${formatPackingDate(endDate)}`
  if (startDate) return `Starts ${formatPackingDate(startDate)}`
  return `Ends ${formatPackingDate(endDate)}`
}

function formatPackingDate(value: string | null) {
  if (!value) return ''
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10))
  const date = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date)
}
