import { env } from 'cloudflare:workers'
import { applyD1Migrations, type D1Migration } from 'cloudflare:test'
import { beforeEach } from 'vitest'
import type { BackendBindings } from '../src/index'

type TestBindings = BackendBindings & {
  TEST_MIGRATIONS: D1Migration[]
}

function testEnv() {
  return env as TestBindings
}

async function clearD1() {
  const bindings = testEnv()

  await bindings.DB.batch([
    bindings.DB.prepare('DELETE FROM outfit_items'),
    bindings.DB.prepare('DELETE FROM outfits'),
    bindings.DB.prepare('DELETE FROM wardrobe_item_media'),
    bindings.DB.prepare('DELETE FROM wardrobe_items'),
    bindings.DB.prepare('DELETE FROM account'),
    bindings.DB.prepare('DELETE FROM session'),
    bindings.DB.prepare('DELETE FROM verification'),
    bindings.DB.prepare('DELETE FROM user'),
  ])
}

async function clearR2() {
  const bindings = testEnv()
  let cursor: string | undefined

  do {
    const page = await bindings.WARDROBE_MEDIA.list({ cursor })
    await Promise.all(page.objects.map((object) => bindings.WARDROBE_MEDIA.delete(object.key)))
    cursor = page.truncated ? page.cursor : undefined
  } while (cursor)
}

beforeEach(async () => {
  const bindings = testEnv()

  await applyD1Migrations(bindings.DB, bindings.TEST_MIGRATIONS)
  await clearD1()
  await clearR2()
})
