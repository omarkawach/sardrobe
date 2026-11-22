import { env } from 'cloudflare:workers'
import { getAuth, initDatabase } from '@sardrobe/data-ops'
import { expect, it } from 'vitest'

it('creates a Google account through the updated adapter using the existing database default', async () => {
  initDatabase(env.DB)
  const auth = await getAuth(env)
  const context = await auth.$context
  const user = await context.internalAdapter.createUser({
    name: 'Auth compatibility fixture', email: 'auth-compatibility@example.test', emailVerified: true,
  }, { method: 'oauth', oauth: { providerId: 'google' } })
  const account = await context.internalAdapter.createAccount({
    userId: user.id, providerId: 'google', accountId: 'google-compatibility-subject',
  })
  expect(account?.providerId).toBe('google')
  expect(await env.DB.prepare('SELECT issuer FROM account WHERE id = ?').bind(account!.id).first())
    .toEqual({ issuer: 'https://accounts.google.com' })
  await expect(auth.api.getSession({ headers: new Headers() })).resolves.toBeNull()
})
