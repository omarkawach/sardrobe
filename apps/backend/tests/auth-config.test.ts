import { describe, expect, it, vi } from 'vitest'
import { getAuthConfigFromEnv } from '@sardrobe/data-ops'

describe('getAuthConfigFromEnv', () => {
  it('resolves Cloudflare Secrets Store bindings', async () => {
    const secret = vi.fn(async () => 'auth-secret')
    const clientId = vi.fn(async () => 'google-client-id')
    const clientSecret = vi.fn(async () => 'google-client-secret')

    await expect(
      getAuthConfigFromEnv({
        BETTER_AUTH_SECRET: { get: secret },
        BETTER_AUTH_URL: 'https://dev.sardrobe.com',
        GOOGLE_CLIENT_ID: { get: clientId },
        GOOGLE_CLIENT_SECRET: { get: clientSecret },
      }),
    ).resolves.toEqual({
      secret: 'auth-secret',
      baseURL: 'https://dev.sardrobe.com',
      googleClientId: 'google-client-id',
      googleClientSecret: 'google-client-secret',
    })

    expect(secret).toHaveBeenCalledOnce()
    expect(clientId).toHaveBeenCalledOnce()
    expect(clientSecret).toHaveBeenCalledOnce()
  })
})
