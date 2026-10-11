import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest'
import { chromium, type Browser, type Page } from '@playwright/test'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import type { WardrobeItem } from '../wardrobe/domain'
import type { PackingPlan } from '../packing/domain'

const item: WardrobeItem = {
  id: 'item-1', name: 'Original shirt', category: 'Tops', subcategory: 'T-shirt',
  color: 'Blue', description: 'Original description', season: 'Summer', occasion: 'Casual',
  notes: 'Keep these notes', status: 'owned', createdAt: '2026-01-01', updatedAt: '2026-01-01', media: null,
}
const plan: PackingPlan = {
  id: 'plan-1', plan: 'Original trip', startDate: '2026-06-01', endDate: '2026-06-07',
  status: 'planning', notes: 'Keep these notes', createdAt: '2026-01-01', updatedAt: '2026-01-01',
  totalCount: 1, packedCount: 0, outfitCount: 0, itemCount: 1,
  outfits: [], items: [{ id: 'row-1', packedAt: null, createdAt: '2026-01-01', item }],
}

let browser: Browser
let page: Page
let script: string
let styles: string
let errors: string[]

beforeAll(async () => {
  const output = await build({
    stdin: {
      contents: `import { createElement, useState } from 'react';
        import { Form, Select, SelectTrigger, SelectValue, Combobox } from '@sardrobe/react-components';
        import { installWebMCP } from 'webmcp-polyfill';
        import { createRoot } from 'react-dom/client';
        import { WardrobeWorkspace } from './src/features/wardrobe/WardrobeWorkspace';
        import './src/styles/app.css';
        import { ImportView } from './src/features/wardrobe/ImportView';
        import { useSardrobeWebMcpTools } from './src/features/webmcp/useSardrobeWebMcpTools';
        import { initialFormState } from './src/features/wardrobe/domain';
        import { validateWardrobeForm } from './src/components/closet/FormControls';
        function ImportFixture() {
          const [draft, setDraft] = useState({
            id: 'draft-1', file: new File(['image'], 'shirt.png', { type: 'image/png' }), fileName: 'shirt.png', fileSize: 5,
            originalUrl: null, cutout: { file: new File(['image'], 'cutout.png'), url: '', width: 10, height: 10 },
            status: location.search.includes('failed-processing') ? 'failed' : 'ready', progress: 100, failureStage: location.search.includes('failed-processing') ? 'processing' : null, message: 'Test draft', error: null,
            form: { ...initialFormState, name: 'Draft shirt', category: 'Tops', subcategory: 'T-shirt', color: 'Blue', occasion: 'Casual', season: 'Summer' },
          });
          const noop = () => {};
          useSardrobeWebMcpTools({ drafts: draft ? [draft] : [], user: { name: 'Test user' },
            revealItemEditor: noop, revealPackingEditor: noop, revealImportDraft: noop, revealImportDraftList: noop,
            revealOutfitDelete: noop, revealOutfitUpdate: noop, revealPackingPlanDelete: noop, revealPackingPlanUpdate: noop,
            removeDraft: () => setDraft(null), removeItem: noop,
          });
          return createElement(ImportView, {
            atLimit: false, limit: 100, itemCount: 0, changeDraftFilter: noop, draftFilter: 'ready', draftFilters: [],
            draftGalleryShouldScroll: false, drafts: draft ? [draft] : [], fileInputRef: { current: null },
            filteredDrafts: draft ? [draft] : [], handleFilesSelected: noop, importBusy: false,
            importMessage: '', importMessageTone: 'idle', importMobileView: 'review', importProgressValue: null, importSummaryLabel: '',
            removeDraft: () => setDraft(null), retryDraft: noop, selectedDraft: draft,
            selectedDraftCanSubmit: !!draft && draft.status === 'ready', selectedDraftHint: '', selectedDraftSubmitLabel: 'Save selected', selectedDraftTone: 'ready',
            setImportMobileView: noop, setSelectedDraftId: noop,
            updateDraftForm: (id, key, value) => setDraft(current => ({ ...current, form: { ...current.form, [key]: value } })),
            replaceDraftForm: (id, form) => { validateWardrobeForm(form); const updated = { ...draft, form }; setDraft(updated); return updated; },
            saveDraftById: async (id, { form }) => {
              validateWardrobeForm(form);
              setDraft(current => ({ ...current, status: 'saving' }));
              const response = await fetch('/api/wardrobe/items', { method: 'POST', body: JSON.stringify(form) });
              const result = await response.json();
              if (!response.ok) { setDraft(current => ({ ...current, status: 'ready' })); return null; }
              setDraft(null); return result.item;
            },
          });
        }
        function SharedControlsFixture() {
          const uncontrolled = location.search.includes('uncontrolled');
          const [color, setColor] = useState('Blue');
          const [seasons, setSeasons] = useState(['Summer']);
          const colors = ['Blue', 'Black'].map(value => ({ value, label: location.search.includes('rich') ? createElement('span', { 'data-rich-label': value }, value) : value }));
          const seasonOptions = ['Summer', 'Winter'].map(value => ({ value, label: value }));
          installWebMCP();
          useState(() => {
            document.modelContext.registerTool({ name: 'reset_component_form', description: 'Test-only native form reset.', inputSchema: { type: 'object', properties: {} }, execute: () => { document.querySelector('form').reset(); return { reset: true }; } });
          });
          return createElement(Form, { toolname: 'shared_component_form', tooldescription: 'Test the existing Select and Combobox form behavior.', toolautosubmit: '',
            onSubmit: data => ({ color: data.getAll('color'), seasons: data.getAll('seasons') }),
          },
            createElement(Select, { name: 'color', formLabel: 'Color', items: colors, value: uncontrolled ? undefined : color, defaultValue: 'Blue', onValueChange: setColor },
              createElement(SelectTrigger, { 'aria-label': 'Color' }, createElement(SelectValue))),
            createElement(Combobox.Root, { multiple: true, name: 'seasons', formLabel: 'Seasons', items: seasonOptions.map(option => option.value), value: uncontrolled ? undefined : seasons, defaultValue: ['Summer'], onValueChange: setSeasons },
              createElement(Combobox.Trigger, { 'aria-label': 'Seasons' }, seasons.join(', '))),
          );
        }
        createRoot(document.getElementById('root')).render(createElement(location.hash === '#draft' ? ImportFixture : location.hash === '#controls' ? SharedControlsFixture : WardrobeWorkspace, { user: { name: 'Test user', email: null, image: null } }));`,
      resolveDir: fileURLToPath(new URL('../../../', import.meta.url)),
    },
    jsx: 'automatic', bundle: true, write: false, outfile: 'workspace.js', format: 'iife', platform: 'browser',
    plugins: [{
      name: 'astro-test-navigation',
      setup(builder) {
        builder.onResolve({ filter: /^astro:transitions\/client$/ }, () => ({ path: 'navigation', namespace: 'test' }))
        builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export function navigate() { throw new Error("Navigation is outside this form test"); }' }))
      },
    }],
    define: {
      'import.meta.url': '"http://localhost:4199/"', 'import.meta.env': '{}', 'process.env.NODE_ENV': '"production"',
      '__BACKGROUND_ONNX_RUNTIME_VERSION__': '"test"', '__TRANSFORMERS_VERSION__': '"test"',
    },
  })
  script = output.outputFiles.find((file) => file.path.endsWith('.js'))!.text
  styles = output.outputFiles.find((file) => file.path.endsWith('.css'))!.text
  browser = await chromium.launch({ headless: true, args: ['--disable-features=WebMCP'] })
})
afterAll(async () => { await browser?.close() })

