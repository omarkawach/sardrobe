import {
  account,
  clampPosition,
  clampScale,
  defaultZIndexForRole,
  getAuth,
  getDb,
  initDatabase,
  normalizeRotation,
  outfitItems,
  outfits,
  packingPlanItems,
  packingPlanOutfits,
  packingPlans,
  wardrobeItemMedia,
  wardrobeItems,
} from '@sardrobe/data-ops'
import * as Sentry from '@sentry/cloudflare'
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { secureHeaders } from 'hono/secure-headers'
import { auditEvent, sentryOptions } from './observability'

type BackendEnv = { Bindings: Env }

export type BackendBindings = Env

type RouteContext = {
  env: BackendBindings
  req: { raw: Request }
}

export type AuthenticatedUser = {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  emailVerified?: boolean | null
}

type WriteRateLimiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

export type BackendAppOptions = {
  resolveUser?: (c: RouteContext) => Promise<AuthenticatedUser | null>
  writeRateLimiter?: WriteRateLimiter
}

const MAX_CUTOUT_BYTES = 8 * 1024 * 1024

const MAX_SHORT_TEXT = 200
const MAX_LONG_TEXT = 2000

// Hard cap on wardrobe items per user. Mirrors WARDROBE_ITEM_LIMIT in
// apps/frontend/src/features/wardrobe/domain.ts — keep both in sync.
const WARDROBE_ITEM_LIMIT = 500

type WardrobeItemRow = {
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
  createdAt: Date
  updatedAt: Date
  mediaId: string | null
  width: number | null
  height: number | null
}

type OutfitRole = 'top' | 'bottom' | 'outerwear' | 'shoes' | 'bag' | 'belt' | 'accessories'

type OutfitRow = {
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
  createdAt: Date
  updatedAt: Date
}

type OutfitItemRow = {
  outfitItemId: string
  itemId: string
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
  mediaId: string | null
  width: number | null
  height: number | null
}

type PackingPlanStatus = 'planning' | 'packed'

type PackingPlanRow = {
  id: string
  plan: string
  startDate: string | null
  endDate: string | null
  status: PackingPlanStatus
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

type PackingPlanOutfitRow = {
  rowId: string
  packedAt: Date | null
  rowCreatedAt: Date
  outfitId: string
  name: string
  category: string | null
  source: string | null
  description: string | null
  stylingFormula: string | null
  occasion: string | null
  season: string | null
  status: string
  notes: string | null
  outfitCreatedAt: Date
  outfitUpdatedAt: Date
}

type PackingPlanItemRow = {
  rowId: string
  packedAt: Date | null
  rowCreatedAt: Date
  itemId: string
  name: string
  category: string
  subcategory: string | null
  color: string | null
  description: string | null
  occasion: string | null
  season: string | null
  status: string
  notes: string | null
  itemCreatedAt: Date
  itemUpdatedAt: Date
  mediaId: string | null
  width: number | null
  height: number | null
}

const outfitRoles = ['top', 'bottom', 'outerwear', 'shoes', 'bag', 'belt', 'accessories'] as const
const singleSlotOutfitRoles = new Set<OutfitRole>(['top', 'bottom', 'outerwear', 'shoes', 'bag', 'belt'])
const packingPlanStatuses = ['planning', 'packed'] as const

async function getSession(c: RouteContext) {
  const auth = await getAuth(c.env, { baseURL: getPublicOrigin(c.req.raw, c.env.BETTER_AUTH_URL) })

  return auth.api.getSession({
    headers: c.req.raw.headers,
  })
}

function getPublicOrigin(request: Request, fallback = 'http://localhost:4321') {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')

  if (forwardedHost && (forwardedProto === 'http' || forwardedProto === 'https')) {
    return `${forwardedProto}://${forwardedHost}`
  }

  return fallback
}

async function requireUser(c: RouteContext) {
  const resolved = await getSession(c)

  if (!resolved?.session || !resolved.user) {
    return null
  }

  return resolved.user
}

async function revokeGoogleGrant(tokens: { refreshToken?: string | null; accessToken?: string | null }) {
  const token = tokens.refreshToken ?? tokens.accessToken

  if (!token) {
    return { revoked: false, reason: 'no-token' as const }
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }),
    })

    // Google returns 200 on success and 400 for an already-invalid token. Both
    // mean the grant is gone, so neither should fail the deletion.
    if (!response.ok && response.status !== 400) {
      console.error('Google OAuth revoke returned an unexpected status', response.status)
      return { revoked: false, reason: 'http-error' as const, status: response.status }
    }

    return { revoked: true }
  } catch (error) {
    console.error('Google OAuth revoke request failed', error)
    return { revoked: false, reason: 'network-error' as const }
  }
}

// Delete every object under the user's media prefix. R2 list() is paginated, so
// we loop on the cursor until the listing is no longer truncated. Not covered by
// any D1 cascade — the bucket would otherwise keep orphaned cutouts forever.
export async function deleteUserMedia(bucket: R2Bucket, userId: string, pageSize = 1000) {
  const prefix = `users/${userId}/`
  let cursor: string | undefined
  let deletedCount = 0

  do {
    const listing = await bucket.list({ prefix, cursor, limit: pageSize })
    const keys = listing.objects.map((object) => object.key)

    if (keys.length > 0) {
      await bucket.delete(keys)
      deletedCount += keys.length
    }

    cursor = listing.truncated ? listing.cursor : undefined
  } while (cursor)

  return deletedCount
}

type WebpDimensions = { width: number; height: number }
type DecodedWebp = WebpDimensions & { buffer: ArrayBuffer }

function parseWebp(bytes: Uint8Array): WebpDimensions | null {
  if (bytes.length < 30) return null

  const fourCC = (offset: number) =>
    String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3])

  if (fourCC(0) !== 'RIFF' || fourCC(8) !== 'WEBP') return null

  const chunk = fourCC(12)
  const u16 = (offset: number) => bytes[offset] | (bytes[offset + 1] << 8)

  if (chunk === 'VP8 ') {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null
    const width = u16(26) & 0x3fff
    const height = u16(28) & 0x3fff
    return width > 0 && height > 0 ? { width, height } : null
  }

  if (chunk === 'VP8L') {
    if (bytes[20] !== 0x2f) return null
    const b0 = bytes[21]
    const b1 = bytes[22]
    const b2 = bytes[23]
    const b3 = bytes[24]
    const width = 1 + (((b1 & 0x3f) << 8) | b0)
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
    return { width, height }
  }

  if (chunk === 'VP8X') {
    const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16))
    const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16))
    return { width, height }
  }

  return null
}

