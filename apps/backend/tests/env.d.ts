import type { D1Migration } from 'cloudflare:test'

declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database
      WARDROBE_MEDIA: R2Bucket
      IMAGES: ImagesBinding
      WRITE_RATE_LIMITER: RateLimit
      BETTER_AUTH_SECRET: string
      BETTER_AUTH_URL: string
      APP_ENV: string
      GOOGLE_CLIENT_ID: string
      GOOGLE_CLIENT_SECRET: string
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}

export {}