beforeEach(async () => {
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('http://localhost:4199/**', (route) => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }))
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname
    const body = path === '/api/wardrobe/items' ? { items: [item] }
      : path === '/api/wardrobe/items/item-1' ? { item }
      : path === '/api/outfits' ? { outfits: [] }
      : path === '/api/packing-plans' ? { plans: [plan] }
      : path === '/api/packing-plans/plan-1' ? { plan }
      : { error: 'Unexpected test API request' }
    return route.fulfill({ json: body })
  })
  await page.goto('http://localhost:4199/#upload')
  await page.addStyleTag({ content: styles })
  await page.addScriptTag({ content: script })
  await waitForTool(page, 'wardrobe_items')
})
afterEach(async () => { await page.close(); expect(errors).toEqual([]) })

async function waitForTool(page: Page, name: string) {
  await expect.poll(() => page.evaluate(async (name) => Boolean((await document.modelContext?.getTools())?.some((tool) => tool.name === name)), name), { timeout: 5000 }).toBe(true)
}
async function callTool(page: Page, name: string, input: Record<string, unknown> = {}) {
  return page.evaluate(async ({ name, input }) => {
    const context = document.modelContext!
    const tool = (await context.getTools()).find((tool) => tool.name === name)
    if (!tool) throw new Error(`Missing tool ${name}`)
    return JSON.parse(await context.executeTool(tool, input))
  }, { name, input })
}
async function openItem() {
  await callTool(page, 'wardrobe_items', { action: 'get', itemId: item.id })
  await waitForTool(page, 'wardrobe_item_mutate')
}
async function openPlan() {
  await callTool(page, 'packing_plans', { action: 'get', planId: plan.id })
  await waitForTool(page, 'packing_plan_mutate')
}
async function updateItem(page: Page, fields: Record<string, unknown>) {
  await openItem()
  return callTool(page, 'wardrobe_item_mutate', { action: 'update', ...fields })
}
async function updatePlan(page: Page, fields: Record<string, unknown>) {
  await openPlan()
  return callTool(page, 'packing_plan_mutate', { action: 'update', ...fields })
}