async function decodeWebp(images: ImagesBinding, buffer: ArrayBuffer): Promise<DecodedWebp | null> {
  const blob = new Blob([buffer], { type: 'image/webp' })

  try {
    const info = await images.info(blob.stream())

    if (info.format !== 'image/webp' || !('width' in info) || info.width <= 0 || info.height <= 0) {
      return null
    }

    const result = await images
      .input(blob.stream())
      .transform({
        width: info.width,
        height: info.height,
        fit: 'contain',
      })
      .output({
        format: 'image/webp',
        quality: 100,
        anim: false,
      })
    const response = result.response()

    if (!response.ok) {
      return null
    }

    const decodedBuffer = await response.arrayBuffer()

    if (decodedBuffer.byteLength <= 0 || decodedBuffer.byteLength > MAX_CUTOUT_BYTES) {
      return null
    }

    const decodedInfo = await images.info(
      new Blob([decodedBuffer], { type: 'image/webp' }).stream(),
    )

    if (
      decodedInfo.format !== 'image/webp' ||
      !('width' in decodedInfo) ||
      decodedInfo.width !== info.width ||
      decodedInfo.height !== info.height
    ) {
      return null
    }

    return { buffer: decodedBuffer, width: decodedInfo.width, height: decodedInfo.height }
  } catch {
    return null
  }
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function readFormText(
  formData: FormData,
  key: string,
  label: string,
  maxLength = MAX_SHORT_TEXT,
): { value: string | null } | { error: string } {
  const value = getFormString(formData, key)

  if (value === null) {
    return { value: null }
  }

  if (value.length > maxLength) {
    return { error: `${label} must be ${maxLength} characters or fewer.` }
  }

  return { value }
}

function serializeWardrobeItem(item: WardrobeItemRow) {
  return {
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
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    media: item.mediaId
      ? {
          id: item.mediaId,
          url: `/api/wardrobe/media/${item.mediaId}`,
          width: item.width,
          height: item.height,
        }
      : null,
  }
}

function serializeOutfitItem(item: OutfitItemRow) {
  return {
    id: item.itemId,
    outfitItemId: item.outfitItemId,
    role: item.role,
    x: item.x,
    y: item.y,
    scale: item.scale,
    rotation: item.rotation,
    zIndex: item.zIndex,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    color: item.color,
    description: item.description,
    occasion: item.occasion,
    season: item.season,
    status: item.status,
    notes: item.notes,
    media: item.mediaId
      ? {
          id: item.mediaId,
          url: `/api/wardrobe/media/${item.mediaId}`,
          width: item.width,
          height: item.height,
        }
      : null,
  }
}

function serializeOutfit(outfit: OutfitRow, items: OutfitItemRow[]) {
  return {
    id: outfit.id,
    name: outfit.name,
    category: outfit.category,
    source: outfit.source,
    description: outfit.description,
    stylingFormula: outfit.stylingFormula,
    occasion: outfit.occasion,
    season: outfit.season,
    status: outfit.status,
    notes: outfit.notes,
    createdAt: outfit.createdAt,
    updatedAt: outfit.updatedAt,
    items: items.map(serializeOutfitItem),
  }
}

function serializePackingPlanCounts(outfits: { packedAt: Date | null }[], items: { packedAt: Date | null }[]) {
  const outfitCount = outfits.length
  const itemCount = items.length

  return {
    outfitCount,
    itemCount,
    totalCount: outfitCount + itemCount,
    packedCount:
      outfits.filter((row) => row.packedAt !== null).length +
      items.filter((row) => row.packedAt !== null).length,
  }
}

function serializePackingPlanSummary(
  plan: PackingPlanRow,
  outfits: { packedAt: Date | null }[],
  items: { packedAt: Date | null }[],
) {
  return {
    id: plan.id,
    plan: plan.plan,
    startDate: plan.startDate,
    endDate: plan.endDate,
    status: plan.status,
    notes: plan.notes,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    ...serializePackingPlanCounts(outfits, items),
  }
}

function serializePackingPlanOutfit(row: PackingPlanOutfitRow, items: OutfitItemRow[]) {
  return {
    id: row.rowId,
    packedAt: row.packedAt,
    createdAt: row.rowCreatedAt,
    outfit: serializeOutfit(
      {
        id: row.outfitId,
        name: row.name,
        category: row.category,
        source: row.source,
        description: row.description,
        stylingFormula: row.stylingFormula,
        occasion: row.occasion,
        season: row.season,
        status: row.status,
        notes: row.notes,
        createdAt: row.outfitCreatedAt,
        updatedAt: row.outfitUpdatedAt,
      },
      items,
    ),
  }
}

function serializePackingPlanItem(row: PackingPlanItemRow) {
  return {
    id: row.rowId,
    packedAt: row.packedAt,
    createdAt: row.rowCreatedAt,
    item: serializeWardrobeItem({
      id: row.itemId,
      name: row.name,
      category: row.category,
      subcategory: row.subcategory,
      color: row.color,
      description: row.description,
      occasion: row.occasion,
      season: row.season,
      status: row.status,
      notes: row.notes,
      createdAt: row.itemCreatedAt,
      updatedAt: row.itemUpdatedAt,
      mediaId: row.mediaId,
      width: row.width,
      height: row.height,
    }),
  }
}

function serializePackingPlan(
  plan: PackingPlanRow,
  outfitRows: Awaited<ReturnType<typeof getPackingPlanOutfits>>,
  itemRows: PackingPlanItemRow[],
) {
  const outfitSummaries = outfitRows.map((entry) => ({ packedAt: entry.packedAt }))
  const itemSummaries = itemRows.map((entry) => ({ packedAt: entry.packedAt }))

  return {
    ...serializePackingPlanSummary(plan, outfitSummaries, itemSummaries),
    outfits: outfitRows.map((entry) => entry.serialized),
    items: itemRows.map(serializePackingPlanItem),
  }
}

function getWardrobeItemSelection() {
  return {
    id: wardrobeItems.id,
    name: wardrobeItems.name,
    category: wardrobeItems.category,
    subcategory: wardrobeItems.subcategory,
    color: wardrobeItems.color,
    description: wardrobeItems.description,
    occasion: wardrobeItems.occasion,
    season: wardrobeItems.season,
    status: wardrobeItems.status,
    notes: wardrobeItems.notes,
    createdAt: wardrobeItems.createdAt,
    updatedAt: wardrobeItems.updatedAt,
    mediaId: wardrobeItemMedia.id,
    width: wardrobeItemMedia.width,
    height: wardrobeItemMedia.height,
  }
}

async function getWardrobeItem(userId: string, itemId: string) {
  const db = getDb()
  const item = await db
    .select(getWardrobeItemSelection())
    .from(wardrobeItems)
    .leftJoin(
      wardrobeItemMedia,
      and(
        eq(wardrobeItemMedia.itemId, wardrobeItems.id),
        eq(wardrobeItemMedia.kind, 'cutout'),
      ),
    )
    .where(and(eq(wardrobeItems.userId, userId), eq(wardrobeItems.id, itemId)))
    .get()

  return item ? serializeWardrobeItem(item) : null
}

async function getOutfitRow(userId: string, outfitId: string) {
  const db = getDb()

  return db
    .select({
      id: outfits.id,
      name: outfits.name,
      category: outfits.category,
      source: outfits.source,
      description: outfits.description,
      stylingFormula: outfits.stylingFormula,
      occasion: outfits.occasion,
      season: outfits.season,
      status: outfits.status,
      notes: outfits.notes,
      createdAt: outfits.createdAt,
      updatedAt: outfits.updatedAt,
    })
    .from(outfits)
    .where(and(eq(outfits.userId, userId), eq(outfits.id, outfitId)))
    .get()
}

async function getOutfitItems(userId: string, outfitId: string) {
  const db = getDb()

  return db
    .select({
      outfitItemId: outfitItems.id,
      itemId: wardrobeItems.id,
      role: outfitItems.role,
      x: outfitItems.x,
      y: outfitItems.y,
      scale: outfitItems.scale,
      rotation: outfitItems.rotation,
      zIndex: outfitItems.zIndex,
      name: wardrobeItems.name,
      category: wardrobeItems.category,
      subcategory: wardrobeItems.subcategory,
      color: wardrobeItems.color,
      description: wardrobeItems.description,
      occasion: wardrobeItems.occasion,
      season: wardrobeItems.season,
      status: wardrobeItems.status,
      notes: wardrobeItems.notes,
      mediaId: wardrobeItemMedia.id,
      width: wardrobeItemMedia.width,
      height: wardrobeItemMedia.height,
    })
    .from(outfitItems)
    .innerJoin(
      wardrobeItems,
      and(eq(wardrobeItems.id, outfitItems.itemId), eq(wardrobeItems.userId, userId)),
    )
    .leftJoin(
      wardrobeItemMedia,
      and(
        eq(wardrobeItemMedia.itemId, wardrobeItems.id),
        eq(wardrobeItemMedia.kind, 'cutout'),
        eq(wardrobeItemMedia.userId, userId),
      ),
    )
    .where(and(eq(outfitItems.outfitId, outfitId), eq(outfitItems.userId, userId)))
    .orderBy(asc(outfitItems.zIndex), asc(outfitItems.createdAt), asc(outfitItems.id))
}

async function getOutfit(userId: string, outfitId: string) {
  const outfit = await getOutfitRow(userId, outfitId)

  if (!outfit) {
    return null
  }

  const items = await getOutfitItems(userId, outfitId)
  return serializeOutfit(outfit, items)
}

async function listOutfits(userId: string) {
  const rows = await getDb()
    .select({
      id: outfits.id,
      name: outfits.name,
      category: outfits.category,
      source: outfits.source,
      description: outfits.description,
      stylingFormula: outfits.stylingFormula,
      occasion: outfits.occasion,
      season: outfits.season,
      status: outfits.status,
      notes: outfits.notes,
      createdAt: outfits.createdAt,
      updatedAt: outfits.updatedAt,
    })
    .from(outfits)
    .where(eq(outfits.userId, userId))
    .orderBy(desc(outfits.updatedAt), desc(outfits.createdAt))

  return Promise.all(
    rows.map(async (row) => {
      const items = await getOutfitItems(userId, row.id)
      return serializeOutfit(row, items)
    }),
  )
}

async function getPackingPlanRow(userId: string, planId: string) {
  return getDb()
    .select({
      id: packingPlans.id,
      plan: packingPlans.plan,
      startDate: packingPlans.startDate,
      endDate: packingPlans.endDate,
      status: packingPlans.status,
      notes: packingPlans.notes,
      createdAt: packingPlans.createdAt,
      updatedAt: packingPlans.updatedAt,
    })
    .from(packingPlans)
    .where(and(eq(packingPlans.userId, userId), eq(packingPlans.id, planId)))
    .get()
}

async function getPackingPlanOutfitCounts(userId: string, planId: string) {
  return getDb()
    .select({
      packedAt: packingPlanOutfits.packedAt,
    })
    .from(packingPlanOutfits)
    .where(and(eq(packingPlanOutfits.userId, userId), eq(packingPlanOutfits.planId, planId)))
}

async function getPackingPlanItemCounts(userId: string, planId: string) {
  return getDb()
    .select({
      packedAt: packingPlanItems.packedAt,
    })
    .from(packingPlanItems)
    .where(and(eq(packingPlanItems.userId, userId), eq(packingPlanItems.planId, planId)))
}

async function getPackingPlanOutfits(userId: string, planId: string) {
  const rows = await getDb()
    .select({
      rowId: packingPlanOutfits.id,
      packedAt: packingPlanOutfits.packedAt,
      rowCreatedAt: packingPlanOutfits.createdAt,
      outfitId: outfits.id,
      name: outfits.name,
      category: outfits.category,
      source: outfits.source,
      description: outfits.description,
      stylingFormula: outfits.stylingFormula,
      occasion: outfits.occasion,
      season: outfits.season,
      status: outfits.status,
      notes: outfits.notes,
      outfitCreatedAt: outfits.createdAt,
      outfitUpdatedAt: outfits.updatedAt,
    })
    .from(packingPlanOutfits)
    .innerJoin(outfits, and(eq(outfits.id, packingPlanOutfits.outfitId), eq(outfits.userId, userId)))
    .where(and(eq(packingPlanOutfits.userId, userId), eq(packingPlanOutfits.planId, planId)))
    .orderBy(asc(packingPlanOutfits.createdAt), asc(packingPlanOutfits.id))

  return Promise.all(
    rows.map(async (row) => {
      const items = await getOutfitItems(userId, row.outfitId)
      return {
        packedAt: row.packedAt,
        serialized: serializePackingPlanOutfit(row, items),
      }
    }),
  )
}

async function getPackingPlanItems(userId: string, planId: string) {
  return getDb()
    .select({
      rowId: packingPlanItems.id,
      packedAt: packingPlanItems.packedAt,
      rowCreatedAt: packingPlanItems.createdAt,
      itemId: wardrobeItems.id,
      name: wardrobeItems.name,
      category: wardrobeItems.category,
      subcategory: wardrobeItems.subcategory,
      color: wardrobeItems.color,
      description: wardrobeItems.description,
      occasion: wardrobeItems.occasion,
      season: wardrobeItems.season,
      status: wardrobeItems.status,
      notes: wardrobeItems.notes,
      itemCreatedAt: wardrobeItems.createdAt,
      itemUpdatedAt: wardrobeItems.updatedAt,
      mediaId: wardrobeItemMedia.id,
      width: wardrobeItemMedia.width,
      height: wardrobeItemMedia.height,
    })
    .from(packingPlanItems)
    .innerJoin(
      wardrobeItems,
      and(eq(wardrobeItems.id, packingPlanItems.itemId), eq(wardrobeItems.userId, userId)),
    )
    .leftJoin(
      wardrobeItemMedia,
      and(
        eq(wardrobeItemMedia.itemId, wardrobeItems.id),
        eq(wardrobeItemMedia.kind, 'cutout'),
        eq(wardrobeItemMedia.userId, userId),
      ),
    )
    .where(and(eq(packingPlanItems.userId, userId), eq(packingPlanItems.planId, planId)))
    .orderBy(asc(packingPlanItems.createdAt), asc(packingPlanItems.id))
}

async function getPackingPlan(userId: string, planId: string) {
  const plan = await getPackingPlanRow(userId, planId)

  if (!plan) {
    return null
  }

  const [outfits, items] = await Promise.all([
    getPackingPlanOutfits(userId, planId),
    getPackingPlanItems(userId, planId),
  ])

  return serializePackingPlan(plan, outfits, items)
}

async function listPackingPlans(userId: string) {
  const rows = await getDb()
    .select({
      id: packingPlans.id,
      plan: packingPlans.plan,
      startDate: packingPlans.startDate,
      endDate: packingPlans.endDate,
      status: packingPlans.status,
      notes: packingPlans.notes,
      createdAt: packingPlans.createdAt,
      updatedAt: packingPlans.updatedAt,
    })
    .from(packingPlans)
    .where(eq(packingPlans.userId, userId))
    .orderBy(desc(packingPlans.updatedAt), desc(packingPlans.createdAt))

  return Promise.all(
    rows.map(async (row) => {
      const [outfits, items] = await Promise.all([
        getPackingPlanOutfitCounts(userId, row.id),
        getPackingPlanItemCounts(userId, row.id),
      ])
      return serializePackingPlanSummary(row, outfits, items)
    }),
  )
}

async function getPatchBody(request: { json: () => Promise<unknown> }) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null
  }

  return body as Record<string, unknown>
}

