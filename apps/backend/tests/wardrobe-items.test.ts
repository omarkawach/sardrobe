import { env } from 'cloudflare:workers'
import { beforeEach, describe, expect, it } from 'vitest'
import { createBackendApp, type AuthenticatedUser, type BackendBindings } from '../src/index'

type ApiItem = {
  id: string
  name: string
  category: string
  subcategory: string | null
  color: string | null
  description: string | null
  occasion: string | null
  season: string | null
  notes: string | null
  media: {
    id: string
    url: string
    width?: number | null
    height?: number | null
  } | null
}

type OutfitRole = 'top' | 'bottom' | 'outerwear' | 'shoes' | 'bag' | 'belt' | 'accessories'

type ApiOutfit = {
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
  items: Array<
    ApiItem & {
      outfitItemId: string
      role: OutfitRole
      x: number | null
      y: number | null
      scale: number
      rotation: number
      zIndex: number
      status: string
      createdAt?: string
      updatedAt?: string
    }
  >
}

type ApiPackingPlanSummary = {
  id: string
  plan: string
  startDate: string | null
  endDate: string | null
  status: 'planning' | 'packed'
  notes: string | null
  totalCount: number
  packedCount: number
  outfitCount: number
  itemCount: number
}

type ApiPackingPlan = ApiPackingPlanSummary & {
  outfits: Array<{
    id: string
    packedAt: string | null
    outfit: ApiOutfit
  }>
  items: Array<{
    id: string
    packedAt: string | null
    item: ApiItem
  }>
}

const userA: AuthenticatedUser = {
  id: 'user-a',
  name: 'A User',
  email: 'a@example.com',
  image: null,
  emailVerified: true,
}

const userB: AuthenticatedUser = {
  id: 'user-b',
  name: 'B User',
  email: 'b@example.com',
  image: null,
  emailVerified: true,
}

let activeUser: AuthenticatedUser | null = null

const allowAllWrites = {
  limit: async () => ({ success: true }),
}

const app = createBackendApp({
  resolveUser: async () => activeUser,
  writeRateLimiter: allowAllWrites,
})

function testEnv() {
  return env as BackendBindings
}

function appRequest(path: string, init?: RequestInit) {
  return app.fetch(new Request(`http://sardrobe.test${path}`, init), testEnv())
}

const validWebpBase64 = new Map([
  ['40x50', 'UklGRiAAAABXRUJQVlA4TBMAAAAvJ0AMEAcQEREAEsL/82pE/1McAA=='],
  ['24x36', 'UklGRhoAAABXRUJQVlA4TA0AAAAvF8AIEAcQERGIiP4HAA=='],
])

function malformedWebpBytes(width: number, height: number) {
  const wm1 = width - 1
  const hm1 = height - 1
  const b0 = wm1 & 0xff
  const b1 = ((wm1 >> 8) & 0x3f) | ((hm1 & 0x03) << 6)
  const b2 = (hm1 >> 2) & 0xff
  const b3 = (hm1 >> 10) & 0x0f
  const chunkData = new Uint8Array([0x2f, b0, b1, b2, b3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  const bytes = new Uint8Array(20 + chunkData.length)
  const view = new DataView(bytes.buffer)
  const writeAscii = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      bytes[offset + index] = text.charCodeAt(index)
    }
  }

  writeAscii(0, 'RIFF')
  view.setUint32(4, 4 + 8 + chunkData.length, true)
  writeAscii(8, 'WEBP')
  writeAscii(12, 'VP8L')
  view.setUint32(16, chunkData.length, true)
  bytes.set(chunkData, 20)

  return bytes
}

function webpFile(width = 40, height = 50, name = 'cutout.webp') {
  const base64 = validWebpBase64.get(`${width}x${height}`)

  if (!base64) {
    throw new Error(`Missing WebP fixture for ${width}x${height}`)
  }

  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
  return new File([bytes], name, { type: 'image/webp' })
}

function itemForm(overrides: Record<string, string | File | undefined> = {}) {
  const form = new FormData()
  form.set('cutout', webpFile())
  form.set('width', '40')
  form.set('height', '50')
  form.set('name', 'Blue shirt')
  form.set('category', 'Tops')
  form.set('color', 'blue')
  form.set('notes', 'Washed and ready')

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      form.delete(key)
    } else {
      form.set(key, value)
    }
  }

  return form
}