test('upload and review panels remain side by side at desktop width', async () => {
  const layout = await page.evaluate(() => {
    const gallery = document.querySelector('.closet-imports')!.getBoundingClientRect()
    const editor = document.querySelector('.closet-draft-editor')!.getBoundingClientRect()
    return { galleryTop: gallery.top, editorTop: editor.top, galleryRight: gallery.right, editorLeft: editor.left }
  })
  expect(layout.editorTop).toBeCloseTo(layout.galleryTop, 0)
  expect(layout.editorLeft).toBeGreaterThanOrEqual(layout.galleryRight)
})

test('actual forms expose flat schemas under the original mutation names', async () => {
  await openItem()
  const schemas = await page.evaluate(async () => Object.fromEntries((await document.modelContext!.getTools()).map((tool) => [tool.name, tool.inputSchema])))
  expect(schemas.wardrobe_item_mutate).toMatchObject({ properties: {
    action: { enum: expect.arrayContaining(['update', 'delete']) },
    name: { type: 'string' }, category: { enum: expect.arrayContaining(['Outerwear']) },
    subcategory: { enum: expect.arrayContaining(['Jacket']) }, season: { type: 'array' }, occasion: { type: 'array' }, confirm: { type: 'boolean' },
  } })
  expect(schemas.wardrobe_item_mutate).not.toHaveProperty('properties.fields')
  expect(await page.locator('form[toolname="wardrobe_item_mutate"]').count()).toBe(1)
  expect(Object.keys(schemas).some((name) => name.includes('editor') || name === 'sardrobe_form_submit')).toBe(false)
  await openPlan()
  const packing = await page.evaluate(async () => (await document.modelContext!.getTools()).find((tool) => tool.name === 'packing_plan_mutate')!.inputSchema)
  expect(packing).toMatchObject({ properties: { action: { enum: expect.arrayContaining(['create', 'update', 'delete', 'set_item_packed']) }, itemIds: { type: 'array' }, packed: { type: 'boolean' } } })
})