function readRequiredPatchText(
  body: Record<string, unknown>,
  key: string,
  label: string,
  maxLength = MAX_SHORT_TEXT,
) {
  if (!Object.hasOwn(body, key)) {
    return { present: false as const }
  }

  const value = body[key]

  if (typeof value !== 'string') {
    return { present: true as const, error: `${label} must be text.` }
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return { present: true as const, error: `${label} is required.` }
  }

  if (trimmed.length > maxLength) {
    return { present: true as const, error: `${label} must be ${maxLength} characters or fewer.` }
  }

  return { present: true as const, value: trimmed }
}

function readOptionalPatchText(
  body: Record<string, unknown>,
  key: string,
  label: string,
  maxLength = MAX_SHORT_TEXT,
) {
  if (!Object.hasOwn(body, key)) {
    return { present: false as const }
  }

  const value = body[key]

  if (value === null) {
    return { present: true as const, value: null }
  }

  if (typeof value !== 'string') {
    return { present: true as const, error: `${label} must be text.` }
  }

  const trimmed = value.trim()

  if (trimmed.length > maxLength) {
    return { present: true as const, error: `${label} must be ${maxLength} characters or fewer.` }
  }

  return { present: true as const, value: trimmed.length > 0 ? trimmed : null }
}

function isRecordBody(body: unknown): body is Record<string, unknown> {
  return Boolean(body) && typeof body === 'object' && !Array.isArray(body)
}

function readRequiredBodyText(
  body: Record<string, unknown>,
  key: string,
  label: string,
  maxLength = MAX_SHORT_TEXT,
) {
  const value = body[key]

  if (typeof value !== 'string') {
    return { error: `${label} must be text.` as const }
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return { error: `${label} is required.` as const }
  }

  if (trimmed.length > maxLength) {
    return { error: `${label} must be ${maxLength} characters or fewer.` as const }
  }

  return { value: trimmed }
}

function readOptionalBodyText(
  body: Record<string, unknown>,
  key: string,
  label: string,
  maxLength = MAX_SHORT_TEXT,
) {
  const value = body[key]

  if (value === undefined || value === null) {
    return { value: null }
  }

  if (typeof value !== 'string') {
    return { error: `${label} must be text.` as const }
  }

  const trimmed = value.trim()

  if (trimmed.length > maxLength) {
    return { error: `${label} must be ${maxLength} characters or fewer.` as const }
  }

  return { value: trimmed.length > 0 ? trimmed : null }
}

function readOptionalCreateDateText(body: Record<string, unknown>, key: string, label: string) {
  const value = body[key]

  if (value === undefined || value === null) {
    return { value: null }
  }

  if (typeof value !== 'string') {
    return { error: `${label} must be a date string.` as const }
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return { value: null }
  }

  if (!isValidDateString(trimmed)) {
    return { error: `${label} must use YYYY-MM-DD.` as const }
  }

  return { value: trimmed }
}

function readOptionalPatchDateText(body: Record<string, unknown>, key: string, label: string) {
  if (!Object.hasOwn(body, key)) {
    return { present: false as const }
  }

  const value = body[key]

  if (value === null) {
    return { present: true as const, value: null }
  }

  if (typeof value !== 'string') {
    return { present: true as const, error: `${label} must be a date string.` as const }
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return { present: true as const, value: null }
  }

  if (!isValidDateString(trimmed)) {
    return { present: true as const, error: `${label} must use YYYY-MM-DD.` as const }
  }

  return { present: true as const, value: trimmed }
}

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10))
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function readOptionalCreatePackingStatus(body: Record<string, unknown>) {
  const value = body.status

  if (value === undefined) {
    return { value: 'planning' as PackingPlanStatus }
  }

  if (typeof value !== 'string' || !packingPlanStatuses.includes(value as PackingPlanStatus)) {
    return { error: 'Status must be planning or packed.' as const }
  }

  return { value: value as PackingPlanStatus }
}

function readOptionalPatchPackingStatus(body: Record<string, unknown>) {
  if (!Object.hasOwn(body, 'status')) {
    return { present: false as const }
  }

  const value = body.status

  if (typeof value !== 'string' || !packingPlanStatuses.includes(value as PackingPlanStatus)) {
    return { present: true as const, error: 'Status must be planning or packed.' as const }
  }

  return { present: true as const, value: value as PackingPlanStatus }
}

