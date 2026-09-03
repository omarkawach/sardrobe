import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(path.resolve(dirname, '../../packages/data-ops/drizzle'))

      return {
        wrangler: {
          configPath: path.resolve(dirname, 'wrangler.jsonc'),
        },
        miniflare: {
          bindings: {
            BETTER_AUTH_SECRET: 'test-secret',
            BETTER_AUTH_URL: 'http://sardrobe.test',
            APP_ENV: 'test',
            GOOGLE_CLIENT_ID: 'test-google-client-id',
            GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
            TEST_MIGRATIONS: migrations,
          },
        },
      }
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
})