test('item form fills controlled fields, changes category/subcategory together and clears multi-selects', async () => {
  const requests: Record<string, unknown>[] = []
  await page.route('**/api/wardrobe/items/item-1', async (route) => {
    if (route.request().method() !== 'PATCH') return route.fulfill({ json: { item } })
    const body = route.request().postDataJSON()
    requests.push(body)
    await route.fulfill({ json: { item: { ...item, ...body } } })
  })
  const result = await updateItem(page, { name: 'Winter jacket', category: 'Outerwear', subcategory: 'Jacket', color: 'Black', season: ['Winter'], occasion: [], description: 'New description' })
  expect(result.kind).toBe('wardrobe.item_updated')
  expect(requests).toEqual([{ name: 'Winter jacket', category: 'Outerwear', subcategory: 'Jacket', color: 'Black', season: 'Winter', occasion: '', description: 'New description', notes: 'Keep these notes' }])
  expect(await page.getByRole('heading', { name: 'Winter jacket', exact: true }).isVisible()).toBe(true)
  expect(await page.getByRole('combobox', { name: 'Category', exact: true }).textContent()).toContain('Outerwear')
})


test('invalid item category pairs and failed saves reject without reporting success', async () => {
  let requests = 0
  await page.route('**/api/wardrobe/items/item-1', (route) => {
    if (route.request().method() !== 'PATCH') return route.fulfill({ json: { item } })
    requests++
    return route.fulfill({ status: 500, json: { error: 'Save failed' } })
  })
  await expect(updateItem(page, { category: 'Tops', subcategory: 'Jacket' })).rejects.toThrow()
  expect(requests).toBe(0)
  await expect(updateItem(page, { subcategory: 'T-shirt', notes: 'Changed' })).rejects.toThrow()
  expect(requests).toBe(1)
})


test('packing form preserves omitted metadata and checklist membership', async () => {
  let saved: Record<string, unknown> | null = null
  await page.route('**/api/packing-plans/plan-1', (route) => {
    if (route.request().method() !== 'PATCH') return route.fulfill({ json: { plan } })
    saved = route.request().postDataJSON()
    return route.fulfill({ json: { plan: { ...plan, ...saved } } })
  })
  expect(await updatePlan(page, { name: 'Renamed trip' })).toMatchObject({ kind: 'packing.updated', plan: { plan: 'Renamed trip', items: [{ id: 'row-1' }] } })
  expect(saved).toEqual({ plan: 'Renamed trip', startDate: '2026-06-01', endDate: '2026-06-07', status: 'planning', notes: 'Keep these notes' })
})


test('packing rejects reversed dates and failed saves', async () => {
  let requests = 0
  await page.route('**/api/packing-plans/plan-1', (route) => {
    if (route.request().method() !== 'PATCH') return route.fulfill({ json: { plan } })
    requests++
    return route.fulfill({ status: 500, json: { error: 'Temporary failure' } })
  })
  await expect(updatePlan(page, { startDate: '2026-07-05', endDate: '2026-07-01' })).rejects.toThrow()
  expect(requests).toBe(0)
  await expect(updatePlan(page, { endDate: '2026-07-10' })).rejects.toThrow()
  expect(requests).toBe(1)
})