function readRequiredIdArray(body: Record<string, unknown>, key: string, label: string) {
  const value = body[key]

  if (!Array.isArray(value)) {
    return { error: `${label} must be an array.` as const, status: 400 as const }
  }

  const ids: string[] = []

  for (const rawId of value) {
    if (typeof rawId !== 'string' || !rawId.trim()) {
      return { error: `${label} must contain only ids.` as const, status: 400 as const }
    }

    ids.push(rawId.trim())
  }

  if (ids.length === 0) {
    return { error: `${label} must include at least one id.` as const, status: 400 as const }
  }

  if (new Set(ids).size !== ids.length) {
    return { error: `${label} cannot contain duplicate ids.` as const, status: 409 as const }
  }

  return { value: ids }
}

function readOptionalIdArray(body: Record<string, unknown>, key: string, label: string) {
  const value = body[key]

  if (value === undefined || value === null) {
    return { value: [] }
  }

  if (!Array.isArray(value)) {
    return { error: `${label} must be an array.` as const, status: 400 as const }
  }

  const ids: string[] = []

  for (const rawId of value) {
    if (typeof rawId !== 'string' || !rawId.trim()) {
      return { error: `${label} must contain only ids.` as const, status: 400 as const }
    }

    ids.push(rawId.trim())
  }

  if (new Set(ids).size !== ids.length) {
    return { error: `${label} cannot contain duplicate ids.` as const, status: 409 as const }
  }

  return { value: ids }
}

function readPackedToggleBody(body: unknown) {
  if (!isRecordBody(body)) {
    return { error: 'Use a JSON object to update packed state.' as const }
  }

  if (typeof body.packed !== 'boolean') {
    return { error: 'Packed must be true or false.' as const }
  }

  return { packed: body.packed }
}

function readOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value
}

type PositionFields = {
  x: number | null
  y: number | null
  scale: number
  rotation: number
  zIndex: number
}

function readPositionFields(rawItem: Record<string, unknown>, role: OutfitRole, roleOffset: number): PositionFields {
  const rawX = readOptionalNumber(rawItem.x)
  const rawY = readOptionalNumber(rawItem.y)
  const rawScale = readOptionalNumber(rawItem.scale)
  const rawRotation = readOptionalNumber(rawItem.rotation)
  const rawZIndex = readOptionalNumber(rawItem.zIndex)

  return {
    x: rawX === null ? null : clampPosition(rawX),
    y: rawY === null ? null : clampPosition(rawY),
    scale: rawScale === null ? 1 : clampScale(rawScale),
    rotation: rawRotation === null ? 0 : normalizeRotation(rawRotation),
    zIndex:
      rawZIndex === null || !Number.isInteger(rawZIndex)
        ? defaultZIndexForRole(role) + roleOffset
        : rawZIndex,
  }
}

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

function getClientIdentifier(c: RouteContext) {
  const headers = c.req.raw.headers
  return (
    headers.get('cf-connecting-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

export function createBackendApp(options: BackendAppOptions = {}) {
  const app = new Hono<BackendEnv>()
  const baseResolveUser = options.resolveUser ?? requireUser

  const resolutionCache = new WeakMap<Request, Promise<AuthenticatedUser | null>>()
  const resolveUser = (c: RouteContext) => {
    const cached = resolutionCache.get(c.req.raw)
    if (cached) return cached
    const pending = Promise.resolve(baseResolveUser(c))
    resolutionCache.set(c.req.raw, pending)
    return pending
  }

  app.use(
    '*',
    secureHeaders({
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      xContentTypeOptions: 'nosniff',
      xFrameOptions: 'DENY',
      referrerPolicy: 'strict-origin-when-cross-origin',
      strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
    }),
  )

  app.use('*', async (c, next) => {
  initDatabase(c.env.DB)
  await next()
})

  app.use('/api/*', async (c, next) => {
    if (!MUTATING_METHODS.has(c.req.method) || c.req.path.startsWith('/api/auth/')) {
      return next()
    }

    const user = await resolveUser(c)
    const identity = user ? `user:${user.id}` : `ip:${getClientIdentifier(c)}`
    const limiter = options.writeRateLimiter ?? c.env.WRITE_RATE_LIMITER
    const result = await limiter.limit({ key: identity })

    if (!result.success) {
      return c.json({ error: 'Too many requests. Slow down and try again.' }, 429, {
        'retry-after': '60',
      })
    }

    return next()
  })

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    service: 'sardrobe-backend',
    environment: c.env.APP_ENV,
  }),
)

app.get('/api/me', async (c) => {
  const session = await getSession(c)

  if (!session?.session || !session.user) {
    return c.json({ authenticated: false })
  }

  return c.json({
    authenticated: true,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      emailVerified: session.user.emailVerified,
    },
    session: {
      id: session.session.id,
      expiresAt: session.session.expiresAt,
      createdAt: session.session.createdAt,
    },
  })
})

app.get('/api/wardrobe/items', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const db = getDb()
  const rows = await db
    .select(getWardrobeItemSelection())
    .from(wardrobeItems)
    .leftJoin(
      wardrobeItemMedia,
      and(
        eq(wardrobeItemMedia.itemId, wardrobeItems.id),
        eq(wardrobeItemMedia.kind, 'cutout'),
      ),
    )
    .where(eq(wardrobeItems.userId, user.id))
    .orderBy(desc(wardrobeItems.createdAt))

  return c.json({
    items: rows.map(serializeWardrobeItem),
  })
})

app.get('/api/outfits', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const outfits = await listOutfits(user.id)
  return c.json({ outfits })
})

app.get('/api/wardrobe/items/:id', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const item = await getWardrobeItem(user.id, c.req.param('id'))

  if (!item) {
    return c.json({ error: 'Item not found' }, 404)
  }

  return c.json({ item })
})

app.get('/api/outfits/:id', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const outfit = await getOutfit(user.id, c.req.param('id'))

  if (!outfit) {
    return c.json({ error: 'Outfit not found' }, 404)
  }

  return c.json({ outfit })
})

app.post('/api/wardrobe/items', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const formData = await c.req.formData()
  const cutout = formData.get('cutout')

  if (!(cutout instanceof File)) {
    return c.json({ error: 'A cutout WebP image is required' }, 400)
  }

  if (cutout.type !== 'image/webp') {
    return c.json({ error: 'Cutout image must be WebP' }, 400)
  }

  if (cutout.size <= 0 || cutout.size > MAX_CUTOUT_BYTES) {
    return c.json({ error: 'Cutout image must be between 1 byte and 8 MB' }, 400)
  }

  const cutoutBuffer = await cutout.arrayBuffer()
  const hasWebpHeader = parseWebp(new Uint8Array(cutoutBuffer))

  if (!hasWebpHeader) {
    return c.json({ error: 'Cutout image must be a valid WebP file' }, 400)
  }

  const decodedWebp = await decodeWebp(c.env.IMAGES, cutoutBuffer)

  if (!decodedWebp) {
    return c.json({ error: 'Cutout image must be a valid WebP file' }, 400)
  }

  const textFields = {
    name: readFormText(formData, 'name', 'Name'),
    category: readFormText(formData, 'category', 'Category'),
    subcategory: readFormText(formData, 'subcategory', 'Subcategory'),
    color: readFormText(formData, 'color', 'Color'),
    description: readFormText(formData, 'description', 'Description', MAX_LONG_TEXT),
    occasion: readFormText(formData, 'occasion', 'Occasion'),
    season: readFormText(formData, 'season', 'Season'),
    notes: readFormText(formData, 'notes', 'Notes', MAX_LONG_TEXT),
  }

  const firstFieldError = Object.values(textFields).find((field) => 'error' in field)

  if (firstFieldError && 'error' in firstFieldError) {
    return c.json({ error: firstFieldError.error }, 400)
  }

  const text = (field: { value: string | null } | { error: string }) =>
    'value' in field ? field.value : null

  const name = text(textFields.name)
  const category = text(textFields.category)

  if (!name || !category) {
    return c.json({ error: 'Name and category are required' }, 400)
  }

  // Enforce the per-user item cap before writing anything (no orphan R2 object).
  const db = getDb()
  const [itemCountRow] = await db
    .select({ value: count() })
    .from(wardrobeItems)
    .where(eq(wardrobeItems.userId, user.id))

  if ((itemCountRow?.value ?? 0) >= WARDROBE_ITEM_LIMIT) {
    return c.json(
      { error: `Wardrobe is full (${WARDROBE_ITEM_LIMIT}-item limit). Remove items to add new ones.` },
      409,
    )
  }

  const itemId = crypto.randomUUID()
  const mediaId = crypto.randomUUID()
  const objectKey = `users/${user.id}/items/${itemId}/cutout.webp`
  const now = new Date()

  await c.env.WARDROBE_MEDIA.put(objectKey, decodedWebp.buffer, {
    httpMetadata: {
      contentType: 'image/webp',
    },
  })

  try {
    await db.insert(wardrobeItems).values({
      id: itemId,
      userId: user.id,
      name,
      category,
      subcategory: text(textFields.subcategory),
      color: text(textFields.color),
      description: text(textFields.description),
      occasion: text(textFields.occasion),
      season: text(textFields.season),
      status: 'owned',
      notes: text(textFields.notes),
      createdAt: now,
      updatedAt: now,
    })

    await db.insert(wardrobeItemMedia).values({
      id: mediaId,
      itemId,
      userId: user.id,
      kind: 'cutout',
      objectKey,
      contentType: 'image/webp',
      byteSize: decodedWebp.buffer.byteLength,
      width: decodedWebp.width,
      height: decodedWebp.height,
      createdAt: now,
    })
  } catch (error) {
    await c.env.WARDROBE_MEDIA.delete(objectKey)
    throw error
  }

  return c.json(
    {
      item: {
        id: itemId,
        name,
        category,
        media: {
          id: mediaId,
          url: `/api/wardrobe/media/${mediaId}`,
        },
      },
    },
    201,
  )
})

