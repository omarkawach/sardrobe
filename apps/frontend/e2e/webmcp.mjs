import assert from 'node:assert/strict'
import { mkdir, readdir, writeFile, rm } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { chromium, expect } from '@playwright/test'
import { startApplication } from './application.mjs'

const imageDirectory = process.argv[2] ?? process.env.SARDROBE_DEMO_IMAGES
if (!imageDirectory) throw new Error('Pass a directory of demo images: pnpm test:e2e:webmcp /path/to/images')
const images = (await readdir(imageDirectory)).filter((name) => /\.(png|jpe?g|webp)$/i.test(name)).sort()
assert.ok(images.length > 0, 'The demo directory must contain images')
const output = resolve(process.env.SARDROBE_E2E_OUTPUT_DIR ?? 'test-results/webmcp')
await mkdir(output, { recursive: true })
const app = await startApplication()
let browser
let page
const calls = new Map()
const pageErrors = []
const registrationErrors = []
const checks = []
const report = { passed: false, images, checks, authentication: 'Valid session seeded in fresh local D1; Google OAuth is outside this test.' }
try {
  browser = await chromium.launch({ headless: true, args: ['--disable-features=WebMCP'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addInitScript(() => { globalThis.__sardrobeNativeWebMcpAvailable = document.modelContext !== undefined })
  page = await context.newPage()
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (/Could not register/.test(message.text())) registrationErrors.push(message.text())
    if (message.type() === 'error') console.error('Browser:', message.text())
  })
  async function tools() { return page.evaluate(async () => (await document.modelContext?.getTools() ?? []).map(({ name, inputSchema }) => ({ name, inputSchema }))) }
  async function waitTool(name) { await expect.poll(async () => (await tools()).some((tool) => tool.name === name), { timeout: 15000 }).toBe(true) }
  async function call(name, input = {}) {
    await waitTool(name)
    calls.set(name, (calls.get(name) ?? 0) + 1)
    return page.evaluate(async ({ name, input }) => {
      const context = document.modelContext
      const tool = (await context.getTools()).find((tool) => tool.name === name)
      return JSON.parse(await context.executeTool(tool, input))
    }, { name, input })
  }
  async function image(name, input) {
    const result = await call(name, { ...input, maxWidth: 384 })
    const content = result.content.find((block) => block.type === 'image')
    assert.ok(content?.data.length > 100, `${name} returned image bytes`)
    const size = await page.evaluate(async ({ data, mimeType }) => {
      const blob = await (await fetch(`data:${mimeType};base64,${data}`)).blob()
      const bitmap = await createImageBitmap(blob)
      const size = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
      return size
    }, content)
    assert.ok(size.width > 0 && size.height > 0, `${name} returned a decodable image`)
  }
  function checked(message) { checks.push(message); console.log(message) }

  await page.goto(app.origin)
  assert.equal((await call('sardrobe_overview')).site.name, 'Sardrobe')
  report.runtime = { node: process.versions.node, browser: browser.version(), nativeWebMcpBeforeLoad: await page.evaluate(() => globalThis.__sardrobeNativeWebMcpAvailable) }
  assert.equal(report.runtime.nativeWebMcpBeforeLoad, false, 'This run must exercise the official polyfill')
  assert.equal((await context.request.get(`${app.origin}/api/wardrobe/items`)).status(), 401)
  checked('Public discovery works; unauthenticated wardrobe access is rejected')
  await context.addCookies([app.cookie])
  await page.goto(`${app.origin}/app/#upload`)
  await waitTool('import_drafts')
  await page.locator('input[type=file]').setInputFiles(images.map((name) => resolve(imageDirectory, name)))
  await expect.poll(async () => {
    const result = await call('import_drafts', { action: 'list' })
    const failed = result.drafts.filter((draft) => draft.status === 'failed')
    assert.deepEqual(failed.map(({ fileName, error }) => ({ fileName, error })), [])
    console.log(`Imports: ${result.drafts.filter((draft) => draft.status === 'ready').length}/${images.length} ready`)
    return result.drafts.filter((draft) => draft.status === 'ready').length
  }, { timeout: 600000, intervals: [1000, 3000, 5000] }).toBe(images.length)
  checked(`All ${images.length} demo images processed in the real browser`)
  const drafts = (await call('import_drafts', { action: 'list' })).drafts
  const saved = []
  for (const draft of drafts) {
    await call('import_drafts', { action: 'get', draftId: draft.id })
    await image('import_draft_image', { draftId: draft.id })
    // Filename labels are deliberate test fixtures, not automatic visual guesses.
    const category = /jacket/.test(draft.fileName) ? 'Outerwear' : /pants/.test(draft.fileName) ? 'Bottoms'
      : /boots/.test(draft.fileName) ? 'Shoes' : /bag/.test(draft.fileName) ? 'Bags'
      : /skirt/.test(draft.fileName) ? 'Skirts' : 'Tops'
    await call('import_draft_mutate', { action: 'update', name: draft.fileName, category, notes: 'Local WebMCP test fixture; review metadata before real use.' })
    if (!saved.length) await assert.rejects(call('import_draft_mutate', { action: 'submit' }))
    const result = await call('import_draft_mutate', { action: 'submit', confirm: true })
    assert.equal(result.kind, 'imports.draft_submitted')
    saved.push({ ...result.item, fileName: draft.fileName })
  }
  assert.equal((await call('import_drafts', { action: 'list' })).count, 0)
  assert.equal((await call('wardrobe_items', { action: 'list' })).count, images.length)
  assert.equal((await app.media.list()).objects.length, images.length)
  checked(`Reviewed and saved ${images.length} cutouts through imperative tools into local D1/R2`)

  await page.goto(`${app.origin}/app/#wardrobe`)
  await waitTool('wardrobe_items')
  assert.equal((await call('wardrobe_items', { action: 'list', query: saved[0].fileName })).count, 1)
  for (const item of saved) await image('wardrobe_item_image', { itemId: item.id })
  await page.screenshot({ path: join(output, 'wardrobe.png'), fullPage: true })
  await call('wardrobe_items', { action: 'get', itemId: saved[0].id })
  const update = await call('wardrobe_item_mutate', { action: 'update', notes: 'Updated through the imperative tool', season: ['Winter'], occasion: [] })
  assert.equal(update.item.notes, 'Updated through the imperative tool')
  await assert.rejects(call('wardrobe_item_mutate', { action: 'update', category: 'Invented' }))
  await assert.rejects(call('wardrobe_item_mutate', { action: 'delete' }))
  checked('Wardrobe persistence, search, all image tools, metadata edits, validation and delete confirmation work')

  const byFile = (fragment) => saved.find((item) => item.fileName.includes(fragment))
  const outfitItems = [['asymmetric_top', 'top'], ['wide_leg_pants', 'bottom'], ['ankle_boots', 'shoes'], ['crossbody_bag', 'bag']]
    .flatMap(([fragment, role]) => byFile(fragment) ? [{ itemId: byFile(fragment).id, role }] : [])
  if (!outfitItems.length) outfitItems.push({ itemId: saved[0].id, role: 'top' })
  const outfit = (await call('outfit_mutate', { action: 'create', name: 'WebMCP demo outfit', items: outfitItems })).outfit
  assert.equal((await call('outfits', { action: 'get', outfitId: outfit.id })).outfit.items.length, outfitItems.length)
  await image('outfit_image', { outfitId: outfit.id })
  await assert.rejects(call('outfit_mutate', { action: 'update', outfitId: outfit.id, name: 'Updated demo outfit', items: outfitItems }))
  await call('outfit_mutate', { action: 'update', outfitId: outfit.id, name: 'Updated demo outfit', items: outfitItems, confirm: true })
  await page.screenshot({ path: join(output, 'outfit.png'), fullPage: true })
  checked('Outfit create/read/update and composed image work; composition replacement requires confirmation')

  await call('packing_plans', { action: 'new' })
  const plan = (await call('packing_plan_mutate', { action: 'create', name: 'WebMCP demo trip', startDate: '2027-01-03', endDate: '2027-01-06', itemIds: [saved[0].id], outfitIds: [outfit.id] })).plan
  await call('packing_plans', { action: 'get', planId: plan.id })
  await call('packing_plan_mutate', { action: 'update', notes: 'Updated through WebMCP' })
  await call('packing_plan_mutate', { action: 'add_items', itemIds: [saved[1]?.id ?? saved[0].id] })
  let detail = (await call('packing_plans', { action: 'get', planId: plan.id })).plan
  for (const row of detail.items) await call('packing_plan_mutate', { action: 'set_item_packed', rowId: row.id, packed: true })
  await call('packing_plan_mutate', { action: 'set_outfit_packed', rowId: detail.outfits[0].id, packed: true })
  detail = (await call('packing_plans', { action: 'get', planId: plan.id })).plan
  assert.equal(detail.status, 'packed')
  assert.equal(detail.packedCount, detail.totalCount)
  await page.screenshot({ path: join(output, 'packing.png'), fullPage: true })
  await call('packing_plan_mutate', { action: 'set_item_packed', rowId: detail.items[0].id, packed: false })
  await call('packing_plan_mutate', { action: 'remove_item', rowId: detail.items[0].id })
  await call('packing_plan_mutate', { action: 'remove_outfit', rowId: detail.outfits[0].id })
  await call('packing_plan_mutate', { action: 'add_outfits', outfitIds: [outfit.id] })
  await assert.rejects(call('packing_plan_mutate', { action: 'delete' }))
  await call('packing_plan_mutate', { action: 'delete', confirm: true })
  assert.equal((await call('packing_plans', { action: 'list' })).count, 0)
  checked('Packing create/read/update, checklist membership, packed/unpacked state and confirmed deletion work')

  await assert.rejects(call('outfit_mutate', { action: 'delete', outfitId: outfit.id }))
  await call('outfit_mutate', { action: 'delete', outfitId: outfit.id, confirm: true })
  assert.equal((await call('outfits', { action: 'list' })).count, 0)
  await call('wardrobe_items', { action: 'get', itemId: saved[0].id })
  await call('wardrobe_item_mutate', { action: 'delete', confirm: true })
  assert.equal((await call('wardrobe_items', { action: 'list' })).count, images.length - 1)
  assert.equal((await app.media.list()).objects.length, images.length - 1)
  await page.goto(`${app.origin}/app/#upload`)
  await waitTool('import_drafts')
  await page.locator('input[type=file]').setInputFiles(resolve(imageDirectory, images[0]))
  await expect.poll(async () => (await call('import_drafts', { action: 'list' })).count).toBe(1)
  const discard = (await call('import_drafts', { action: 'list' })).drafts[0]
  await call('import_drafts', { action: 'get', draftId: discard.id })
  await assert.rejects(call('import_draft_mutate', { action: 'discard' }))
  await call('import_draft_mutate', { action: 'discard', confirm: true })
  assert.equal((await call('import_drafts', { action: 'list' })).count, 0)
  assert.equal(await page.locator('[toolname], [tooldescription], [toolautosubmit]').count(), 0)
  assert.deepEqual(pageErrors, [])
  assert.deepEqual(registrationErrors, [])
  assert.deepEqual([...calls.keys()].sort(), ['sardrobe_overview', 'import_drafts', 'import_draft_image', 'import_draft_mutate', 'wardrobe_items', 'wardrobe_item_image', 'wardrobe_item_mutate', 'outfits', 'outfit_image', 'outfit_mutate', 'packing_plans', 'packing_plan_mutate'].sort())
  checked('Confirmed item deletion removes media; draft discard works; no declarative attributes or browser errors')
  report.passed = true
} catch (error) {
  report.error = error.stack
  await page?.screenshot({ path: join(output, 'failure.png'), fullPage: true }).catch(() => {})
  console.error(error)
  process.exitCode = 1
} finally {
  report.tools = Object.fromEntries(calls)
  report.pageErrors = pageErrors
  report.registrationErrors = registrationErrors
  if (report.passed) await rm(join(output, 'failure.png'), { force: true })
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2))
  await browser?.close()
  await app.close()
  console.log(`WebMCP report: ${join(output, 'report.json')}`)
}