test('new-plan selection survives a delayed initial packing-list response', async () => {
  let release!: () => void
  let started = false
  let saved: Record<string, unknown> | null = null
  await page.route('**/api/packing-plans', async (route) => {
    if (route.request().method() === 'POST') {
      saved = route.request().postDataJSON()
      return route.fulfill({ json: { plan: { ...plan, ...saved, plan: (saved as Record<string, unknown>).plan, id: 'new-plan' } } })
    }
    started = true
    await new Promise<void>((resolve) => { release = resolve })
    return route.fulfill({ json: { plans: [plan] } })
  })
  await callTool(page, 'packing_plans', { action: 'new' })
  await expect.poll(() => started).toBe(true)
  release()
  await waitForTool(page, 'packing_plan_mutate')
  expect(await callTool(page, 'packing_plan_mutate', { action: 'create', name: 'New trip', itemIds: [item.id] })).toMatchObject({ kind: 'packing.created', plan: { id: 'new-plan' } })
  expect(saved).toMatchObject({ itemIds: [item.id] })
  await expect.poll(() => page.getByRole('button', { name: /New trip.*packed.*Planning/ }).isVisible()).toBe(true)
  expect(await page.getByRole('heading', { name: 'New trip', exact: true }).isVisible()).toBe(true)
})



for (const kind of ['item', 'packing'] as const) {
  test(`${kind} declarative form keeps its schema stable during a save`, async () => {
    let release!: () => void
    let started = false
    const path = kind === 'item' ? '**/api/wardrobe/items/item-1' : '**/api/packing-plans/plan-1'
    await page.route(path, async (route) => {
      if (route.request().method() !== 'PATCH') return route.fulfill({ json: kind === 'item' ? { item } : { plan } })
      started = true
      const body = route.request().postDataJSON()
      await new Promise<void>((resolve) => { release = resolve })
      await route.fulfill({ json: kind === 'item' ? { item: { ...item, ...body } } : { plan: { ...plan, ...body } } })
    })
    if (kind === 'item') await openItem()
    else await openPlan()
    const name = kind === 'item' ? 'wardrobe_item_mutate' : 'packing_plan_mutate'
    const schema = () => page.evaluate(async (name) => (await document.modelContext!.getTools()).find((tool) => tool.name === name)!.inputSchema, name)
    const before = await schema()
    const saving = callTool(page, name, { action: 'update', notes: 'Delayed save' })
    await expect.poll(() => started).toBe(true)
    try {
      expect(await schema()).toEqual(before)
      await expect(callTool(page, name, { action: 'update', notes: 'Overlapping save' })).rejects.toThrow()
    } finally { release() }
    expect(await saving).toMatchObject({ kind: kind === 'item' ? 'wardrobe.item_updated' : 'packing.updated' })
    expect(await page.evaluate(async () => (await document.modelContext!.getTools()).some((tool) => tool.name === 'sardrobe_form_submit'))).toBe(false)
  })
}

test('read tools select forms and declarative mutations save without UI input', async () => {
  await page.route('**/api/wardrobe/items/item-1', (route) => {
    const body = route.request().method() === 'PATCH' ? route.request().postDataJSON() : {}
    return route.fulfill({ json: { item: { ...item, ...body } } })
  })
  await page.route('**/api/packing-plans/plan-1', (route) => {
    const body = route.request().method() === 'PATCH' ? route.request().postDataJSON() : {}
    return route.fulfill({ json: { plan: { ...plan, ...body } } })
  })
  expect(await updateItem(page, { name: 'Renamed shirt' })).toMatchObject({ kind: 'wardrobe.item_updated', item: { name: 'Renamed shirt' } })
  expect(await updatePlan(page, { notes: 'Tools-only update' })).toMatchObject({ kind: 'packing.updated' })
  expect(await page.locator('form[toolname="wardrobe_item_mutate"]').count()).toBe(0)
  expect(await updateItem(page, { notes: 'Back to wardrobe' })).toMatchObject({ kind: 'wardrobe.item_updated' })
  expect(await page.locator('form[toolname="packing_plan_mutate"]').count()).toBe(0)
})

async function openDraftFixture(query = '') {
  await page.goto(`http://localhost:4199/?fixture=draft${query}#draft`)
  await page.addStyleTag({ content: styles })
  await page.addScriptTag({ content: script })
  await waitForTool(page, 'import_draft_mutate')
}