app.post('/api/outfits', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const body = await c.req.json().catch(() => null)

  if (!isRecordBody(body)) {
    return c.json({ error: 'Use a JSON object to create an outfit.' }, 400)
  }

  const name = readRequiredBodyText(body, 'name', 'Name')
  const category = readOptionalBodyText(body, 'category', 'Category')
  const source = readOptionalBodyText(body, 'source', 'Source')
  const description = readOptionalBodyText(body, 'description', 'Description', MAX_LONG_TEXT)
  const stylingFormula = readOptionalBodyText(body, 'stylingFormula', 'Styling formula', MAX_LONG_TEXT)
  const occasion = readOptionalBodyText(body, 'occasion', 'Occasion')
  const season = readOptionalBodyText(body, 'season', 'Season')
  const notes = readOptionalBodyText(body, 'notes', 'Notes', MAX_LONG_TEXT)

  for (const field of [name, category, source, description, stylingFormula, occasion, season, notes]) {
    if ('error' in field) {
      return c.json({ error: field.error }, 400)
    }
  }

  const rawItems = body.items

  if (!Array.isArray(rawItems)) {
    return c.json({ error: 'Items must be an array.' }, 400)
  }

  if (rawItems.length === 0) {
    return c.json({ error: 'At least one outfit item is required.' }, 400)
  }

  const parsedItems: Array<{
    id: string
    itemId: string
    role: OutfitRole
    x: number | null
    y: number | null
    scale: number
    rotation: number
    zIndex: number
  }> = []
  const seenItemIds = new Set<string>()
  const seenSingleSlotRoles = new Set<OutfitRole>()
  const roleCounts = new Map<OutfitRole, number>()

  for (const rawItem of rawItems) {
    if (!isRecordBody(rawItem)) {
      return c.json({ error: 'Each outfit item must be an object.' }, 400)
    }

    const itemId = rawItem.itemId

    if (typeof itemId !== 'string' || !itemId.trim()) {
      return c.json({ error: 'Each outfit item must include an itemId.' }, 400)
    }

    const role = rawItem.role

    if (typeof role !== 'string' || !outfitRoles.includes(role as OutfitRole)) {
      return c.json({ error: 'Each outfit item role must be one of the supported outfit roles.' }, 400)
    }

    const trimmedItemId = itemId.trim()

    if (seenItemIds.has(trimmedItemId)) {
      return c.json({ error: 'Each wardrobe item can only appear once in an outfit.' }, 400)
    }

    if (singleSlotOutfitRoles.has(role as OutfitRole) && seenSingleSlotRoles.has(role as OutfitRole)) {
      return c.json({ error: `Only one ${role} item can be saved in this outfit.` }, 400)
    }

    const outfitRole = role as OutfitRole
    const roleOffset = roleCounts.get(outfitRole) ?? 0
    const position = readPositionFields(rawItem, outfitRole, roleOffset)
    roleCounts.set(outfitRole, roleOffset + 1)

    seenItemIds.add(trimmedItemId)

    if (singleSlotOutfitRoles.has(outfitRole)) {
      seenSingleSlotRoles.add(outfitRole)
    }

    parsedItems.push({
      id: crypto.randomUUID(),
      itemId: trimmedItemId,
      role: outfitRole,
      ...position,
    })
  }

  const referencedItems = await getDb()
    .select({
      id: wardrobeItems.id,
    })
    .from(wardrobeItems)
    .where(and(eq(wardrobeItems.userId, user.id), inArray(wardrobeItems.id, parsedItems.map((item) => item.itemId))))

  if (referencedItems.length !== parsedItems.length) {
    return c.json({ error: 'Every outfit item must reference one of your saved wardrobe items.' }, 400)
  }

  const outfitId = crypto.randomUUID()
  const now = new Date()
  const statements = [
    c.env.DB.prepare(
      [
        'INSERT INTO outfits',
        '(id, user_id, name, category, source, description, styling_formula, occasion, season, status, notes, created_at, updated_at)',
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ].join(' '),
    ).bind(
      outfitId,
      user.id,
      name.value,
      category.value,
      source.value,
      description.value,
      stylingFormula.value,
      occasion.value,
      season.value,
      'draft',
      notes.value,
      now.getTime(),
      now.getTime(),
    ),
    ...parsedItems.map((item) =>
      c.env.DB.prepare(
        [
          'INSERT INTO outfit_items',
          '(id, outfit_id, item_id, user_id, role, x, y, scale, rotation, z_index, created_at)',
          'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ].join(' '),
      ).bind(
        item.id,
        outfitId,
        item.itemId,
        user.id,
        item.role,
        item.x,
        item.y,
        item.scale,
        item.rotation,
        item.zIndex,
        now.getTime(),
      ),
    ),
  ]

  await c.env.DB.batch(statements)

  const outfit = await getOutfit(user.id, outfitId)

  return c.json({ outfit }, 201)
})

app.patch('/api/outfits/:id', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const outfitId = c.req.param('id')
  const existingOutfit = await getOutfit(user.id, outfitId)

  if (!existingOutfit) {
    return c.json({ error: 'Outfit not found' }, 404)
  }

  const body = await c.req.json().catch(() => null)

  if (!isRecordBody(body)) {
    return c.json({ error: 'Use a JSON object to update this outfit.' }, 400)
  }

  const name = readRequiredBodyText(body, 'name', 'Name')
  const category = readOptionalBodyText(body, 'category', 'Category')
  const source = readOptionalBodyText(body, 'source', 'Source')
  const description = readOptionalBodyText(body, 'description', 'Description', MAX_LONG_TEXT)
  const stylingFormula = readOptionalBodyText(body, 'stylingFormula', 'Styling formula', MAX_LONG_TEXT)
  const occasion = readOptionalBodyText(body, 'occasion', 'Occasion')
  const season = readOptionalBodyText(body, 'season', 'Season')
  const notes = readOptionalBodyText(body, 'notes', 'Notes', MAX_LONG_TEXT)

  for (const field of [name, category, source, description, stylingFormula, occasion, season, notes]) {
    if ('error' in field) {
      return c.json({ error: field.error }, 400)
    }
  }

  const rawItems = body.items

  if (!Array.isArray(rawItems)) {
    return c.json({ error: 'Items must be an array.' }, 400)
  }

  if (rawItems.length === 0) {
    return c.json({ error: 'At least one outfit item is required.' }, 400)
  }

  const parsedItems: Array<{
    id: string
    itemId: string
    role: OutfitRole
    x: number | null
    y: number | null
    scale: number
    rotation: number
    zIndex: number
  }> = []
  const seenItemIds = new Set<string>()
  const seenSingleSlotRoles = new Set<OutfitRole>()
  const roleCounts = new Map<OutfitRole, number>()

  for (const rawItem of rawItems) {
    if (!isRecordBody(rawItem)) {
      return c.json({ error: 'Each outfit item must be an object.' }, 400)
    }

    const itemId = rawItem.itemId

    if (typeof itemId !== 'string' || !itemId.trim()) {
      return c.json({ error: 'Each outfit item must include an itemId.' }, 400)
    }

    const role = rawItem.role

    if (typeof role !== 'string' || !outfitRoles.includes(role as OutfitRole)) {
      return c.json({ error: 'Each outfit item role must be one of the supported outfit roles.' }, 400)
    }

    const trimmedItemId = itemId.trim()

    if (seenItemIds.has(trimmedItemId)) {
      return c.json({ error: 'Each wardrobe item can only appear once in an outfit.' }, 400)
    }

    if (singleSlotOutfitRoles.has(role as OutfitRole) && seenSingleSlotRoles.has(role as OutfitRole)) {
      return c.json({ error: `Only one ${role} item can be saved in this outfit.` }, 400)
    }

    const outfitRole = role as OutfitRole
    const roleOffset = roleCounts.get(outfitRole) ?? 0
    const position = readPositionFields(rawItem, outfitRole, roleOffset)
    roleCounts.set(outfitRole, roleOffset + 1)

    seenItemIds.add(trimmedItemId)

    if (singleSlotOutfitRoles.has(outfitRole)) {
      seenSingleSlotRoles.add(outfitRole)
    }

    parsedItems.push({
      id: crypto.randomUUID(),
      itemId: trimmedItemId,
      role: outfitRole,
      ...position,
    })
  }

  const referencedItems = await getDb()
    .select({
      id: wardrobeItems.id,
    })
    .from(wardrobeItems)
    .where(and(eq(wardrobeItems.userId, user.id), inArray(wardrobeItems.id, parsedItems.map((item) => item.itemId))))

  if (referencedItems.length !== parsedItems.length) {
    return c.json({ error: 'Every outfit item must reference one of your saved wardrobe items.' }, 400)
  }

  const now = new Date()
  const statements = [
    c.env.DB.prepare(
      [
        'UPDATE outfits',
        'SET name = ?, category = ?, source = ?, description = ?, styling_formula = ?, occasion = ?, season = ?, notes = ?, updated_at = ?',
        'WHERE id = ? AND user_id = ?',
      ].join(' '),
    ).bind(
      name.value,
      category.value,
      source.value,
      description.value,
      stylingFormula.value,
      occasion.value,
      season.value,
      notes.value,
      now.getTime(),
      outfitId,
      user.id,
    ),
    c.env.DB.prepare('DELETE FROM outfit_items WHERE outfit_id = ? AND user_id = ?').bind(outfitId, user.id),
    ...parsedItems.map((item) =>
      c.env.DB.prepare(
        [
          'INSERT INTO outfit_items',
          '(id, outfit_id, item_id, user_id, role, x, y, scale, rotation, z_index, created_at)',
          'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ].join(' '),
      ).bind(
        item.id,
        outfitId,
        item.itemId,
        user.id,
        item.role,
        item.x,
        item.y,
        item.scale,
        item.rotation,
        item.zIndex,
        now.getTime(),
      ),
    ),
  ]

  await c.env.DB.batch(statements)

  const outfit = await getOutfit(user.id, outfitId)

  return c.json({ outfit })
})