async function seedUsers() {
  const bindings = testEnv()
  const now = Date.now()

  await bindings.DB.batch([
    bindings.DB.prepare(
      'INSERT INTO user (id, name, email, email_verified, image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(userA.id, userA.name, userA.email, 1, null, now, now),
    bindings.DB.prepare(
      'INSERT INTO user (id, name, email, email_verified, image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(userB.id, userB.name, userB.email, 1, null, now, now),
  ])
}

async function createItem(user: AuthenticatedUser, overrides: Record<string, string | File | undefined> = {}) {
  activeUser = user

  const response = await appRequest('/api/wardrobe/items', {
    method: 'POST',
    body: itemForm(overrides),
  })

  expect(response.status).toBe(201)

  const payload = (await response.json()) as { item: ApiItem }
  return payload.item
}

async function getItem(itemId: string) {
  const response = await appRequest(`/api/wardrobe/items/${itemId}`)

  expect(response.status).toBe(200)

  const payload = (await response.json()) as { item: ApiItem }
  return payload.item
}

async function createOutfit(
  user: AuthenticatedUser,
  body: {
    name?: string
    category?: string | null
    source?: string | null
    description?: string | null
    stylingFormula?: string | null
    occasion?: string | null
    season?: string | null
    notes?: string | null
    items: Array<{ itemId: string; role: OutfitRole; zIndex?: number }>
  },
) {
  activeUser = user

  const response = await appRequest('/api/outfits', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  return response
}

async function updateOutfit(
  user: AuthenticatedUser,
  outfitId: string,
  body: {
    name?: string
    category?: string | null
    source?: string | null
    description?: string | null
    stylingFormula?: string | null
    occasion?: string | null
    season?: string | null
    notes?: string | null
    items: Array<{ itemId: string; role: OutfitRole; zIndex?: number }>
  },
) {
  activeUser = user

  const response = await appRequest(`/api/outfits/${outfitId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

  return response
}

async function createPackingPlan(
  user: AuthenticatedUser,
  body: {
    plan?: string
    startDate?: string | null
    endDate?: string | null
    status?: 'planning' | 'packed' | string | null
    notes?: string | null
    outfitIds?: string[] | string | null
    itemIds?: string[] | string | null
  },
) {
  activeUser = user

  return appRequest('/api/packing-plans', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function updatePackingPlan(
  user: AuthenticatedUser,
  planId: string,
  body: {
    plan?: string
    startDate?: string | null
    endDate?: string | null
    status?: 'planning' | 'packed' | string | null
    notes?: string | null
  },
) {
  activeUser = user

  return appRequest(`/api/packing-plans/${planId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function addPackingOutfits(user: AuthenticatedUser, planId: string, outfitIds: string[]) {
  activeUser = user

  return appRequest(`/api/packing-plans/${planId}/outfits`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ outfitIds }),
  })
}

async function addPackingItems(user: AuthenticatedUser, planId: string, itemIds: string[]) {
  activeUser = user

  return appRequest(`/api/packing-plans/${planId}/items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ itemIds }),
  })
}

async function togglePackingRow(
  user: AuthenticatedUser,
  planId: string,
  kind: 'outfits' | 'items',
  rowId: string,
  packed: boolean,
) {
  activeUser = user

  return appRequest(`/api/packing-plans/${planId}/${kind}/${rowId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ packed }),
  })
}

async function removePackingRow(user: AuthenticatedUser, planId: string, kind: 'outfits' | 'items', rowId: string) {
  activeUser = user

  return appRequest(`/api/packing-plans/${planId}/${kind}/${rowId}`, { method: 'DELETE' })
}

async function tableCount(table: string, where = '1 = 1') {
  const result = await testEnv().DB.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE ${where}`).first<{ count: number }>()
  return result?.count ?? 0
}

async function seedItemRows(user: AuthenticatedUser, count: number) {
  const bindings = testEnv()
  const now = Date.now()
  const statements = Array.from({ length: count }, (_, index) =>
    bindings.DB.prepare(
      'INSERT INTO wardrobe_items (id, user_id, name, category, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(`${user.id}-seed-${index}`, user.id, `Seed ${index}`, 'Tops', 'owned', now, now),
  )

  await bindings.DB.batch(statements)
}

beforeEach(async () => {
  activeUser = null
  await seedUsers()
})

describe('wardrobe item API authentication', () => {
  it('reports anonymous sessions without an unauthorized response', async () => {
    const response = await appRequest('/api/me')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ authenticated: false })
  })

  it('rejects unauthenticated closet item requests', async () => {
    activeUser = null

    const responses = await Promise.all([
      appRequest('/api/wardrobe/items'),
      appRequest('/api/wardrobe/items/not-real'),
      appRequest('/api/wardrobe/items', { method: 'POST', body: itemForm() }),
      appRequest('/api/outfits/not-real'),
      appRequest('/api/outfits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Test', items: [] }),
      }),
      appRequest('/api/outfits/not-real', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Test', items: [] }),
      }),
      appRequest('/api/outfits/not-real', { method: 'DELETE' }),
      appRequest('/api/packing-plans'),
      appRequest('/api/packing-plans/not-real'),
      appRequest('/api/packing-plans', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: 'Paris' }),
      }),
      appRequest('/api/packing-plans/not-real', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: 'Paris' }),
      }),
      appRequest('/api/packing-plans/not-real', { method: 'DELETE' }),
      appRequest('/api/packing-plans/not-real/outfits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ outfitIds: ['outfit-a'] }),
      }),
      appRequest('/api/packing-plans/not-real/items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemIds: ['item-a'] }),
      }),
      appRequest('/api/packing-plans/not-real/outfits/row-a', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ packed: true }),
      }),
      appRequest('/api/packing-plans/not-real/items/row-a', { method: 'DELETE' }),
      appRequest('/api/wardrobe/items/not-real', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      }),
      appRequest('/api/wardrobe/items/not-real', { method: 'DELETE' }),
    ])

    expect(responses.map((response) => response.status)).toEqual([
      401,
      401,
      401,
      401,
      401,
      401,
      401,
      401,
      401,
      401,
      401,
      401,
      401,
      401,
      401,
      401,
      401,
      401,
    ])
  })
})

describe('outfit API CRUD and validation', () => {
  it('creates an outfit with owned items and returns deterministic layer data for canvas rendering', async () => {
    const top = await createItem(userA, { name: 'Cream blouse', category: 'Tops', color: 'cream' })
    const bottom = await createItem(userA, { name: 'Black trousers', category: 'Bottoms', color: 'black' })
    const bag = await createItem(userA, { name: 'Tan bag', category: 'Bags', color: 'tan' })
    const sunglasses = await createItem(userA, { name: 'Cat-eye sunglasses', category: 'Accessories' })
    const scarf = await createItem(userA, { name: 'Printed scarf', category: 'Accessories' })

    const response = await createOutfit(userA, {
      name: '  Chic City Stroll  ',
      category: 'Day look',
      source: 'Mockup inspiration',
      description: 'Neutral city outfit',
      stylingFormula: 'outer layer + column base',
      occasion: 'Casual',
      season: 'Fall',
      notes: 'Keep polished but easy',
      items: [
        { itemId: top.id, role: 'top' },
        { itemId: bottom.id, role: 'bottom' },
        { itemId: bag.id, role: 'bag' },
        { itemId: sunglasses.id, role: 'accessories' },
        { itemId: scarf.id, role: 'accessories' },
      ],
    })

    const payload = (await response.json()) as { outfit: ApiOutfit }

    expect(response.status).toBe(201)
    expect(payload.outfit).toMatchObject({
      name: 'Chic City Stroll',
      category: 'Day look',
      source: 'Mockup inspiration',
      description: 'Neutral city outfit',
      stylingFormula: 'outer layer + column base',
      occasion: 'Casual',
      season: 'Fall',
      status: 'draft',
      notes: 'Keep polished but easy',
    })
    expect(payload.outfit.items).toHaveLength(5)
    expect(payload.outfit.items.map((item) => ({ role: item.role, zIndex: item.zIndex }))).toEqual([
      { role: 'bag', zIndex: 0 },
      { role: 'bottom', zIndex: 100 },
      { role: 'top', zIndex: 300 },
      { role: 'accessories', zIndex: 600 },
      { role: 'accessories', zIndex: 601 },
    ])
    expect(payload.outfit.items.find((item) => item.id === top.id)?.media?.url).toBe(`/api/wardrobe/media/${top.media?.id}`)
    expect(await tableCount('outfits')).toBe(1)
    expect(await tableCount('outfit_items')).toBe(5)
  })

  it('returns outfit detail to the owner and 404 to another user', async () => {
    const top = await createItem(userA, { name: 'Private blouse', category: 'Tops' })
    const outfitResponse = await createOutfit(userA, {
      name: 'Private look',
      items: [{ itemId: top.id, role: 'top' }],
    })
    const outfitPayload = (await outfitResponse.json()) as { outfit: ApiOutfit }

    activeUser = userA
    const ownerResponse = await appRequest(`/api/outfits/${outfitPayload.outfit.id}`)
    const ownerPayload = (await ownerResponse.json()) as { outfit: ApiOutfit }

    expect(ownerResponse.status).toBe(200)
    expect(ownerPayload.outfit.name).toBe('Private look')
    expect(ownerPayload.outfit.items[0]?.id).toBe(top.id)

    activeUser = userB
    const otherResponse = await appRequest(`/api/outfits/${outfitPayload.outfit.id}`)

    expect(otherResponse.status).toBe(404)
  })

  it('updates an existing outfit in place', async () => {
    const top = await createItem(userA, { name: 'Soft knit', category: 'Tops' })
    const bottom = await createItem(userA, { name: 'Wide trousers', category: 'Bottoms' })
    const bag = await createItem(userA, { name: 'Everyday bag', category: 'Bags' })

    const createResponse = await createOutfit(userA, {
      name: 'Weekend look',
      category: 'Casual',
      items: [
        { itemId: top.id, role: 'top' },
        { itemId: bottom.id, role: 'bottom' },
      ],
    })
    const createPayload = (await createResponse.json()) as { outfit: ApiOutfit }

    const updateResponse = await updateOutfit(userA, createPayload.outfit.id, {
      name: 'Updated weekend look',
      category: 'City look',
      source: 'Saved edit',
      stylingFormula: 'top + bottom + bag',
      items: [
        { itemId: top.id, role: 'top' },
        { itemId: bottom.id, role: 'bottom' },
        { itemId: bag.id, role: 'bag' },
      ],
    })
    const updatePayload = (await updateResponse.json()) as { outfit: ApiOutfit }

    expect(updateResponse.status).toBe(200)
    expect(updatePayload.outfit.id).toBe(createPayload.outfit.id)
    expect(updatePayload.outfit.name).toBe('Updated weekend look')
    expect(updatePayload.outfit.category).toBe('City look')
    expect(updatePayload.outfit.items.map((item) => item.role)).toEqual(['bag', 'bottom', 'top'])
    expect(await tableCount('outfits')).toBe(1)
    expect(await tableCount('outfit_items')).toBe(3)

    const emptyUpdateResponse = await updateOutfit(userA, createPayload.outfit.id, {
      name: 'Empty weekend look',
      items: [],
    })

    expect(emptyUpdateResponse.status).toBe(400)

    const detailResponse = await appRequest(`/api/outfits/${createPayload.outfit.id}`)
    const detailPayload = (await detailResponse.json()) as { outfit: ApiOutfit }

    expect(detailResponse.status).toBe(200)
    expect(detailPayload.outfit.name).toBe('Updated weekend look')
    expect(detailPayload.outfit.items).toHaveLength(3)
    expect(await tableCount('outfits')).toBe(1)
    expect(await tableCount('outfit_items')).toBe(3)
  })

  it('lists only the signed-in user outfits', async () => {
    const userATop = await createItem(userA, { name: 'User A top', category: 'Tops' })
    const userBTop = await createItem(userB, { name: 'User B top', category: 'Tops' })

    await createOutfit(userA, {
      name: 'User A look',
      items: [{ itemId: userATop.id, role: 'top' }],
    })
    await createOutfit(userB, {
      name: 'User B look',
      items: [{ itemId: userBTop.id, role: 'top' }],
    })

    activeUser = userA
    const response = await appRequest('/api/outfits')
    const payload = (await response.json()) as { outfits: ApiOutfit[] }

    expect(response.status).toBe(200)
    expect(payload.outfits).toHaveLength(1)
    expect(payload.outfits[0]?.name).toBe('User A look')
  })

  it('deletes only the owner outfit and membership rows', async () => {
    const top = await createItem(userA, { name: 'Owner top', category: 'Tops' })
    const bag = await createItem(userA, { name: 'Owner bag', category: 'Bags' })

    const createResponse = await createOutfit(userA, {
      name: 'Delete this look',
      items: [
        { itemId: top.id, role: 'top' },
        { itemId: bag.id, role: 'bag' },
      ],
    })
    const createPayload = (await createResponse.json()) as { outfit: ApiOutfit }

    activeUser = userB
    const otherUserDelete = await appRequest(`/api/outfits/${createPayload.outfit.id}`, { method: 'DELETE' })

    expect(otherUserDelete.status).toBe(404)
    expect(await tableCount('outfits')).toBe(1)
    expect(await tableCount('outfit_items')).toBe(2)

    activeUser = userA
    const ownerDelete = await appRequest(`/api/outfits/${createPayload.outfit.id}`, { method: 'DELETE' })
    const deletePayload = (await ownerDelete.json()) as { deleted: boolean }

    expect(ownerDelete.status).toBe(200)
    expect(deletePayload.deleted).toBe(true)
    expect(await tableCount('outfits')).toBe(0)
    expect(await tableCount('outfit_items')).toBe(0)

    const deletedDetail = await appRequest(`/api/outfits/${createPayload.outfit.id}`)
    expect(deletedDetail.status).toBe(404)
  })

  it('rejects invalid outfit create payloads and keeps the batch atomic', async () => {
    const top = await createItem(userA, { category: 'Tops' })
    const otherUserItem = await createItem(userB, { category: 'Shoes' })
    activeUser = userA

    const missingName = await createOutfit(userA, {
      items: [{ itemId: top.id, role: 'top' }],
    })
    const emptyItems = await createOutfit(userA, {
      name: 'Empty look',
      items: [],
    })
    const crossUserItem = await createOutfit(userA, {
      name: 'Stolen look',
      items: [{ itemId: otherUserItem.id, role: 'shoes' }],
    })
    const duplicateItem = await createOutfit(userA, {
      name: 'Duplicate item look',
      items: [
        { itemId: top.id, role: 'top' },
        { itemId: top.id, role: 'accessories' },
      ],
    })
    const duplicateMainRole = await createOutfit(userA, {
      name: 'Too many tops',
      items: [
        { itemId: top.id, role: 'top' },
        { itemId: (await createItem(userA, { name: 'Second top', category: 'Tops' })).id, role: 'top' },
      ],
    })

    expect(missingName.status).toBe(400)
    expect(emptyItems.status).toBe(400)
    expect(crossUserItem.status).toBe(400)
    expect(duplicateItem.status).toBe(400)
    expect(duplicateMainRole.status).toBe(400)
    expect(await tableCount('outfits')).toBe(0)
    expect(await tableCount('outfit_items')).toBe(0)
  })

  it('keeps saved outfits when a referenced wardrobe item is deleted', async () => {
    const top = await createItem(userA, { name: 'Delete me top', category: 'Tops' })
    const shoes = await createItem(userA, { name: 'Keep me shoes', category: 'Shoes' })

    const createResponse = await createOutfit(userA, {
      name: 'Look that survives item deletion',
      items: [
        { itemId: top.id, role: 'top' },
        { itemId: shoes.id, role: 'shoes' },
      ],
    })
    const createPayload = (await createResponse.json()) as { outfit: ApiOutfit }

    activeUser = userA
    const deleteResponse = await appRequest(`/api/wardrobe/items/${top.id}`, { method: 'DELETE' })

    expect(deleteResponse.status).toBe(200)
    expect(await tableCount('outfits')).toBe(1)
    expect(await tableCount('outfit_items')).toBe(1)

    const detailResponse = await appRequest(`/api/outfits/${createPayload.outfit.id}`)
    const detailPayload = (await detailResponse.json()) as { outfit: ApiOutfit }

    expect(detailResponse.status).toBe(200)
    expect(detailPayload.outfit.items).toHaveLength(1)
    expect(detailPayload.outfit.items[0]?.id).toBe(shoes.id)
    expect(detailPayload.outfit.name).toBe('Look that survives item deletion')
  })
})

describe('packing plan API CRUD and checklist rows', () => {
  it('creates a packing plan with only a Plan value and lists only the owner plans', async () => {
    const createResponse = await createPackingPlan(userA, { plan: '  Paris  ' })
    const createPayload = (await createResponse.json()) as { plan: ApiPackingPlan }

    expect(createResponse.status).toBe(201)
    expect(createPayload.plan).toMatchObject({
      plan: 'Paris',
      startDate: null,
      endDate: null,
      status: 'planning',
      notes: null,
      totalCount: 0,
      packedCount: 0,
    })

    await createPackingPlan(userB, { plan: 'Weekend bag' })

    activeUser = userA
    const listResponse = await appRequest('/api/packing-plans')
    const listPayload = (await listResponse.json()) as { plans: ApiPackingPlanSummary[] }

    expect(listResponse.status).toBe(200)
    expect(listPayload.plans).toHaveLength(1)
    expect(listPayload.plans[0]?.id).toBe(createPayload.plan.id)

    activeUser = userB
    const otherUserDetail = await appRequest(`/api/packing-plans/${createPayload.plan.id}`)

    expect(otherUserDetail.status).toBe(404)
  })

  it('creates a packing plan with initial outfits and wardrobe items', async () => {
    const top = await createItem(userA, { name: 'Initial tee', category: 'Tops' })
    const shoes = await createItem(userA, { name: 'Initial sneakers', category: 'Shoes' })
    const outfitResponse = await createOutfit(userA, {
      name: 'Initial travel outfit',
      items: [
        { itemId: top.id, role: 'top' },
        { itemId: shoes.id, role: 'shoes' },
      ],
    })
    const outfitPayload = (await outfitResponse.json()) as { outfit: ApiOutfit }

    const createResponse = await createPackingPlan(userA, {
      plan: 'First-pass checklist',
      outfitIds: [outfitPayload.outfit.id],
      itemIds: [shoes.id],
    })
    const createPayload = (await createResponse.json()) as { plan: ApiPackingPlan }

    expect(createResponse.status).toBe(201)
    expect(createPayload.plan).toMatchObject({
      plan: 'First-pass checklist',
      outfitCount: 1,
      itemCount: 1,
      totalCount: 2,
      packedCount: 0,
    })
    expect(createPayload.plan.outfits[0]?.outfit.name).toBe('Initial travel outfit')
    expect(createPayload.plan.items[0]?.item.id).toBe(shoes.id)
    expect(createPayload.plan.outfits[0]?.packedAt).toBeNull()
    expect(createPayload.plan.items[0]?.packedAt).toBeNull()

    activeUser = userA
    const listResponse = await appRequest('/api/packing-plans')
    const listPayload = (await listResponse.json()) as { plans: ApiPackingPlanSummary[] }

    expect(listResponse.status).toBe(200)
    expect(listPayload.plans[0]).toMatchObject({
      id: createPayload.plan.id,
      outfitCount: 1,
      itemCount: 1,
      totalCount: 2,
    })
  })

  it('validates packing plan fields and supports manual packed status', async () => {
    const top = await createItem(userA, { name: 'Validation tee', category: 'Tops' })
    const otherUserItem = await createItem(userB, { name: 'Validation scarf', category: 'Accessories' })
    const otherOutfitResponse = await createOutfit(userB, {
      name: 'Validation look',
      items: [{ itemId: otherUserItem.id, role: 'accessories' }],
    })
    const otherOutfitPayload = (await otherOutfitResponse.json()) as { outfit: ApiOutfit }
    const blankPlan = await createPackingPlan(userA, { plan: ' ' })
    const invalidStartDate = await createPackingPlan(userA, { plan: 'Trip', startDate: '2026-02-31' })
    const backwardsRange = await createPackingPlan(userA, {
      plan: 'Trip',
      startDate: '2026-06-04',
      endDate: '2026-06-01',
    })
    const invalidStatus = await createPackingPlan(userA, { plan: 'Trip', status: 'archived' })
    const duplicateInitialItems = await createPackingPlan(userA, { plan: 'Trip', itemIds: [top.id, top.id] })
    const crossUserInitialItem = await createPackingPlan(userA, { plan: 'Trip', itemIds: [otherUserItem.id] })
    const crossUserInitialOutfit = await createPackingPlan(userA, {
      plan: 'Trip',
      outfitIds: [otherOutfitPayload.outfit.id],
    })

    expect(blankPlan.status).toBe(400)
    expect(invalidStartDate.status).toBe(400)
    expect(backwardsRange.status).toBe(400)
    expect(invalidStatus.status).toBe(400)
    expect(duplicateInitialItems.status).toBe(409)
    expect(crossUserInitialItem.status).toBe(400)
    expect(crossUserInitialOutfit.status).toBe(400)
    expect(await tableCount('packing_plans')).toBe(0)

    const createResponse = await createPackingPlan(userA, {
      plan: 'Wedding weekend',
      startDate: '2026-07-10',
      endDate: '2026-07-12',
      notes: 'Pack garment bag',
    })
    const createPayload = (await createResponse.json()) as { plan: ApiPackingPlan }

    const updateResponse = await updatePackingPlan(userA, createPayload.plan.id, {
      status: 'packed',
      notes: '',
    })
    const updatePayload = (await updateResponse.json()) as { plan: ApiPackingPlan }

    expect(updateResponse.status).toBe(200)
    expect(updatePayload.plan.status).toBe('packed')
    expect(updatePayload.plan.notes).toBeNull()

    const invalidPatch = await updatePackingPlan(userA, createPayload.plan.id, {
      startDate: '2026-07-20',
      endDate: '2026-07-12',
    })

    expect(invalidPatch.status).toBe(400)

    const longNotes = 'n'.repeat(2000)
    const longNotesPatch = await updatePackingPlan(userA, createPayload.plan.id, {
      notes: longNotes,
    })
    const longNotesPayload = (await longNotesPatch.json()) as { plan: ApiPackingPlan }

    expect(longNotesPatch.status).toBe(200)
    expect(longNotesPayload.plan.notes).toBe(longNotes)

    const tooLongNotesPatch = await updatePackingPlan(userA, createPayload.plan.id, {
      notes: `${longNotes}n`,
    })

    expect(tooLongNotesPatch.status).toBe(400)
  })

  it('adds outfits and wardrobe items, toggles packed rows, and keeps parent status manual', async () => {
    const top = await createItem(userA, { name: 'Travel tee', category: 'Tops' })
    const shoes = await createItem(userA, { name: 'Walking shoes', category: 'Shoes' })
    const otherUserItem = await createItem(userB, { name: 'Other user scarf', category: 'Accessories' })
    const outfitResponse = await createOutfit(userA, {
      name: 'Airport look',
      items: [
        { itemId: top.id, role: 'top' },
        { itemId: shoes.id, role: 'shoes' },
      ],
    })
    const outfitPayload = (await outfitResponse.json()) as { outfit: ApiOutfit }
    const otherOutfitResponse = await createOutfit(userB, {
      name: 'Other user look',
      items: [{ itemId: otherUserItem.id, role: 'accessories' }],
    })
    const otherOutfitPayload = (await otherOutfitResponse.json()) as { outfit: ApiOutfit }
    const planResponse = await createPackingPlan(userA, { plan: 'Carry-on' })
    const planPayload = (await planResponse.json()) as { plan: ApiPackingPlan }

    const crossUserOutfit = await addPackingOutfits(userA, planPayload.plan.id, [otherOutfitPayload.outfit.id])
    const crossUserItem = await addPackingItems(userA, planPayload.plan.id, [otherUserItem.id])

    expect(crossUserOutfit.status).toBe(400)
    expect(crossUserItem.status).toBe(400)

    const addOutfit = await addPackingOutfits(userA, planPayload.plan.id, [outfitPayload.outfit.id])
    const addOutfitPayload = (await addOutfit.json()) as { plan: ApiPackingPlan }
    const addItem = await addPackingItems(userA, planPayload.plan.id, [shoes.id])
    const addItemPayload = (await addItem.json()) as { plan: ApiPackingPlan }

    expect(addOutfit.status).toBe(200)
    expect(addOutfitPayload.plan.outfits[0]?.outfit.name).toBe('Airport look')
    expect(addItem.status).toBe(200)
    expect(addItemPayload.plan).toMatchObject({
      status: 'planning',
      outfitCount: 1,
      itemCount: 1,
      totalCount: 2,
      packedCount: 0,
    })

    const duplicateOutfit = await addPackingOutfits(userA, planPayload.plan.id, [outfitPayload.outfit.id])
    const duplicateItem = await addPackingItems(userA, planPayload.plan.id, [shoes.id])

    expect(duplicateOutfit.status).toBe(409)
    expect(duplicateItem.status).toBe(409)

    const outfitRowId = addItemPayload.plan.outfits[0]!.id
    const itemRowId = addItemPayload.plan.items[0]!.id
    const otherUserToggle = await togglePackingRow(userB, planPayload.plan.id, 'outfits', outfitRowId, true)

    expect(otherUserToggle.status).toBe(404)

    const toggleOutfit = await togglePackingRow(userA, planPayload.plan.id, 'outfits', outfitRowId, true)
    const toggleOutfitPayload = (await toggleOutfit.json()) as { plan: ApiPackingPlan }

    expect(toggleOutfit.status).toBe(200)
    expect(toggleOutfitPayload.plan.status).toBe('planning')
    expect(toggleOutfitPayload.plan.packedCount).toBe(1)
    expect(toggleOutfitPayload.plan.outfits[0]?.packedAt).not.toBeNull()

    const removeItem = await removePackingRow(userA, planPayload.plan.id, 'items', itemRowId)
    const removeItemPayload = (await removeItem.json()) as { plan: ApiPackingPlan }

    expect(removeItem.status).toBe(200)
    expect(removeItemPayload.plan.itemCount).toBe(0)
    expect(await tableCount('packing_plan_items')).toBe(0)
  })

  it('deletes packing plans and cascades only packing checklist rows', async () => {
    const top = await createItem(userA, { name: 'Delete plan tee', category: 'Tops' })
    const outfitResponse = await createOutfit(userA, {
      name: 'Delete plan outfit',
      items: [{ itemId: top.id, role: 'top' }],
    })
    const outfitPayload = (await outfitResponse.json()) as { outfit: ApiOutfit }
    const planResponse = await createPackingPlan(userA, { plan: 'Old list' })
    const planPayload = (await planResponse.json()) as { plan: ApiPackingPlan }

    await addPackingOutfits(userA, planPayload.plan.id, [outfitPayload.outfit.id])
    await addPackingItems(userA, planPayload.plan.id, [top.id])

    expect(await tableCount('packing_plans')).toBe(1)
    expect(await tableCount('packing_plan_outfits')).toBe(1)
    expect(await tableCount('packing_plan_items')).toBe(1)

    activeUser = userB
    const otherDelete = await appRequest(`/api/packing-plans/${planPayload.plan.id}`, { method: 'DELETE' })

    expect(otherDelete.status).toBe(404)

    activeUser = userA
    const deleteResponse = await appRequest(`/api/packing-plans/${planPayload.plan.id}`, { method: 'DELETE' })
    const deletePayload = (await deleteResponse.json()) as { deleted: boolean }

    expect(deleteResponse.status).toBe(200)
    expect(deletePayload.deleted).toBe(true)
    expect(await tableCount('packing_plans')).toBe(0)
    expect(await tableCount('packing_plan_outfits')).toBe(0)
    expect(await tableCount('packing_plan_items')).toBe(0)
    expect(await tableCount('outfits')).toBe(1)
    expect(await tableCount('wardrobe_items')).toBe(1)
  })

  it('keeps packing plans when referenced outfits or wardrobe items are deleted', async () => {
    const top = await createItem(userA, { name: 'Packed top', category: 'Tops' })
    const shoes = await createItem(userA, { name: 'Packed shoes', category: 'Shoes' })
    const outfitResponse = await createOutfit(userA, {
      name: 'Packing survivor look',
      items: [
        { itemId: top.id, role: 'top' },
        { itemId: shoes.id, role: 'shoes' },
      ],
    })
    const outfitPayload = (await outfitResponse.json()) as { outfit: ApiOutfit }
    const planResponse = await createPackingPlan(userA, { plan: 'Survivor plan' })
    const planPayload = (await planResponse.json()) as { plan: ApiPackingPlan }

    await addPackingOutfits(userA, planPayload.plan.id, [outfitPayload.outfit.id])
    await addPackingItems(userA, planPayload.plan.id, [top.id])

    activeUser = userA
    const deleteItem = await appRequest(`/api/wardrobe/items/${top.id}`, { method: 'DELETE' })

    expect(deleteItem.status).toBe(200)
    expect(await tableCount('packing_plans')).toBe(1)
    expect(await tableCount('packing_plan_items')).toBe(0)
    expect(await tableCount('packing_plan_outfits')).toBe(1)

    const detailAfterItemDelete = await appRequest(`/api/packing-plans/${planPayload.plan.id}`)
    const detailAfterItemDeletePayload = (await detailAfterItemDelete.json()) as { plan: ApiPackingPlan }

    expect(detailAfterItemDelete.status).toBe(200)
    expect(detailAfterItemDeletePayload.plan.items).toHaveLength(0)
    expect(detailAfterItemDeletePayload.plan.outfits).toHaveLength(1)
    expect(detailAfterItemDeletePayload.plan.outfits[0]?.outfit.items.map((item) => item.id)).toEqual([shoes.id])

    const deleteOutfit = await appRequest(`/api/outfits/${outfitPayload.outfit.id}`, { method: 'DELETE' })

    expect(deleteOutfit.status).toBe(200)
    expect(await tableCount('packing_plans')).toBe(1)
    expect(await tableCount('packing_plan_outfits')).toBe(0)

    const detailAfterOutfitDelete = await appRequest(`/api/packing-plans/${planPayload.plan.id}`)
    const detailAfterOutfitDeletePayload = (await detailAfterOutfitDelete.json()) as { plan: ApiPackingPlan }

    expect(detailAfterOutfitDelete.status).toBe(200)
    expect(detailAfterOutfitDeletePayload.plan.totalCount).toBe(0)
  })
})

describe('wardrobe item API CRUD', () => {
  it('creates an item with a WebP cutout and lists only the signed-in user items', async () => {
    const userAItem = await createItem(userA, { name: 'User A shirt', color: 'blue' })
    const userBItem = await createItem(userB, { name: 'User B jacket', color: 'black', category: 'Outerwear' })

    activeUser = userA
    const response = await appRequest('/api/wardrobe/items')
    const payload = (await response.json()) as { items: ApiItem[] }

    expect(response.status).toBe(200)
    expect(payload.items).toHaveLength(1)
    expect(payload.items[0]?.id).toBe(userAItem.id)
    expect(payload.items[0]?.name).toBe('User A shirt')
    expect(payload.items[0]?.media?.url).toBe(`/api/wardrobe/media/${userAItem.media?.id}`)

    activeUser = userB
    const otherResponse = await appRequest('/api/wardrobe/items')
    const otherPayload = (await otherResponse.json()) as { items: ApiItem[] }

    expect(otherPayload.items).toHaveLength(1)
    expect(otherPayload.items[0]?.id).toBe(userBItem.id)
  })

  it('returns detail for the owner and 404 for another user', async () => {
    const item = await createItem(userA, { name: 'Private shirt' })

    activeUser = userA
    const ownerItem = await getItem(item.id)

    expect(ownerItem.name).toBe('Private shirt')
    expect(ownerItem.media?.width).toBe(40)
    expect(ownerItem.media?.height).toBe(50)

    activeUser = userB
    const response = await appRequest(`/api/wardrobe/items/${item.id}`)

    expect(response.status).toBe(404)
  })

  it('patches editable fields and trims empty optional fields to null', async () => {
    const item = await createItem(userA, { color: 'blue', notes: 'Keep' })
    activeUser = userA

    const response = await appRequest(`/api/wardrobe/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: '  Black shirt  ',
        category: '  Tops  ',
        color: ' ',
        description: '  Simple tee  ',
        occasion: '',
        season: 'winter',
        notes: null,
      }),
    })

    const payload = (await response.json()) as { item: ApiItem }

    expect(response.status).toBe(200)
    expect(payload.item).toMatchObject({
      name: 'Black shirt',
      category: 'Tops',
      color: null,
      description: 'Simple tee',
      occasion: null,
      season: 'winter',
      notes: null,
    })
  })

  it('rejects patch requests with invalid JSON, blank required fields, or non-string fields', async () => {
    const item = await createItem(userA)
    activeUser = userA

    const invalidJson = await appRequest(`/api/wardrobe/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    })
    const blankName = await appRequest(`/api/wardrobe/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: ' ' }),
    })
    const nonStringColor = await appRequest(`/api/wardrobe/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ color: 123 }),
    })

    expect(invalidJson.status).toBe(400)
    expect(blankName.status).toBe(400)
    expect(nonStringColor.status).toBe(400)
  })

  it('keeps cross-user patch and delete attempts isolated', async () => {
    const item = await createItem(userA)
    activeUser = userB

    const patchResponse = await appRequest(`/api/wardrobe/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Stolen shirt' }),
    })
    const deleteResponse = await appRequest(`/api/wardrobe/items/${item.id}`, { method: 'DELETE' })

    expect(patchResponse.status).toBe(404)
    expect(deleteResponse.status).toBe(404)

    activeUser = userA
    const ownerItem = await getItem(item.id)
    expect(ownerItem.name).toBe('Blue shirt')
  })

  it('deletes the D1 item, media row, and saved R2 cutout', async () => {
    const item = await createItem(userA)
    const objectKey = `users/${userA.id}/items/${item.id}/cutout.webp`

    expect(await testEnv().WARDROBE_MEDIA.get(objectKey)).not.toBeNull()
    expect(await tableCount('wardrobe_items')).toBe(1)
    expect(await tableCount('wardrobe_item_media')).toBe(1)

    activeUser = userA
    const response = await appRequest(`/api/wardrobe/items/${item.id}`, { method: 'DELETE' })
    const payload = (await response.json()) as { deleted: boolean }

    expect(response.status).toBe(200)
    expect(payload.deleted).toBe(true)
    expect(await testEnv().WARDROBE_MEDIA.get(objectKey)).toBeNull()
    expect(await tableCount('wardrobe_items')).toBe(0)
    expect(await tableCount('wardrobe_item_media')).toBe(0)
  })
})

