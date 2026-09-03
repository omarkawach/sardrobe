import type { CreateItemResponse, WardrobeFormState, WardrobeItem } from './domain'

export async function fetchWardrobeItems() {
  const response = await fetch('/api/wardrobe/items')

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as { items: WardrobeItem[] }
  return payload.items
}

export async function persistWardrobeDraft({
  cutout,
  form,
}: {
  cutout: { file: File; width: number; height: number }
  form: WardrobeFormState
}) {
  const formData = new FormData()
  formData.set('cutout', cutout.file)
  formData.set('width', String(cutout.width))
  formData.set('height', String(cutout.height))

  for (const [key, value] of Object.entries(form)) {
    formData.set(key, value)
  }

  const response = await fetch('/api/wardrobe/items', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error || 'Could not save this item.')
  }

  return (await response.json()) as CreateItemResponse
}

export async function fetchWardrobeItem(itemId: string) {
  const response = await fetch(`/api/wardrobe/items/${itemId}`)

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error || 'Could not load this item.')
  }

  const payload = (await response.json()) as { item: WardrobeItem }
  return payload.item
}

export async function updateWardrobeItem(itemId: string, form: WardrobeFormState) {
  const response = await fetch(`/api/wardrobe/items/${itemId}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name: form.name,
      category: form.category,
      subcategory: form.subcategory,
      color: form.color,
      description: form.description,
      occasion: form.occasion,
      season: form.season,
      notes: form.notes,
    }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error || 'Could not save changes.')
  }

  const payload = (await response.json()) as { item: WardrobeItem }
  return payload.item
}

export async function deleteWardrobeItem(itemId: string) {
  const response = await fetch(`/api/wardrobe/items/${itemId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error || 'Could not delete this item.')
  }
}