app.delete('/api/outfits/:id', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const outfitId = c.req.param('id')
  const existingOutfit = await getOutfitRow(user.id, outfitId)

  if (!existingOutfit) {
    return c.json({ error: 'Outfit not found' }, 404)
  }

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM outfit_items WHERE outfit_id = ? AND user_id = ?').bind(outfitId, user.id),
    c.env.DB.prepare('DELETE FROM outfits WHERE id = ? AND user_id = ?').bind(outfitId, user.id),
  ])

  auditEvent('outfit.delete', { userId: user.id })

  return c.json({ deleted: true })
})

app.get('/api/packing-plans', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const plans = await listPackingPlans(user.id)
  return c.json({ plans })
})

app.post('/api/packing-plans', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const body = await c.req.json().catch(() => null)

  if (!isRecordBody(body)) {
    return c.json({ error: 'Use a JSON object to create a packing plan.' }, 400)
  }

  const plan = readRequiredBodyText(body, 'plan', 'Plan')
  const startDate = readOptionalCreateDateText(body, 'startDate', 'Start date')
  const endDate = readOptionalCreateDateText(body, 'endDate', 'End date')
  const status = readOptionalCreatePackingStatus(body)
  const notes = readOptionalBodyText(body, 'notes', 'Notes', MAX_LONG_TEXT)
  const outfitIds = readOptionalIdArray(body, 'outfitIds', 'Outfit ids')
  const itemIds = readOptionalIdArray(body, 'itemIds', 'Item ids')

  for (const field of [plan, startDate, endDate, status, notes]) {
    if ('error' in field) {
      return c.json({ error: field.error }, 400)
    }
  }

  if ('error' in outfitIds) {
    return c.json({ error: outfitIds.error }, outfitIds.status)
  }

  if ('error' in itemIds) {
    return c.json({ error: itemIds.error }, itemIds.status)
  }

  if (startDate.value && endDate.value && endDate.value < startDate.value) {
    return c.json({ error: 'End date cannot be before start date.' }, 400)
  }

  const initialOutfitIds = outfitIds.value
  const initialItemIds = itemIds.value
  const planId = crypto.randomUUID()
  const now = new Date()

  if (initialOutfitIds.length > 0) {
    const referencedOutfits = await getDb()
      .select({ id: outfits.id })
      .from(outfits)
      .where(and(eq(outfits.userId, user.id), inArray(outfits.id, initialOutfitIds)))

    if (referencedOutfits.length !== initialOutfitIds.length) {
      return c.json({ error: 'Every packing outfit must reference one of your saved outfits.' }, 400)
    }
  }

  if (initialItemIds.length > 0) {
    const referencedItems = await getDb()
      .select({ id: wardrobeItems.id })
      .from(wardrobeItems)
      .where(and(eq(wardrobeItems.userId, user.id), inArray(wardrobeItems.id, initialItemIds)))

    if (referencedItems.length !== initialItemIds.length) {
      return c.json({ error: 'Every packing item must reference one of your saved wardrobe items.' }, 400)
    }
  }

  await c.env.DB.batch([
    c.env.DB.prepare(
      [
        'INSERT INTO packing_plans',
        '(id, user_id, plan, start_date, end_date, status, notes, created_at, updated_at)',
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ].join(' '),
    ).bind(
      planId,
      user.id,
      plan.value ?? '',
      startDate.value,
      endDate.value,
      status.value,
      notes.value,
      now.getTime(),
      now.getTime(),
    ),
    ...initialOutfitIds.map((outfitId) =>
      c.env.DB.prepare(
        [
          'INSERT INTO packing_plan_outfits',
          '(id, plan_id, outfit_id, user_id, packed_at, created_at)',
          'VALUES (?, ?, ?, ?, ?, ?)',
        ].join(' '),
      ).bind(crypto.randomUUID(), planId, outfitId, user.id, null, now.getTime()),
    ),
    ...initialItemIds.map((itemId) =>
      c.env.DB.prepare(
        [
          'INSERT INTO packing_plan_items',
          '(id, plan_id, item_id, user_id, packed_at, created_at)',
          'VALUES (?, ?, ?, ?, ?, ?)',
        ].join(' '),
      ).bind(crypto.randomUUID(), planId, itemId, user.id, null, now.getTime()),
    ),
  ])

  const createdPlan = await getPackingPlan(user.id, planId)

  return c.json({ plan: createdPlan }, 201)
})

app.get('/api/packing-plans/:id', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const plan = await getPackingPlan(user.id, c.req.param('id'))

  if (!plan) {
    return c.json({ error: 'Packing plan not found' }, 404)
  }

  return c.json({ plan })
})

app.patch('/api/packing-plans/:id', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const planId = c.req.param('id')
  const existingPlan = await getPackingPlanRow(user.id, planId)

  if (!existingPlan) {
    return c.json({ error: 'Packing plan not found' }, 404)
  }

  const body = await getPatchBody(c.req)

  if (!body) {
    return c.json({ error: 'Use a JSON object to update this packing plan.' }, 400)
  }

  const plan = readRequiredPatchText(body, 'plan', 'Plan')
  const startDate = readOptionalPatchDateText(body, 'startDate', 'Start date')
  const endDate = readOptionalPatchDateText(body, 'endDate', 'End date')
  const status = readOptionalPatchPackingStatus(body)
  const notes = readOptionalPatchText(body, 'notes', 'Notes', MAX_LONG_TEXT)

  for (const field of [plan, startDate, endDate, status, notes]) {
    if (field.present && 'error' in field) {
      return c.json({ error: field.error }, 400)
    }
  }

  const nextStartDate = startDate.present ? startDate.value : existingPlan.startDate
  const nextEndDate = endDate.present ? endDate.value : existingPlan.endDate

  if (nextStartDate && nextEndDate && nextEndDate < nextStartDate) {
    return c.json({ error: 'End date cannot be before start date.' }, 400)
  }

  const updates: {
    plan?: string
    startDate?: string | null
    endDate?: string | null
    status?: PackingPlanStatus
    notes?: string | null
    updatedAt: Date
  } = {
    updatedAt: new Date(),
  }

  if (plan.present) updates.plan = plan.value
  if (startDate.present) updates.startDate = startDate.value
  if (endDate.present) updates.endDate = endDate.value
  if (status.present) updates.status = status.value
  if (notes.present) updates.notes = notes.value

  await getDb()
    .update(packingPlans)
    .set(updates)
    .where(and(eq(packingPlans.id, planId), eq(packingPlans.userId, user.id)))

  const updatedPlan = await getPackingPlan(user.id, planId)

  return c.json({ plan: updatedPlan })
})