describe('wardrobe item API validation and media access', () => {
  it('rejects invalid item create payloads', async () => {
    activeUser = userA

    const oversizedBytes = new Uint8Array(8 * 1024 * 1024 + 1)
    const oversizedFile = new File([oversizedBytes], 'large.webp', { type: 'image/webp' })

    const missingCutout = itemForm({ cutout: undefined })
    const nonWebpCutout = itemForm({
      cutout: new File([new Uint8Array([1, 2, 3])], 'cutout.png', { type: 'image/png' }),
    })
    const oversizedCutout = itemForm({ cutout: oversizedFile })
    const missingName = itemForm({ name: undefined })
    const missingCategory = itemForm({ category: '   ' })

    const responses = await Promise.all([
      appRequest('/api/wardrobe/items', { method: 'POST', body: missingCutout }),
      appRequest('/api/wardrobe/items', { method: 'POST', body: nonWebpCutout }),
      appRequest('/api/wardrobe/items', { method: 'POST', body: oversizedCutout }),
      appRequest('/api/wardrobe/items', { method: 'POST', body: missingName }),
      appRequest('/api/wardrobe/items', { method: 'POST', body: missingCategory }),
    ])

    expect(responses.map((response) => response.status)).toEqual([400, 400, 400, 400, 400])
    expect(await tableCount('wardrobe_items')).toBe(0)
    expect(await tableCount('wardrobe_item_media')).toBe(0)
  })

  it('rejects creating an item once the per-user limit is reached and keeps users isolated', async () => {
    await seedItemRows(userA, 500)
    expect(await tableCount('wardrobe_items', `user_id = '${userA.id}'`)).toBe(500)

    activeUser = userA
    const overLimit = await appRequest('/api/wardrobe/items', { method: 'POST', body: itemForm() })
    const overLimitPayload = (await overLimit.json()) as { error: string }

    expect(overLimit.status).toBe(409)
    expect(overLimitPayload.error).toContain('Wardrobe is full')
    // No D1 row or R2 object should be created for the rejected request.
    expect(await tableCount('wardrobe_items', `user_id = '${userA.id}'`)).toBe(500)
    expect(await tableCount('wardrobe_item_media', `user_id = '${userA.id}'`)).toBe(0)

    // A different user under the limit is unaffected.
    const userBItem = await createItem(userB, { name: 'Still allowed' })
    expect(userBItem.name).toBe('Still allowed')
  })

  it('serves media only to the item owner', async () => {
    const item = await createItem(userA)

    activeUser = userA
    const ownerResponse = await appRequest(`/api/wardrobe/media/${item.media?.id}`)

    expect(ownerResponse.status).toBe(200)
    expect(ownerResponse.headers.get('content-type')).toContain('image/webp')

    activeUser = userB
    const otherUserResponse = await appRequest(`/api/wardrobe/media/${item.media?.id}`)

    expect(otherUserResponse.status).toBe(404)
  })
})