test('draft mutation edits locally and the same form saves all submitted details in one call', async () => {
  let saved: Record<string, unknown> | undefined
  await page.route('**/api/wardrobe/items', (route) => {
    saved = route.request().postDataJSON()
    return route.fulfill({ json: { item: { ...item, ...saved, id: 'saved-draft' } } })
  })
  await openDraftFixture()
  expect(await page.locator('form').count()).toBe(1)
  expect(await page.getByRole('button', { name: 'Save selected', exact: true }).getAttribute('type')).toBe('submit')
  expect(await callTool(page, 'import_draft_mutate', { action: 'update', name: 'Edited draft', occasion: [] })).toMatchObject({ kind: 'imports.draft_updated', fields: { name: 'Edited draft', occasion: '' } })
  expect(saved).toBeUndefined()
  await expect(callTool(page, 'import_draft_mutate', { action: 'submit', confirm: false })).rejects.toThrow()
  expect(saved).toBeUndefined()
  expect(await callTool(page, 'import_draft_mutate', { confirm: true, color: 'Black', notes: 'Saved together' })).toMatchObject({ kind: 'imports.draft_submitted', itemId: 'saved-draft' })
  expect(saved).toMatchObject({ name: 'Edited draft', occasion: '', color: 'Black', notes: 'Saved together', season: 'Summer' })
  expect(await callTool(page, 'import_drafts', { action: 'list' })).toMatchObject({ count: 0 })
})

test('failed draft saves require confirmation again and can retry using the same form', async () => {
  let attempts = 0
  await page.route('**/api/wardrobe/items', (route) => {
    attempts++
    return attempts === 1 ? route.fulfill({ status: 500, json: { error: 'Failed' } }) : route.fulfill({ json: { item } })
  })
  await openDraftFixture()
  await expect(callTool(page, 'import_draft_mutate', { action: 'submit', confirm: true })).rejects.toThrow()
  await expect(callTool(page, 'import_draft_mutate', { action: 'submit' })).rejects.toThrow()
  expect(attempts).toBe(1)
  expect(await callTool(page, 'import_draft_mutate', { action: 'submit', confirm: true })).toMatchObject({ kind: 'imports.draft_submitted', itemId: item.id })
  expect(attempts).toBe(2)
})

for (const uncontrolled of [false, true]) {
  test(`shared Select and Combobox support ${uncontrolled ? 'uncontrolled' : 'controlled'} form values, clearing, and reset`, async () => {
    await page.goto(`http://localhost:4199/?fixture=controls${uncontrolled ? '&uncontrolled' : ''}#controls`)
    await page.addScriptTag({ content: script })
    await waitForTool(page, 'shared_component_form')
    expect(await callTool(page, 'shared_component_form', { color: 'Black', seasons: ['Winter'] })).toEqual({ color: ['Black'], seasons: ['Winter'] })
    expect(await page.getByRole('combobox', { name: 'Color', exact: true }).textContent()).toContain('Black')
    expect(await callTool(page, 'shared_component_form', { seasons: [] })).toEqual({ color: ['Black'], seasons: [] })
    await callTool(page, 'reset_component_form')
    expect(await callTool(page, 'shared_component_form')).toEqual({ color: ['Blue'], seasons: ['Summer'] })
  })
}

test('item form keeps deletion confirmation and returns deletion only after the API succeeds', async () => {
  let deletions = 0
  await page.route('**/api/wardrobe/items/item-1', (route) => {
    if (route.request().method() !== 'DELETE') return route.fulfill({ json: { item } })
    deletions++
    return route.fulfill({ json: { deleted: true } })
  })
  await openItem()
  await expect(callTool(page, 'wardrobe_item_mutate', { action: 'delete', confirm: false })).rejects.toThrow()
  expect(deletions).toBe(0)
  expect(await callTool(page, 'wardrobe_item_mutate', { action: 'delete', confirm: true })).toEqual({ kind: 'wardrobe.item_deleted', itemId: item.id })
  expect(deletions).toBe(1)
})

