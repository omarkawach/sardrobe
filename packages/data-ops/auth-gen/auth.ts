import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import { createBetterAuth } from '../src/auth'

export const auth = createBetterAuth(
  drizzleAdapter({}, { provider: 'sqlite' }),
  {
    secret: '',
    baseURL: 'http://localhost:4321',
    googleClientId: '',
    googleClientSecret: '',
  },
)
