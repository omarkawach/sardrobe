import type { PackingPlan, PackingPlanCreateRows, PackingPlanFormState, PackingPlanSummary } from './domain'
import { derivedPackingStatus, packingPayloadFromForm } from './domain'

type ApiPlanResponse = { plan?: PackingPlan; error?: string }
type ApiPlansResponse = { plans?: PackingPlanSummary[]; error?: string }

export async function listPackingPlans(): Promise<PackingPlanSummary[] | { error: string }> {
  try {
    const response = await fetch('/api/packing-plans')
    const payload = (await response.json().catch(() => null)) as ApiPlansResponse | null

    if (!response.ok || !payload) {
      return { error: payload?.error ?? 'Could not load packing plans.' }
    }

    return payload.plans ?? []
  } catch {
    return { error: 'Network error while loading packing plans.' }
  }
}

export async function fetchPackingPlan(id: string): Promise<PackingPlan | { error: string }> {
  try {
    const response = await fetch(`/api/packing-plans/${id}`)
    const payload = (await response.json().catch(() => null)) as ApiPlanResponse | null

    if (!response.ok || !payload?.plan) {
      return { error: payload?.error ?? 'Could not load packing plan.' }
    }

    return payload.plan
  } catch {
    return { error: 'Network error while loading packing plan.' }
  }
}

export async function createPackingPlan(
  form: PackingPlanFormState,
  rows?: PackingPlanCreateRows,
): Promise<PackingPlan | { error: string }> {
  return writePackingPlan('/api/packing-plans', 'POST', form, rows)
}

export async function updatePackingPlan(id: string, form: PackingPlanFormState): Promise<PackingPlan | { error: string }> {
  return writePackingPlan(`/api/packing-plans/${id}`, 'PATCH', form)
}

export async function reconcilePackedStatus(plan: PackingPlan): Promise<PackingPlan | { error: string }> {
  const target = derivedPackingStatus(plan)
  if (!target) return plan
  return updatePackingPlan(plan.id, { plan: plan.plan, startDate: plan.startDate ?? '', endDate: plan.endDate ?? '', status: target, notes: plan.notes ?? '' })
}

async function writePackingPlan(
  url: string,
  method: 'POST' | 'PATCH',
  form: PackingPlanFormState,
  rows?: PackingPlanCreateRows,
) {
  try {
    const response = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(packingPayloadFromForm(form, rows)),
    })
    const payload = (await response.json().catch(() => null)) as ApiPlanResponse | null

    if (!response.ok || !payload?.plan) {
      return { error: payload?.error ?? 'Could not save packing plan.' }
    }

    return payload.plan
  } catch {
    return { error: 'Network error while saving packing plan.' }
  }
}

export async function deletePackingPlan(id: string): Promise<{ deleted: true } | { error: string }> {
  try {
    const response = await fetch(`/api/packing-plans/${id}`, { method: 'DELETE' })

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null
      return { error: payload?.error ?? 'Could not delete packing plan.' }
    }

    return { deleted: true }
  } catch {
    return { error: 'Network error while deleting packing plan.' }
  }
}

export async function addPackingOutfits(id: string, outfitIds: string[]): Promise<PackingPlan | { error: string }> {
  return writePackingRows(`/api/packing-plans/${id}/outfits`, { outfitIds })
}

export async function addPackingItems(id: string, itemIds: string[]): Promise<PackingPlan | { error: string }> {
  return writePackingRows(`/api/packing-plans/${id}/items`, { itemIds })
}

export async function togglePackingOutfit(id: string, rowId: string, packed: boolean) {
  return writePackingRows(`/api/packing-plans/${id}/outfits/${rowId}`, { packed }, 'PATCH')
}

export async function togglePackingItem(id: string, rowId: string, packed: boolean) {
  return writePackingRows(`/api/packing-plans/${id}/items/${rowId}`, { packed }, 'PATCH')
}

export async function removePackingOutfit(id: string, rowId: string) {
  return writePackingRows(`/api/packing-plans/${id}/outfits/${rowId}`, null, 'DELETE')
}

export async function removePackingItem(id: string, rowId: string) {
  return writePackingRows(`/api/packing-plans/${id}/items/${rowId}`, null, 'DELETE')
}

async function writePackingRows(url: string, body: unknown, method: 'POST' | 'PATCH' | 'DELETE' = 'POST') {
  try {
    const response = await fetch(url, {
      method,
      headers: body === null ? undefined : { 'content-type': 'application/json' },
      body: body === null ? undefined : JSON.stringify(body),
    })
    const payload = (await response.json().catch(() => null)) as ApiPlanResponse | null

    if (!response.ok || !payload?.plan) {
      return { error: payload?.error ?? 'Could not update packing plan.' }
    }

    return payload.plan
  } catch {
    return { error: 'Network error while updating packing plan.' }
  }
}
