import { betterAuth } from 'better-auth'
import type { BetterAuthOptions } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import * as schema from './auth-schema'
import { getDb } from './db/database'

export interface AuthRuntimeConfig {
  secret: string
  baseURL: string
  googleClientId: string
  googleClientSecret: string
}

type SecretBinding = string | { get(): Promise<string> }

export interface AuthEnvShape {
  BETTER_AUTH_SECRET: SecretBinding
  BETTER_AUTH_URL?: string
  GOOGLE_CLIENT_ID: SecretBinding
  GOOGLE_CLIENT_SECRET: SecretBinding
}

const SHARED_TRUSTED_ORIGINS = ['http://localhost:4321', 'http://127.0.0.1:4321']

function normalizeBaseURL(baseURL: string) {
  return baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
}

export function createBetterAuth(
  database: NonNullable<BetterAuthOptions['database']>,
  config: AuthRuntimeConfig,
) {
  const baseURL = normalizeBaseURL(config.baseURL)
  const trustedOrigins = Array.from(new Set([...SHARED_TRUSTED_ORIGINS, baseURL]))
  const useSecureCookies = baseURL.startsWith('https://')

  return betterAuth({
    database,
    secret: config.secret,
    appName: 'Sardrobe',
    baseURL,
    basePath: '/api/auth',
    trustedOrigins,
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      google: {
        clientId: config.googleClientId,
        clientSecret: config.googleClientSecret,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      useSecureCookies,
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip'],
      },
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: useSecureCookies,
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
      customRules: {
        '/sign-in/social': { window: 60, max: 10 },
        '/callback/*': { window: 60, max: 10 },
        '/get-session': { window: 60, max: 120 },
      },
    },
  })
}

async function resolveSecretValue(secret: SecretBinding) {
  return typeof secret === 'string' ? secret : secret.get()
}

export async function getAuthConfigFromEnv(env: AuthEnvShape): Promise<AuthRuntimeConfig> {
  const [secret, googleClientId, googleClientSecret] = await Promise.all([
    resolveSecretValue(env.BETTER_AUTH_SECRET),
    resolveSecretValue(env.GOOGLE_CLIENT_ID),
    resolveSecretValue(env.GOOGLE_CLIENT_SECRET),
  ])

  return {
    secret,
    baseURL: env.BETTER_AUTH_URL ?? 'http://localhost:4321',
    googleClientId,
    googleClientSecret,
  }
}

export async function getAuth(
  env: AuthEnvShape,
  overrides?: Partial<Pick<AuthRuntimeConfig, 'baseURL'>>,
) {
  const config = await getAuthConfigFromEnv(env)

  return createBetterAuth(
    drizzleAdapter(getDb(), {
      provider: 'sqlite',
      schema,
    }),
    {
      ...config,
      ...overrides,
    },
  )
}