test('packing form changes checklist rows and retains confirmed deletion without separate tools', async () => {
  let deletions = 0
  let packedBody: unknown
  await page.route('**/api/packing-plans/plan-1/items/row-1', (route) => {
    packedBody = route.request().postDataJSON()
    return route.fulfill({ json: { plan: { ...plan, status: 'packed', packedCount: 1, items: [{ ...plan.items[0], packedAt: '2026-10-11' }] } } })
  })
  await page.route('**/api/packing-plans/plan-1', (route) => {
    if (route.request().method() === 'DELETE') { deletions++; return route.fulfill({ json: { deleted: true } }) }
    return route.fulfill({ json: { plan } })
  })
  await openPlan()
  expect(await callTool(page, 'packing_plan_mutate', { action: 'set_item_packed', rowId: 'row-1', packed: true })).toMatchObject({ kind: 'packing.item_packed', plan: { status: 'packed' } })
  expect(packedBody).toEqual({ packed: true })
  await expect(callTool(page, 'packing_plan_mutate', { action: 'delete', confirm: false })).rejects.toThrow()
  expect(deletions).toBe(0)
  expect(await callTool(page, 'packing_plan_mutate', { action: 'delete', confirm: true })).toEqual({ kind: 'packing.deleted', planId: plan.id })
  expect(deletions).toBe(1)
})

test('draft discard uses its existing form and requires confirmation', async () => {
  await openDraftFixture()
  await expect(callTool(page, 'import_draft_mutate', { action: 'discard' })).rejects.toThrow()
  expect(await callTool(page, 'import_drafts', { action: 'list' })).toMatchObject({ count: 1 })
  expect(await callTool(page, 'import_draft_mutate', { action: 'discard', confirm: true })).toEqual({ kind: 'imports.draft_discarded', draftId: 'draft-1' })
  expect(await callTool(page, 'import_drafts', { action: 'list' })).toMatchObject({ count: 0 })
})

for (const action of ['add_items', 'add_outfits', 'remove_item', 'remove_outfit', 'set_item_packed', 'set_outfit_packed']) {
  test(`packing form executes ${action} using its native parameters`, async () => {
    const extraItem = { ...item, id: 'item-2', name: 'Extra item' }
    const outfit = { id: 'outfit-1', name: 'Outfit', category: null, source: null, description: null, stylingFormula: null, occasion: null, season: null, status: 'saved', notes: null, createdAt: '2026-01-01', updatedAt: '2026-01-01', items: [] }
    const fixture = { ...plan, totalCount: 2, outfitCount: 1, outfits: [{ id: 'outfit-row', packedAt: null, createdAt: '2026-01-01', outfit }] }
    let request: { method: string; body: unknown; path: string } | undefined
    await page.route('**/api/wardrobe/items/item-2', (route) => route.fulfill({ json: { item: extraItem } }))
    await page.route('**/api/outfits', (route) => route.fulfill({ json: { outfits: [outfit] } }))
    await page.route('**/api/packing-plans/plan-1', (route) => route.fulfill({ json: { plan: fixture } }))
    await page.route('**/api/packing-plans/plan-1/**', (route) => {
      request = { method: route.request().method(), body: route.request().method() === 'DELETE' ? null : route.request().postDataJSON(), path: new URL(route.request().url()).pathname }
      return route.fulfill({ json: { plan: fixture } })
    })
    await callTool(page, 'wardrobe_items', { action: 'get', itemId: extraItem.id })
    await openPlan()
    const input = action === 'add_items' ? { itemIds: ['item-2'] } : action === 'add_outfits' ? { outfitIds: ['outfit-1'] } : { rowId: action.includes('outfit') ? 'outfit-row' : 'row-1', ...(action.startsWith('set_') ? { packed: false } : {}) }
    const result = await callTool(page, 'packing_plan_mutate', { action, ...input })
    expect(result.plan.id).toBe(plan.id)
    expect(request?.method).toBe(action.startsWith('add_') ? 'POST' : action.startsWith('remove_') ? 'DELETE' : 'PATCH')
    if (action === 'add_items') expect(request?.body).toEqual({ itemIds: ['item-2'] })
    if (action === 'add_outfits') expect(request?.body).toEqual({ outfitIds: ['outfit-1'] })
    if (action.startsWith('set_')) expect(request?.body).toEqual({ packed: false })
    expect(request?.path).toContain(action.includes('outfit') ? '/outfits' : '/items')
  })
}