app.delete('/api/packing-plans/:id', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const planId = c.req.param('id')
  const existingPlan = await getPackingPlanRow(user.id, planId)

  if (!existingPlan) {
    return c.json({ error: 'Packing plan not found' }, 404)
  }

  await getDb()
    .delete(packingPlans)
    .where(and(eq(packingPlans.id, planId), eq(packingPlans.userId, user.id)))

  auditEvent('plan.delete', { userId: user.id })

  return c.json({ deleted: true })
})

app.post('/api/packing-plans/:id/outfits', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const planId = c.req.param('id')
  const existingPlan = await getPackingPlanRow(user.id, planId)

  if (!existingPlan) {
    return c.json({ error: 'Packing plan not found' }, 404)
  }

  const body = await c.req.json().catch(() => null)

  if (!isRecordBody(body)) {
    return c.json({ error: 'Use a JSON object to add outfits.' }, 400)
  }

  const outfitIds = readRequiredIdArray(body, 'outfitIds', 'Outfit ids')

  if ('error' in outfitIds) {
    return c.json({ error: outfitIds.error }, outfitIds.status)
  }

  const referencedOutfits = await getDb()
    .select({ id: outfits.id })
    .from(outfits)
    .where(and(eq(outfits.userId, user.id), inArray(outfits.id, outfitIds.value)))

  if (referencedOutfits.length !== outfitIds.value.length) {
    return c.json({ error: 'Every packing outfit must reference one of your saved outfits.' }, 400)
  }

  const existingRows = await getDb()
    .select({ outfitId: packingPlanOutfits.outfitId })
    .from(packingPlanOutfits)
    .where(
      and(
        eq(packingPlanOutfits.userId, user.id),
        eq(packingPlanOutfits.planId, planId),
        inArray(packingPlanOutfits.outfitId, outfitIds.value),
      ),
    )

  if (existingRows.length > 0) {
    return c.json({ error: 'One or more outfits are already in this packing plan.' }, 409)
  }

  const now = new Date()
  await c.env.DB.batch([
    ...outfitIds.value.map((outfitId) =>
      c.env.DB.prepare(
        [
          'INSERT INTO packing_plan_outfits',
          '(id, plan_id, outfit_id, user_id, packed_at, created_at)',
          'VALUES (?, ?, ?, ?, ?, ?)',
        ].join(' '),
      ).bind(crypto.randomUUID(), planId, outfitId, user.id, null, now.getTime()),
    ),
    c.env.DB.prepare('UPDATE packing_plans SET updated_at = ? WHERE id = ? AND user_id = ?').bind(
      now.getTime(),
      planId,
      user.id,
    ),
  ])

  const plan = await getPackingPlan(user.id, planId)

  return c.json({ plan })
})

app.post('/api/packing-plans/:id/items', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const planId = c.req.param('id')
  const existingPlan = await getPackingPlanRow(user.id, planId)

  if (!existingPlan) {
    return c.json({ error: 'Packing plan not found' }, 404)
  }

  const body = await c.req.json().catch(() => null)

  if (!isRecordBody(body)) {
    return c.json({ error: 'Use a JSON object to add wardrobe items.' }, 400)
  }

  const itemIds = readRequiredIdArray(body, 'itemIds', 'Item ids')

  if ('error' in itemIds) {
    return c.json({ error: itemIds.error }, itemIds.status)
  }

  const referencedItems = await getDb()
    .select({ id: wardrobeItems.id })
    .from(wardrobeItems)
    .where(and(eq(wardrobeItems.userId, user.id), inArray(wardrobeItems.id, itemIds.value)))

  if (referencedItems.length !== itemIds.value.length) {
    return c.json({ error: 'Every packing item must reference one of your saved wardrobe items.' }, 400)
  }

  const existingRows = await getDb()
    .select({ itemId: packingPlanItems.itemId })
    .from(packingPlanItems)
    .where(
      and(
        eq(packingPlanItems.userId, user.id),
        eq(packingPlanItems.planId, planId),
        inArray(packingPlanItems.itemId, itemIds.value),
      ),
    )

  if (existingRows.length > 0) {
    return c.json({ error: 'One or more wardrobe items are already in this packing plan.' }, 409)
  }

  const now = new Date()
  await c.env.DB.batch([
    ...itemIds.value.map((itemId) =>
      c.env.DB.prepare(
        [
          'INSERT INTO packing_plan_items',
          '(id, plan_id, item_id, user_id, packed_at, created_at)',
          'VALUES (?, ?, ?, ?, ?, ?)',
        ].join(' '),
      ).bind(crypto.randomUUID(), planId, itemId, user.id, null, now.getTime()),
    ),
    c.env.DB.prepare('UPDATE packing_plans SET updated_at = ? WHERE id = ? AND user_id = ?').bind(
      now.getTime(),
      planId,
      user.id,
    ),
  ])

  const plan = await getPackingPlan(user.id, planId)

  return c.json({ plan })
})

app.patch('/api/packing-plans/:id/outfits/:rowId', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const planId = c.req.param('id')
  const existingPlan = await getPackingPlanRow(user.id, planId)

  if (!existingPlan) {
    return c.json({ error: 'Packing plan not found' }, 404)
  }

  const body = await c.req.json().catch(() => null)
  const packed = readPackedToggleBody(body)

  if ('error' in packed) {
    return c.json({ error: packed.error }, 400)
  }

  const row = await getDb()
    .select({ id: packingPlanOutfits.id })
    .from(packingPlanOutfits)
    .where(
      and(
        eq(packingPlanOutfits.id, c.req.param('rowId')),
        eq(packingPlanOutfits.planId, planId),
        eq(packingPlanOutfits.userId, user.id),
      ),
    )
    .get()

  if (!row) {
    return c.json({ error: 'Packing outfit not found' }, 404)
  }

  const now = new Date()
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE packing_plan_outfits SET packed_at = ? WHERE id = ? AND plan_id = ? AND user_id = ?').bind(
      packed.packed ? now.getTime() : null,
      row.id,
      planId,
      user.id,
    ),
    c.env.DB.prepare('UPDATE packing_plans SET updated_at = ? WHERE id = ? AND user_id = ?').bind(
      now.getTime(),
      planId,
      user.id,
    ),
  ])

  const plan = await getPackingPlan(user.id, planId)

  return c.json({ plan })
})

app.delete('/api/packing-plans/:id/outfits/:rowId', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const planId = c.req.param('id')
  const existingPlan = await getPackingPlanRow(user.id, planId)

  if (!existingPlan) {
    return c.json({ error: 'Packing plan not found' }, 404)
  }

  const row = await getDb()
    .select({ id: packingPlanOutfits.id })
    .from(packingPlanOutfits)
    .where(
      and(
        eq(packingPlanOutfits.id, c.req.param('rowId')),
        eq(packingPlanOutfits.planId, planId),
        eq(packingPlanOutfits.userId, user.id),
      ),
    )
    .get()

  if (!row) {
    return c.json({ error: 'Packing outfit not found' }, 404)
  }

  const now = new Date()
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM packing_plan_outfits WHERE id = ? AND plan_id = ? AND user_id = ?').bind(
      row.id,
      planId,
      user.id,
    ),
    c.env.DB.prepare('UPDATE packing_plans SET updated_at = ? WHERE id = ? AND user_id = ?').bind(
      now.getTime(),
      planId,
      user.id,
    ),
  ])

  const plan = await getPackingPlan(user.id, planId)

  return c.json({ plan })
})

app.patch('/api/packing-plans/:id/items/:rowId', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const planId = c.req.param('id')
  const existingPlan = await getPackingPlanRow(user.id, planId)

  if (!existingPlan) {
    return c.json({ error: 'Packing plan not found' }, 404)
  }

  const body = await c.req.json().catch(() => null)
  const packed = readPackedToggleBody(body)

  if ('error' in packed) {
    return c.json({ error: packed.error }, 400)
  }

  const row = await getDb()
    .select({ id: packingPlanItems.id })
    .from(packingPlanItems)
    .where(
      and(
        eq(packingPlanItems.id, c.req.param('rowId')),
        eq(packingPlanItems.planId, planId),
        eq(packingPlanItems.userId, user.id),
      ),
    )
    .get()

  if (!row) {
    return c.json({ error: 'Packing item not found' }, 404)
  }

  const now = new Date()
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE packing_plan_items SET packed_at = ? WHERE id = ? AND plan_id = ? AND user_id = ?').bind(
      packed.packed ? now.getTime() : null,
      row.id,
      planId,
      user.id,
    ),
    c.env.DB.prepare('UPDATE packing_plans SET updated_at = ? WHERE id = ? AND user_id = ?').bind(
      now.getTime(),
      planId,
      user.id,
    ),
  ])

  const plan = await getPackingPlan(user.id, planId)

  return c.json({ plan })
})

