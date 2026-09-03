import type { CreateOutfitPayload, Outfit } from './domain'

export async function listOutfits(): Promise<Outfit[] | { error: string }> {
  try {
    const response = await fetch('/api/outfits')
    const payload = (await response.json().catch(() => null)) as { outfits?: Outfit[]; error?: string } | null

    if (!response.ok || !payload) {
      return { error: payload?.error ?? 'Could not load outfits.' }
    }

    return payload.outfits ?? []
  } catch {
    return { error: 'Network error while loading outfits.' }
  }
}

export async function createOutfit(payload: CreateOutfitPayload): Promise<Outfit | { error: string }> {
  try {
    const response = await fetch('/api/outfits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = (await response.json().catch(() => null)) as { outfit?: Outfit; error?: string } | null

    if (!response.ok || !data?.outfit) {
      return { error: data?.error ?? 'Could not save outfit.' }
    }

    return data.outfit
  } catch {
    return { error: 'Network error while saving outfit.' }
  }
}

export async function updateOutfit(id: string, payload: CreateOutfitPayload): Promise<Outfit | { error: string }> {
  try {
    const response = await fetch(`/api/outfits/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = (await response.json().catch(() => null)) as { outfit?: Outfit; error?: string } | null

    if (!response.ok || !data?.outfit) {
      return { error: data?.error ?? 'Could not save outfit.' }
    }

    return data.outfit
  } catch {
    return { error: 'Network error while saving outfit.' }
  }
}

export async function deleteOutfit(id: string): Promise<{ deleted: true } | { error: string }> {
  try {
    const response = await fetch(`/api/outfits/${id}`, { method: 'DELETE' })

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      return { error: data?.error ?? 'Could not delete outfit.' }
    }

    return { deleted: true }
  } catch {
    return { error: 'Network error while deleting outfit.' }
  }
}
