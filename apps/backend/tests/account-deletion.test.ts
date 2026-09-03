import { env } from 'cloudflare:workers'
import * as Sentry from '@sentry/cloudflare'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createBackendApp,
  deleteUserMedia,
  type AuthenticatedUser,
  type BackendBindings,
} from '../src/index'

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

const app = createBackendApp({
  resolveUser: async () => activeUser,
  writeRateLimiter: {
    limit: async () => ({ success: true }),
  },
})

function testEnv() {
  return env as BackendBindings
}

function appRequest(path: string, init?: RequestInit) {
  return app.fetch(new Request(`http://sardrobe.test${path}`, init), testEnv())
}

async function tableCount(table: string, where = '1 = 1') {
  const result = await testEnv()
    .DB.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE ${where}`)
    .first<{ count: number }>()
  return result?.count ?? 0
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

/**
 * Seed a complete inventory of rows for a user across every table that
 * references them, plus a session, account, verification row, and R2 cutouts.
 */
async function seedFullInventory(user: AuthenticatedUser, mediaCount = 3) {
  const bindings = testEnv()
  const now = Date.now()
  const itemId = `${user.id}-item`
  const outfitId = `${user.id}-outfit`
  const planId = `${user.id}-plan`

  await bindings.DB.batch([
    bindings.DB.prepare(
      'INSERT INTO session (id, expires_at, token, created_at, updated_at, user_id) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(`${user.id}-session`, now + 1_000_000, `${user.id}-token`, now, now, user.id),
    bindings.DB.prepare(
      'INSERT INTO account (id, account_id, provider_id, user_id, access_token, refresh_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(`${user.id}-account`, `google-${user.id}`, 'google', user.id, `access-${user.id}`, `refresh-${user.id}`, now, now),
    bindings.DB.prepare(
      'INSERT INTO verification (id, identifier, value, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(`${user.id}-verification`, user.email!, 'code', now + 1_000_000, now, now),
    bindings.DB.prepare(
      'INSERT INTO wardrobe_items (id, user_id, name, category, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(itemId, user.id, 'Item', 'Tops', 'owned', now, now),
    bindings.DB.prepare(
      'INSERT INTO outfits (id, user_id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(outfitId, user.id, 'Outfit', 'draft', now, now),
    bindings.DB.prepare(
      'INSERT INTO outfit_items (id, outfit_id, item_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(`${user.id}-outfit-item`, outfitId, itemId, user.id, 'top', now),
    bindings.DB.prepare(
      'INSERT INTO packing_plans (id, user_id, plan, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(planId, user.id, 'Plan', 'planning', now, now),
    bindings.DB.prepare(
      'INSERT INTO packing_plan_outfits (id, plan_id, outfit_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)',
    ).bind(`${user.id}-plan-outfit`, planId, outfitId, user.id, now),
    bindings.DB.prepare(
      'INSERT INTO packing_plan_items (id, plan_id, item_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)',
    ).bind(`${user.id}-plan-item`, planId, itemId, user.id, now),
  ])

  const mediaStatements = []
  for (let index = 0; index < mediaCount; index += 1) {
    const objectKey = `users/${user.id}/items/${itemId}/cutout-${index}.webp`
    await bindings.WARDROBE_MEDIA.put(objectKey, new Uint8Array([index]))
    mediaStatements.push(
      bindings.DB.prepare(
        'INSERT INTO wardrobe_item_media (id, item_id, user_id, kind, object_key, content_type, byte_size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(`${user.id}-media-${index}`, itemId, user.id, 'cutout', objectKey, 'image/webp', 1, now),
    )
  }
  await bindings.DB.batch(mediaStatements)
}

async function userPrefixObjectCount(userId: string) {
  const listing = await testEnv().WARDROBE_MEDIA.list({ prefix: `users/${userId}/` })
  return listing.objects.length
}

const INVENTORY_TABLES = [
  'session',
  'account',
  'wardrobe_items',
  'wardrobe_item_media',
  'outfits',
  'outfit_items',
  'packing_plans',
  'packing_plan_outfits',
  'packing_plan_items',
] as const

beforeEach(async () => {
  activeUser = null
  await seedUsers()
})

describe('account deletion API', () => {
  it('rejects an unauthenticated delete request', async () => {
    activeUser = null
    const response = await appRequest('/api/account', { method: 'DELETE' })

    expect(response.status).toBe(401)
    expect(await tableCount('user')).toBe(2)
  })

  it('deletes all of the caller data and leaves other users untouched', async () => {
    await seedFullInventory(userA)
    await seedFullInventory(userB)

    activeUser = userA
    const response = await appRequest('/api/account', { method: 'DELETE' })
    const payload = (await response.json()) as { deleted: boolean }

    expect(response.status).toBe(200)
    expect(payload.deleted).toBe(true)

    // Every inventory table is empty for user A and intact for user B.
    for (const table of INVENTORY_TABLES) {
      expect(await tableCount(table, `user_id = '${userA.id}'`)).toBe(0)
      expect(await tableCount(table, `user_id = '${userB.id}'`)).toBeGreaterThan(0)
    }

    // The user row and the verification row keyed by the email are gone.
    expect(await tableCount('user', `id = '${userA.id}'`)).toBe(0)
    expect(await tableCount('user', `id = '${userB.id}'`)).toBe(1)
    expect(await tableCount('verification', `identifier = '${userA.email}'`)).toBe(0)
    expect(await tableCount('verification', `identifier = '${userB.email}'`)).toBe(1)

    // R2 objects under the prefix are gone for A, retained for B.
    expect(await userPrefixObjectCount(userA.id)).toBe(0)
    expect(await userPrefixObjectCount(userB.id)).toBeGreaterThan(0)
  })

  it('emits an account.delete audit event with only the user id and counts', async () => {
    await seedFullInventory(userA)
    const auditSpy = vi.spyOn(Sentry.logger, 'info')

    try {
      activeUser = userA
      const response = await appRequest('/api/account', { method: 'DELETE' })
      expect(response.status).toBe(200)

      const auditCall = auditSpy.mock.calls.find(([message]) => message === 'account.delete')
      expect(auditCall).toBeDefined()
      const [, attributes] = auditCall as [string, Record<string, unknown>]
      expect(attributes).toMatchObject({ audit: true, userId: userA.id })
      expect(attributes.deletedMediaCount).toBeGreaterThanOrEqual(0)
    } finally {
      auditSpy.mockRestore()
    }
  })

  it('does not let one user delete another user account', async () => {
    await seedFullInventory(userA)

    // User B is signed in; deleting only ever targets the caller, so user A's
    // data must survive entirely.
    activeUser = userB
    const response = await appRequest('/api/account', { method: 'DELETE' })

    expect(response.status).toBe(200)
    expect(await tableCount('user', `id = '${userA.id}'`)).toBe(1)
    expect(await tableCount('wardrobe_items', `user_id = '${userA.id}'`)).toBe(1)
    expect(await userPrefixObjectCount(userA.id)).toBeGreaterThan(0)
  })

  it('removes R2 objects across pagination boundaries', async () => {
    const bindings = testEnv()
    const prefix = `users/${userA.id}/`

    for (let index = 0; index < 5; index += 1) {
      await bindings.WARDROBE_MEDIA.put(`${prefix}object-${index}.webp`, new Uint8Array([index]))
    }

    // A page size below the object count forces the cursor loop to run.
    const deleted = await deleteUserMedia(bindings.WARDROBE_MEDIA, userA.id, 2)

    expect(deleted).toBe(5)
    expect(await userPrefixObjectCount(userA.id)).toBe(0)
  })
})