describe('Phase 8 security hardening', () => {
  it('fully decodes WebP uploads and ignores form-supplied dimensions (M2)', async () => {
    activeUser = userA

    const fakeWebp = itemForm({
      cutout: new File([new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05])], 'fake.webp', {
        type: 'image/webp',
      }),
    })

    const rejected = await appRequest('/api/wardrobe/items', { method: 'POST', body: fakeWebp })

    expect(rejected.status).toBe(400)
    expect(await tableCount('wardrobe_items')).toBe(0)
    expect(await tableCount('wardrobe_item_media')).toBe(0)

    const malformedWebp = itemForm({
      cutout: new File([malformedWebpBytes(24, 36)], 'malformed.webp', {
        type: 'image/webp',
      }),
    })
    const malformedResponse = await appRequest('/api/wardrobe/items', {
      method: 'POST',
      body: malformedWebp,
    })

    expect(malformedResponse.status).toBe(400)
    expect(await tableCount('wardrobe_items')).toBe(0)
    expect(await tableCount('wardrobe_item_media')).toBe(0)

    const honestBytes = itemForm({
      cutout: webpFile(24, 36),
      width: '999',
      height: '999',
    })

    const created = await appRequest('/api/wardrobe/items', { method: 'POST', body: honestBytes })
    expect(created.status).toBe(201)

    const { item } = (await created.json()) as { item: ApiItem }
    const stored = await getItem(item.id)

    expect(stored.media?.width).toBe(24)
    expect(stored.media?.height).toBe(36)
  })

  it('rejects free-text fields over the length cap (L2)', async () => {
    activeUser = userA

    const overLongName = itemForm({ name: 'x'.repeat(201) })
    const overLongNotes = itemForm({ notes: 'y'.repeat(2001) })
    const acceptableNotes = itemForm({ notes: 'z'.repeat(2000) })

    const nameResponse = await appRequest('/api/wardrobe/items', { method: 'POST', body: overLongName })
    const notesResponse = await appRequest('/api/wardrobe/items', { method: 'POST', body: overLongNotes })

    expect(nameResponse.status).toBe(400)
    expect(notesResponse.status).toBe(400)
    expect(await tableCount('wardrobe_items')).toBe(0)

    const okResponse = await appRequest('/api/wardrobe/items', { method: 'POST', body: acceptableNotes })
    expect(okResponse.status).toBe(201)
  })

  it('rejects an over-length patch field (L2)', async () => {
    const item = await createItem(userA)

    activeUser = userA
    const response = await appRequest(`/api/wardrobe/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ description: 'd'.repeat(2001) }),
    })

    expect(response.status).toBe(400)
  })

  it('shares the write rate limit across app instances (H2)', async () => {
    let rateLimitedUser: AuthenticatedUser | null = userA
    const hits = new Map<string, number>()
    const sharedLimiter = {
      limit: async ({ key }: { key: string }) => {
        const count = (hits.get(key) ?? 0) + 1
        hits.set(key, count)
        return { success: count <= 3 }
      },
    }
    const limitedAppA = createBackendApp({
      resolveUser: async () => rateLimitedUser,
      writeRateLimiter: sharedLimiter,
    })
    const limitedAppB = createBackendApp({
      resolveUser: async () => rateLimitedUser,
      writeRateLimiter: sharedLimiter,
    })

    const post = (limitedApp: ReturnType<typeof createBackendApp>) =>
      limitedApp.fetch(
        new Request('http://sardrobe.test/api/wardrobe/items', { method: 'POST', body: itemForm() }),
        testEnv(),
      )

    const statuses = [
      (await post(limitedAppA)).status,
      (await post(limitedAppB)).status,
      (await post(limitedAppA)).status,
      (await post(limitedAppB)).status,
    ]

    expect(statuses.slice(0, 3).every((status) => status === 201)).toBe(true)
    expect(statuses[3]).toBe(429)
    expect(hits.get(`user:${userA.id}`)).toBe(4)

    rateLimitedUser = null
  })

  it('does not rate-limit read requests (H2)', async () => {
    const limitedApp = createBackendApp({
      resolveUser: async () => userA,
      writeRateLimiter: {
        limit: async () => ({ success: false }),
      },
    })

    const get = () =>
      limitedApp.fetch(new Request('http://sardrobe.test/api/wardrobe/items'), testEnv())

    const first = await get()
    const second = await get()

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
  })

  it('sets baseline security headers on responses (H3)', async () => {
    activeUser = userA
    const response = await appRequest('/api/wardrobe/items')

    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    expect(response.headers.get('strict-transport-security')).toContain('max-age=')
  })

  it('returns a generic 404 from the not-found handler (M3)', async () => {
    activeUser = userA
    const response = await appRequest('/api/does-not-exist')

    expect(response.status).toBe(404)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toBe('Not found')
  })
})