for (const fields of [
  { name: ' ' }, { category: 'Invented' }, { color: 'Invented' },
  { category: 'Tops', subcategory: 'Jacket' }, { season: ['Invented'] }, { occasion: ['Invented'] },
]) {
  test(`item tool rejects invalid fields ${JSON.stringify(fields)} before saving`, async () => {
    let requests = 0
    await page.route('**/api/wardrobe/items/item-1', (route) => {
      if (route.request().method() !== 'PATCH') return route.fulfill({ json: { item } })
      requests++
      return route.fulfill({ json: { item } })
    })
    await expect(updateItem(page, fields)).rejects.toThrow()
    expect(requests).toBe(0)
  })
}

for (const startDate of ['2026-02-30', '2026-13-01', 'not-a-date']) {
  test(`packing tool rejects invalid calendar date ${startDate} before saving`, async () => {
    let requests = 0
    await page.route('**/api/packing-plans/plan-1', (route) => {
      if (route.request().method() !== 'PATCH') return route.fulfill({ json: { plan } })
      requests++
      return route.fulfill({ json: { plan } })
    })
    await expect(updatePlan(page, { startDate })).rejects.toThrow()
    expect(requests).toBe(0)
  })
}

test('item tool clears optional fields and arrays while retaining required and system-managed values', async () => {
  let saved: unknown
  await page.route('**/api/wardrobe/items/item-1', (route) => {
    if (route.request().method() !== 'PATCH') return route.fulfill({ json: { item } })
    saved = route.request().postDataJSON()
    return route.fulfill({ json: { item: { ...item, ...route.request().postDataJSON() } } })
  })
  const result = await updateItem(page, { subcategory: '', color: '', description: '', notes: '', season: [], occasion: [] })
  expect(saved).toEqual({ name: item.name, category: item.category, subcategory: '', color: '', description: '', notes: '', season: '', occasion: '' })
  expect(result.item.status).toBe('owned')
})

test('draft edits preserve multi-select values when their controls are not rendered', async () => {
  await openDraftFixture('&failed-processing')
  expect(await page.locator('select[name="season"]').count()).toBe(0)
  const result = await callTool(page, 'import_draft_mutate', { action: 'update', name: 'Renamed failed draft' })
  expect(result.fields).toMatchObject({ name: 'Renamed failed draft', category: 'Tops', season: 'Summer', occasion: 'Casual' })
})

test('packing form rejects a blank plan name before saving', async () => {
  let requests = 0
  await page.route('**/api/packing-plans/plan-1', (route) => {
    if (route.request().method() !== 'PATCH') return route.fulfill({ json: { plan } })
    requests++
    return route.fulfill({ json: { plan } })
  })
  await expect(updatePlan(page, { name: ' ' })).rejects.toThrow()
  expect(requests).toBe(0)
})

test('native option labels do not mount rich React labels outside the visible control', async () => {
  await page.goto('http://localhost:4199/?fixture=controls&rich#controls')
  await page.addScriptTag({ content: script })
  await waitForTool(page, 'shared_component_form')
  expect(await page.locator('[data-rich-label="Black"]').count()).toBe(0)
  expect(await callTool(page, 'shared_component_form', { color: 'Black' })).toEqual({ color: ['Black'], seasons: ['Summer'] })
  expect(await page.locator('[data-rich-label="Black"]').count()).toBe(1)
})