app.delete('/api/packing-plans/:id/items/:rowId', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const planId = c.req.param('id')
  const existingPlan = await getPackingPlanRow(user.id, planId)

  if (!existingPlan) {
    return c.json({ error: 'Packing plan not found' }, 404)
  }

  const row = await getDb()
    .select({ id: packingPlanItems.id })
    .from(packingPlanItems)
    .where(
      and(
        eq(packingPlanItems.id, c.req.param('rowId')),
        eq(packingPlanItems.planId, planId),
        eq(packingPlanItems.userId, user.id),
      ),
    )
    .get()

  if (!row) {
    return c.json({ error: 'Packing item not found' }, 404)
  }

  const now = new Date()
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM packing_plan_items WHERE id = ? AND plan_id = ? AND user_id = ?').bind(
      row.id,
      planId,
      user.id,
    ),
    c.env.DB.prepare('UPDATE packing_plans SET updated_at = ? WHERE id = ? AND user_id = ?').bind(
      now.getTime(),
      planId,
      user.id,
    ),
  ])

  const plan = await getPackingPlan(user.id, planId)

  return c.json({ plan })
})

app.patch('/api/wardrobe/items/:id', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const itemId = c.req.param('id')
  const existingItem = await getWardrobeItem(user.id, itemId)

  if (!existingItem) {
    return c.json({ error: 'Item not found' }, 404)
  }

  const body = await getPatchBody(c.req)

  if (!body) {
    return c.json({ error: 'Use a JSON object to update this item.' }, 400)
  }

  const name = readRequiredPatchText(body, 'name', 'Name')
  const category = readRequiredPatchText(body, 'category', 'Category')
  const subcategory = readOptionalPatchText(body, 'subcategory', 'Subcategory')
  const color = readOptionalPatchText(body, 'color', 'Color')
  const description = readOptionalPatchText(body, 'description', 'Description', MAX_LONG_TEXT)
  const occasion = readOptionalPatchText(body, 'occasion', 'Occasion')
  const season = readOptionalPatchText(body, 'season', 'Season')
  const notes = readOptionalPatchText(body, 'notes', 'Notes', MAX_LONG_TEXT)
  const fields = { name, category, subcategory, color, description, occasion, season, notes }

  for (const field of Object.values(fields)) {
    if (field.present && 'error' in field) {
      return c.json({ error: field.error }, 400)
    }
  }

  const updates: {
    name?: string
    category?: string
    subcategory?: string | null
    color?: string | null
    description?: string | null
    occasion?: string | null
    season?: string | null
    notes?: string | null
    updatedAt: Date
  } = {
    updatedAt: new Date(),
  }

  if (name.present) updates.name = name.value
  if (category.present) updates.category = category.value
  if (subcategory.present) updates.subcategory = subcategory.value
  if (color.present) updates.color = color.value
  if (description.present) updates.description = description.value
  if (occasion.present) updates.occasion = occasion.value
  if (season.present) updates.season = season.value
  if (notes.present) updates.notes = notes.value

  await getDb()
    .update(wardrobeItems)
    .set(updates)
    .where(and(eq(wardrobeItems.id, itemId), eq(wardrobeItems.userId, user.id)))

  const item = await getWardrobeItem(user.id, itemId)

  return c.json({ item })
})

app.delete('/api/wardrobe/items/:id', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const itemId = c.req.param('id')
  const item = await getWardrobeItem(user.id, itemId)

  if (!item) {
    return c.json({ error: 'Item not found' }, 404)
  }

  const db = getDb()
  const mediaRows = await db
    .select({ objectKey: wardrobeItemMedia.objectKey })
    .from(wardrobeItemMedia)
    .where(and(eq(wardrobeItemMedia.itemId, itemId), eq(wardrobeItemMedia.userId, user.id)))

  await Promise.all(mediaRows.map((media) => c.env.WARDROBE_MEDIA.delete(media.objectKey)))

  await db
    .delete(wardrobeItems)
    .where(and(eq(wardrobeItems.id, itemId), eq(wardrobeItems.userId, user.id)))

  auditEvent('item.delete', { userId: user.id, mediaCount: mediaRows.length })

  return c.json({ deleted: true })
})

app.get('/api/wardrobe/media/:id', async (c) => {
  const user = await resolveUser(c)

  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const db = getDb()
  const media = await db
    .select()
    .from(wardrobeItemMedia)
    .where(and(eq(wardrobeItemMedia.id, c.req.param('id')), eq(wardrobeItemMedia.userId, user.id)))
    .get()

  if (!media) {
    auditEvent('media.access_denied', { userId: user.id })
    return c.json({ error: 'Media not found' }, 404)
  }

  const object = await c.env.WARDROBE_MEDIA.get(media.objectKey)

  if (!object) {
    return c.json({ error: 'Media file not found' }, 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  // Cutout objects are write-once (key never reused), so they can be cached
  // immutably. This lets the browser reuse them across #wardrobe and #outfits
  // with no revalidation. If a future feature ever re-uploads to an existing
  // key, mint a new mediaId/objectKey instead of overwriting.
  headers.set('cache-control', 'private, max-age=31536000, immutable')

  return new Response(object.body, { headers })
})

// Permanently and irreversibly delete the signed-in user's account and all of
// their data. There is no archive, soft-delete, or recovery path. The typed
// confirmation lives in the UI; here we rely on a valid session plus the
// destructive method. Order matters: revoke the Google grant and remove data
// that no D1 cascade covers (R2 media, verification rows) BEFORE deleting the
// user row, which is the cascade root.
app.delete('/api/account', async (c) => {
  const authedUser = await resolveUser(c)

  if (!authedUser) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const userId = authedUser.id
  const db = getDb()

  // 1. Revoke the Google OAuth grant using the stored tokens before the account
  //    row (which holds them) is deleted. Best-effort: never blocks deletion.
  const accountRows = await db
    .select({ accessToken: account.accessToken, refreshToken: account.refreshToken })
    .from(account)
    .where(eq(account.userId, userId))

  await Promise.all(accountRows.map((row) => revokeGoogleGrant(row)))

  // 2. Delete every R2 object under the user's prefix (paginated, no cascade).
  const deletedMediaCount = await deleteUserMedia(c.env.WARDROBE_MEDIA, userId)

  // 3. Delete D1 rows. `verification` is keyed by identifier (the email), not by
  //    user_id, so it must be removed explicitly. Deleting child tables in order
  //    and the user row last keeps the result deterministic even though the FK
  //    cascade would also fire. One batch so it is atomic.
  const email = authedUser.email ?? null

  const statements = [
    c.env.DB.prepare('DELETE FROM packing_plan_items WHERE user_id = ?').bind(userId),
    c.env.DB.prepare('DELETE FROM packing_plan_outfits WHERE user_id = ?').bind(userId),
    c.env.DB.prepare('DELETE FROM packing_plans WHERE user_id = ?').bind(userId),
    c.env.DB.prepare('DELETE FROM outfit_items WHERE user_id = ?').bind(userId),
    c.env.DB.prepare('DELETE FROM outfits WHERE user_id = ?').bind(userId),
    c.env.DB.prepare('DELETE FROM wardrobe_item_media WHERE user_id = ?').bind(userId),
    c.env.DB.prepare('DELETE FROM wardrobe_items WHERE user_id = ?').bind(userId),
    c.env.DB.prepare('DELETE FROM session WHERE user_id = ?').bind(userId),
    c.env.DB.prepare('DELETE FROM account WHERE user_id = ?').bind(userId),
    ...(email ? [c.env.DB.prepare('DELETE FROM verification WHERE identifier = ?').bind(email)] : []),
    c.env.DB.prepare('DELETE FROM user WHERE id = ?').bind(userId),
  ]

  await c.env.DB.batch(statements)

  auditEvent('account.delete', {
    userId,
    deletedMediaCount,
    revokedGrants: accountRows.length,
  })

  return c.json({ deleted: true })
})

app.all('/api/auth/*', async (c) => {
  const path = c.req.path
  const signingOutUser = path === '/api/auth/sign-out' ? await resolveUser(c) : null
  const auth = await getAuth(c.env, { baseURL: getPublicOrigin(c.req.raw, c.env.BETTER_AUTH_URL) })
  const response = await auth.handler(c.req.raw)

  if (path.startsWith('/api/auth/callback/')) {
    const setCookie = response.headers.get('set-cookie') ?? ''
    if (setCookie.includes('better-auth.session_token=')) {
      auditEvent('auth.sign_in')
    } else {
      auditEvent('auth.sign_in_failed')
    }
  } else if (path === '/api/auth/sign-out' && response.ok) {
    auditEvent('auth.sign_out', { userId: signingOutUser?.id })
  }

  return response
})

  app.notFound((c) => c.json({ error: 'Not found' }, 404))

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse()
    }

    Sentry.captureException(err, {
      tags: { method: c.req.method, path: c.req.path },
    })

    return c.json({ error: 'Internal error' }, 500)
  })

  return app
}

const app = createBackendApp()

export default Sentry.withSentry((env: BackendBindings) => sentryOptions(env), app)
