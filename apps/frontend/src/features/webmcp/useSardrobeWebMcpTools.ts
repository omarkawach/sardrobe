import { useEffect, useRef } from 'react'
import { installWebMCP } from 'webmcp-polyfill'
import { fetchWardrobeItem, fetchWardrobeItems } from '../wardrobe/api'
import {
  OCCASIONS,
  SEASONS,
  arrayToCsv,
  csvToArray,
  type ImportDraft,
  type ImportDraftStatus,
  type WardrobeItem,
  type WardrobeFormState,
} from '../wardrobe/domain'
import { draftImageUrl } from '../wardrobe/import-processing'
import { createOutfit, deleteOutfit, listOutfits, updateOutfit } from '../outfits/api'
import { clampUnit, legacyPositionFor, wardrobeCategoryToRole, type CreateOutfitItemPayload, type CreateOutfitPayload, type Outfit, type OutfitItem, type OutfitRole } from '../outfits/domain'
import { fetchPackingPlan, listPackingPlans } from '../packing/api'
import type { PackingPlan } from '../packing/domain'
import type { WorkspaceUser } from '../wardrobe/WorkspaceNavigation'

type UseSardrobeWebMcpToolsOptions = {
  drafts: ImportDraft[]
  revealItemEditor: (item: WardrobeItem) => void
  revealPackingEditor: (plan: PackingPlan | null) => void
  revealImportDraft: (draftId: string) => void
  revealOutfitDelete: (outfitId: string) => void
  revealOutfitUpdate: (outfit: Outfit, mode: 'created' | 'updated') => void
  user: WorkspaceUser
}

const outfitRoles: readonly OutfitRole[] = ['top', 'bottom', 'outerwear', 'shoes', 'bag', 'belt', 'accessories']

const agentOutfitZIndex: Record<OutfitRole, number> = {
  bag: 0,
  bottom: 100,
  shoes: 200,
  outerwear: 250,
  top: 300,
  belt: 500,
  accessories: 600,
}

// Status filter values for the import_drafts schema, kept in sync with
// ImportDraftStatus in wardrobe/domain.ts. Typing the entries as
// ImportDraftStatus makes a removed or renamed status a compile error here;
// when adding a new status to the union, add it to this list too.
const importDraftStatuses: readonly ImportDraftStatus[] = ['queued', 'processing', 'ready', 'failed', 'saving']

const imageFormats = ['image/webp', 'image/jpeg', 'image/png'] as const
type ImageFormat = (typeof imageFormats)[number]

// Registers Sardrobe against native WebMCP when available, installing the
// polyfill first in secure browsers that do not expose document.modelContext.
//
// Rules of Hooks: each tool is its own useWebMcpTool call in a fixed order. Handlers
// read live app state through optionsRef so the closures never go stale, while
// the tool list itself stays static across renders.
export function useSardrobeWebMcpTools(options: UseSardrobeWebMcpToolsOptions) {
  const optionsRef = useRef(options)
  optionsRef.current = options
  const get = () => optionsRef.current

  // --- Wardrobe ---

  useWebMcpTool({
    name: 'wardrobe_items',
    title: 'Read wardrobe items',
    description:
      'Read closet items. action "list" returns all items the signed-in user owns (with optional search and a metadata-gap filter); action "get" returns one item by id. Output carries metadata provenance, derived roles, media references, and metadata gaps. Getting an item also opens its details; discover wardrobe_item_mutate to change it through the form. To see an item visually, call wardrobe_item_image.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'get'], description: 'list = all items; get = one item by id.' },
        itemId: { type: 'string', description: 'Required for action "get".' },
        query: { type: 'string', description: 'list only: case-insensitive search across name, category, subcategory, color, description, occasion, season, and notes.' },
        missingOnly: { type: 'boolean', description: 'list only: when true, only return items with metadata gaps.' },
        limit: { type: 'number', description: 'list only: maximum items to return. Defaults to 100.' },
      },
      required: ['action'],
      additionalProperties: false,
    } as const,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    handler: async (args) => {
      const action = readAction(args, ['list', 'get'] as const)

      if (action === 'get') {
        const item = await fetchWardrobeItem(requiredString(args.itemId, 'itemId'))
        get().revealItemEditor(item)
        return { kind: 'wardrobe.item_detail', item: serializeAgentWardrobeItem(item) }
      }

      const query = optionalString(args.query).toLowerCase()
      const limit = boundedLimit(args.limit, 100, 500)
      const missingOnly = args.missingOnly === true

      const items = await fetchWardrobeItems()
      if (!items) throw new ToolCallError('Could not load wardrobe items.', 'request_failed')

      const filtered = items
        .filter((item) => !query || searchableItemText(item).includes(query))
        .map(serializeAgentWardrobeItem)
        .filter((item) => !missingOnly || item.metadataGaps.length > 0)
        .slice(0, limit)

      return { kind: 'wardrobe.item_list', authenticatedUser: safeUser(get().user), count: filtered.length, items: filtered }
    },
  })

  // The image tools return MCP-compatible content blocks so browser agents can
  // inspect authenticated or browser-local images without public image URLs.
  useImageTools(get)


  // --- Import drafts (browser-local) ---

  useWebMcpTool({
    name: 'import_drafts',
    title: 'Read import drafts',
    description:
      'Read browser-local import drafts (in-progress uploads for the current tab session). action "list" returns all drafts (optionally filtered by status); action "get" returns one draft by id with image references, processing errors, editable metadata, save readiness, and metadata gaps. Getting a draft also opens its form; discover import_draft_mutate to edit, save, or discard it. To see a draft visually, call import_draft_image (the draft image URLs are browser-local and not viewable as plain references).',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'get'], description: 'list = all drafts; get = one draft by id.' },
        draftId: { type: 'string', description: 'Required for action "get".' },
        status: { type: 'string', enum: importDraftStatuses, description: 'list only: optional status filter.' },
      },
      required: ['action'],
      additionalProperties: false,
    } as const,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    handler: (args) => {
      const action = readAction(args, ['list', 'get'] as const)

      if (action === 'get') {
        const draftId = requiredString(args.draftId, 'draftId')
        const draft = get().drafts.find((candidate) => candidate.id === draftId)
        if (!draft) throw new ToolCallError('Import draft not found in this browser session.', 'not_found')
        get().revealImportDraft(draftId)
        return { kind: 'imports.draft_detail', draft: serializeAgentImportDraft(draft) }
      }

      const status = optionalString(args.status)
      const drafts = get()
        .drafts.filter((draft) => !status || draft.status === status)
        .map(serializeAgentImportDraft)
      return { kind: 'imports.draft_list', count: drafts.length, drafts }
    },
  })


  // --- Outfits ---

  useWebMcpTool({
    name: 'outfits',
    title: 'Read outfits',
    description: 'Read saved outfits. action "list" returns all outfits; action "get" returns one by id. Output includes item ids, roles, placement metadata, outfit metadata, gaps, and same-origin media URLs. To see the composed look, call outfit_image.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'get'], description: 'list = all outfits; get = one outfit by id.' },
        outfitId: { type: 'string', description: 'Required for action "get".' },
      },
      required: ['action'],
      additionalProperties: false,
    } as const,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    handler: async (args) => {
      const action = readAction(args, ['list', 'get'] as const)

      if (action === 'get') {
        const outfitId = requiredString(args.outfitId, 'outfitId')
        const payload = await requestJson<{ outfit: Outfit }>(`/api/outfits/${encodeURIComponent(outfitId)}`)
        return { kind: 'outfits.detail', outfit: serializeAgentOutfit(payload.outfit) }
      }

      const outfits = await listOutfits()
      if ('error' in outfits) throw new ToolCallError(outfits.error, 'request_failed')
      return { kind: 'outfits.list', count: outfits.length, outfits: outfits.map(serializeAgentOutfit) }
    },
  })

  useWebMcpTool({
    name: 'outfit_mutate',
    title: 'Change an outfit',
    description:
      'Create, update, or delete an outfit. action "create" and "update" save directly; update replaces the whole item composition, so replacing a non-empty outfit requires confirm: true. action "delete" requires confirm: true. items is the full composition: each entry needs itemId (one of your wardrobe items) and role (one of the outfit roles); placement (x, y, scale, rotation, zIndex) is optional and defaults to a sensible layout. occasion and season are arrays of allowed values. Returns the saved outfit.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'update', 'delete'], description: 'create = new outfit; update = replace fields and composition; delete = remove.' },
        outfitId: { type: 'string', description: 'Required for "update" and "delete".' },
        name: { type: 'string', description: 'Outfit name (required for create/update).' },
        description: { type: 'string' },
        notes: { type: 'string' },
        occasion: { type: 'array', items: { type: 'string', enum: OCCASIONS }, description: 'Zero or more occasions from the allowed list.' },
        season: { type: 'array', items: { type: 'string', enum: SEASONS }, description: 'Zero or more seasons from the allowed list.' },
        items: {
          type: 'array',
          description: 'Full outfit composition. Replaces the existing items on update. At least one item is required for create/update. Omit placement fields to use Sardrobe role-aware flat-lay defaults.',
          items: {
            type: 'object',
            properties: {
              itemId: { type: 'string', description: 'A wardrobe item ID you own.' },
              role: { type: 'string', enum: outfitRoles, description: 'Outfit role for this piece.' },
              x: { type: 'number', description: 'Optional normalized 0..1 horizontal center. Omit for a role-aware default.' },
              y: { type: 'number', description: 'Optional normalized 0..1 vertical center. Omit for a role-aware default.' },
              scale: { type: 'number', description: 'Optional scale multiplier (default 1).' },
              rotation: { type: 'number', description: 'Optional rotation in degrees (default 0).' },
              zIndex: { type: 'number', description: 'Optional stacking order. Omit for Sardrobe default layering.' },
            },
            required: ['itemId', 'role'],
            additionalProperties: false,
          },
        },
        confirm: { type: 'boolean', description: 'Required true for delete and for replacing a non-empty outfit composition.' },
      },
      required: ['action'],
      additionalProperties: false,
    } as const,
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    handler: async (args) => {
      const action = readAction(args, ['create', 'update', 'delete'] as const)

      if (action === 'delete') {
        const outfitId = requiredString(args.outfitId, 'outfitId')
        if (args.confirm !== true) throw new ToolCallError('Set confirm: true to delete this outfit.', 'confirmation_required')
        const result = await deleteOutfit(outfitId)
        if ('error' in result) throw new ToolCallError(result.error, 'request_failed')
        get().revealOutfitDelete(outfitId)
        return { kind: 'outfits.deleted', outfitId }
      }

      const payload = buildOutfitPayload(args)

      if (action === 'create') {
        const created = await createOutfit(payload)
        if ('error' in created) throw new ToolCallError(created.error, 'request_failed')
        get().revealOutfitUpdate(created, 'created')
        return { kind: 'outfits.created', outfit: serializeAgentOutfit(created) }
      }

      // update: replacing a non-empty composition is effectively destructive of
      // the prior layout, so gate it behind confirm.
      const outfitId = requiredString(args.outfitId, 'outfitId')
      const existing = await requestJson<{ outfit: Outfit }>(`/api/outfits/${encodeURIComponent(outfitId)}`)
      if (existing.outfit.items.length > 0 && args.confirm !== true) {
        throw new ToolCallError('This outfit already has items; set confirm: true to replace its composition.', 'confirmation_required')
      }

      const updated = await updateOutfit(outfitId, payload)
      if ('error' in updated) throw new ToolCallError(updated.error, 'request_failed')
      get().revealOutfitUpdate(updated, 'updated')
      return { kind: 'outfits.updated', outfit: serializeAgentOutfit(updated) }
    },
  })

  // --- Packing plans ---

  useWebMcpTool({
    name: 'packing_plans',
    title: 'Read packing plans',
    description: 'Read packing plans. action "list" returns plan summaries with checklist counts, dates, status, and notes; action "get" returns one plan by id with outfit rows, wardrobe item rows, packed state, and same-origin media URLs. Getting a plan opens its form. action "new" opens an unsaved form without creating a record. Discover packing_plan_mutate to save metadata or change its checklist.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'get', 'new'], description: 'list = all plans; get = one plan by id and open its form; new = open an unsaved packing plan form.' },
        planId: { type: 'string', description: 'Required for action "get".' },
      },
      required: ['action'],
      additionalProperties: false,
    } as const,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    handler: async (args) => {
      const action = readAction(args, ['list', 'get', 'new'] as const)

      if (action === 'new') {
        get().revealPackingEditor(null)
        return { kind: 'packing.new_plan', tool: 'packing_plan_mutate' }
      }

      if (action === 'get') {
        const plan = await fetchPackingPlan(requiredString(args.planId, 'planId'))
        if ('error' in plan) throw new ToolCallError(plan.error, 'request_failed')
        get().revealPackingEditor(plan)
        return {
          kind: 'packing.plan_detail',
          plan: {
            ...plan,
            outfits: plan.outfits.map((row) => ({ ...row, outfit: serializeAgentOutfit(row.outfit) })),
            items: plan.items.map((row) => ({ ...row, item: serializeAgentWardrobeItem(row.item) })),
          },
        }
      }

      const plans = await listPackingPlans()
      if ('error' in plans) throw new ToolCallError(plans.error, 'request_failed')
      return { kind: 'packing.plan_list', count: plans.length, plans }
    },
  })

}

type SardrobeWebMcpTool = Omit<WebMCP.ModelContextTool, 'execute'> & {
  handler: WebMCP.ToolExecuteCallback
}

// WebMCP unregisters tools when the registration signal is aborted. Keeping the
// handler in a ref lets each static tool definition read current React state.
function useWebMcpTool({ handler, ...definition }: SardrobeWebMcpTool) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler
  const definitionRef = useRef(definition)

  useEffect(() => {
    installWebMCP()
    const modelContext = document.modelContext
    if (!modelContext) return undefined

    const controller = new AbortController()
    const tool: WebMCP.ModelContextTool = {
      ...definitionRef.current,
      execute: (args, options) => handlerRef.current(args, options),
    }

    void modelContext.registerTool(tool, { signal: controller.signal }).catch((error) => {
      if (!controller.signal.aborted) console.warn(`Could not register WebMCP tool ${tool.name}.`, error)
    })

    return () => controller.abort()
  }, [])
}

const imageToolInputSchema = {
  type: 'object',
  properties: {
    itemId: { type: 'string', description: 'Wardrobe item ID.' },
    maxWidth: { type: 'number', description: 'Longest-edge downscale target in pixels. Defaults to 768; capped at 2048. The image is only scaled down, never up.' },
    format: { type: 'string', enum: imageFormats, description: 'Output image MIME type. Defaults to image/webp.' },
  },
  required: ['itemId'],
  additionalProperties: false,
} as const

const outfitImageToolInputSchema = {
  type: 'object',
  properties: {
    outfitId: { type: 'string', description: 'Outfit ID.' },
    maxWidth: { type: 'number', description: 'Canvas width in pixels (height is 1.25x for a 4:5 portrait). Defaults to 768; capped at 1536.' },
    format: { type: 'string', enum: imageFormats, description: 'Output image MIME type. Defaults to image/webp.' },
  },
  required: ['outfitId'],
  additionalProperties: false,
} as const

const draftImageToolInputSchema = {
  type: 'object',
  properties: {
    draftId: { type: 'string', description: 'Import draft ID.' },
    maxWidth: { type: 'number', description: 'Longest-edge downscale target in pixels. Defaults to 768; capped at 2048. The image is only scaled down, never up.' },
    format: { type: 'string', enum: imageFormats, description: 'Output image MIME type. Defaults to image/webp.' },
  },
  required: ['draftId'],
  additionalProperties: false,
} as const

// Register all image tools together and remove them as a group on unmount.
function useImageTools(get: () => UseSardrobeWebMcpToolsOptions) {
  // Keep a stable ref to the accessor so the registration effect can run once
  // (empty deps) while the draft image tool still reads live draft state.
  const getRef = useRef(get)
  getRef.current = get

  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    installWebMCP()
    const modelContext = document.modelContext
    if (!modelContext?.registerTool) return undefined

    const controller = new AbortController()

    const registrations = [modelContext.registerTool(
      {
        name: 'wardrobe_item_image',
        title: 'Get a wardrobe item image',
        description:
          "Fetch a wardrobe item's authenticated same-origin cutout image and return it as inline image content for visual inspection. Use this before suggesting color or description metadata. The item media URL alone is not viewable outside the authenticated browser session.",
        inputSchema: imageToolInputSchema,
        annotations: { readOnlyHint: true },
        execute: (args: Record<string, unknown> = {}) => executeGetItemImage(args),
      },
      { signal: controller.signal },
    )]

    registrations.push(modelContext.registerTool(
      {
        name: 'outfit_image',
        title: 'Get an outfit image',
        description:
          'Render an outfit as a single composited image: every item cutout is layered onto one canvas using its placement, scale, rotation, and z-index, matching how the outfit looks in the app. Use this to see a whole look at once instead of fetching each piece. Returns inline image content.',
        inputSchema: outfitImageToolInputSchema,
        annotations: { readOnlyHint: true },
        execute: (args: Record<string, unknown> = {}) => executeGetOutfitImage(args),
      },
      { signal: controller.signal },
    ))

    registrations.push(modelContext.registerTool(
      {
        name: 'import_draft_image',
        title: 'Get an import draft image',
        description:
          "Fetch a browser-local import draft's image (its cutout if processed, otherwise the source upload) and return it as inline image content for visual review before saving the draft. Use this to confirm what a draft shows before editing its metadata or submitting it.",
        inputSchema: draftImageToolInputSchema,
        annotations: { readOnlyHint: true },
        execute: (args: Record<string, unknown> = {}) => executeGetDraftImage(args, getRef.current().drafts),
      },
      { signal: controller.signal },
    ))

    void Promise.all(registrations).catch((error) => {
      if (!controller.signal.aborted) console.warn('Could not register Sardrobe image tools.', error)
    })

    return () => controller.abort()
  }, [])
}

async function executeGetItemImage(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; [key: string]: unknown }> }> {
  const itemId = requiredString(args.itemId, 'itemId')
  const maxWidth = boundedLimit(args.maxWidth, 768, 2048)
  const format = imageFormats.includes(args.format as ImageFormat) ? (args.format as ImageFormat) : 'image/webp'

  const item = await fetchWardrobeItem(itemId)
  if (!item.media) {
    throw new ToolCallError('This item has no saved cutout image.', 'missing_media')
  }

  // Same-origin, session-gated bytes (see backend /api/wardrobe/media/:id), so
  // the canvas is not tainted and toBlob works.
  const response = await fetch(item.media.url, { credentials: 'include' })
  if (!response.ok) {
    throw new ToolCallError(`Could not load item image (status ${response.status}).`, response.status === 401 ? 'authentication_required' : 'request_failed')
  }

  const { blob, width, height } = await downscaleImage(await response.blob(), maxWidth, format)
  const data = await blobToBase64(blob)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ kind: 'wardrobe.item_image', itemId, mediaId: item.media.id, width, height, mimeType: format }),
      },
      { type: 'image', mimeType: format, data },
    ],
  }
}

async function executeGetDraftImage(args: Record<string, unknown>, drafts: ImportDraft[]): Promise<{ content: Array<{ type: string; [key: string]: unknown }> }> {
  const draftId = requiredString(args.draftId, 'draftId')
  const maxWidth = boundedLimit(args.maxWidth, 768, 2048)
  const format = imageFormats.includes(args.format as ImageFormat) ? (args.format as ImageFormat) : 'image/webp'

  const draft = drafts.find((candidate) => candidate.id === draftId)
  if (!draft) throw new ToolCallError('Import draft not found in this browser session.', 'not_found')

  // Browser-local blob/object URL: cutout if processed, else the source upload.
  const url = draftImageUrl(draft)
  if (!url) throw new ToolCallError('This draft has no viewable image yet.', 'missing_media')

  const response = await fetch(url)
  if (!response.ok) throw new ToolCallError(`Could not load draft image (status ${response.status}).`, 'request_failed')

  const { blob, width, height } = await downscaleImage(await response.blob(), maxWidth, format)
  const data = await blobToBase64(blob)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ kind: 'imports.draft_image', draftId, source: draft.cutout ? 'cutout' : 'original', width, height, mimeType: format }),
      },
      { type: 'image', mimeType: format, data },
    ],
  }
}

// Per-role piece heights as a fraction of canvas height, mirroring the UI's
// container-query units (--piece-h-* in cqh, outfit-builder.css). Width follows
// each cutout's intrinsic aspect ratio. This keeps the composite faithful to
// what the user sees in the builder.
const OUTFIT_PIECE_HEIGHT_FRACTION: Record<OutfitRole, number> = {
  top: 0.285,
  outerwear: 0.285,
  bottom: 0.345,
  bag: 0.1275,
  shoes: 0.105,
  belt: 0.09,
  accessories: 0.105,
}

async function executeGetOutfitImage(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; [key: string]: unknown }> }> {
  const outfitId = requiredString(args.outfitId, 'outfitId')
  // Canvas defaults to a 4:5 portrait, matching the builder stage aspect.
  const canvasWidth = boundedLimit(args.maxWidth, 768, 1536)
  const canvasHeight = Math.round(canvasWidth * 1.25)
  const format = imageFormats.includes(args.format as ImageFormat) ? (args.format as ImageFormat) : 'image/webp'

  const payload = await requestJson<{ outfit: Outfit }>(`/api/outfits/${encodeURIComponent(outfitId)}`)
  const pieces = payload.outfit.items.filter((item) => item.media)
  if (pieces.length === 0) {
    throw new ToolCallError('This outfit has no items with saved images to composite.', 'missing_media')
  }

  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ToolCallError('Could not get a 2D canvas context to composite the outfit.', 'image_encode_failed')

  // Draw back-to-front by zIndex, matching OutfitCanvas.
  const ordered = [...pieces].sort((a, b) => a.zIndex - b.zIndex)
  let drawn = 0
  for (const piece of ordered) {
    const bitmap = await loadOutfitPieceBitmap(piece)
    if (!bitmap) continue
    try {
      const targetH = OUTFIT_PIECE_HEIGHT_FRACTION[piece.role] * canvasHeight * piece.scale
      const targetW = targetH * (bitmap.width / bitmap.height)
      // Backend leaves x/y null when the user never positioned a piece; fall back
      // to centered so the composite still renders something sensible.
      const cx = (piece.x ?? 0.5) * canvasWidth
      const cy = (piece.y ?? 0.5) * canvasHeight

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate((piece.rotation * Math.PI) / 180)
      ctx.drawImage(bitmap, -targetW / 2, -targetH / 2, targetW, targetH)
      ctx.restore()
      drawn += 1
    } finally {
      bitmap.close()
    }
  }

  if (drawn === 0) throw new ToolCallError('Could not load any of this outfit\'s item images.', 'request_failed')

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format, 0.86))
  if (!blob) throw new ToolCallError('Could not encode the composited outfit image.', 'image_encode_failed')
  const data = await blobToBase64(blob)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ kind: 'outfit.image', outfitId, itemCount: drawn, width: canvasWidth, height: canvasHeight, mimeType: format }),
      },
      { type: 'image', mimeType: format, data },
    ],
  }
}

async function loadOutfitPieceBitmap(piece: OutfitItem): Promise<ImageBitmap | null> {
  if (!piece.media) return null
  try {
    const response = await fetch(piece.media.url, { credentials: 'include' })
    if (!response.ok) return null
    return await createImageBitmap(await response.blob())
  } catch {
    return null
  }
}

function serializeAgentWardrobeItem(item: WardrobeItem) {
  const metadata = {
    name: metadataField(item.name),
    category: metadataField(item.category),
    subcategory: metadataField(item.subcategory),
    color: metadataField(item.color),
    description: metadataField(item.description),
    occasion: metadataListField(item.occasion),
    season: metadataListField(item.season),
    status: statusField(item.status),
    notes: metadataField(item.notes),
  }
  const derivedRole = wardrobeCategoryToRole(item)

  return {
    id: item.id,
    type: 'wardrobe_item',
    metadata,
    derived: {
      outfitRole: {
        value: derivedRole,
        source: 'derived',
        confidence: roleConfidence(item.category, derivedRole),
        basis: 'wardrobe category',
      },
    },
    metadataGaps: wardrobeItemGaps(item),
    media: serializeMedia(item.media),
    timestamps: {
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    },
  }
}

function serializeAgentImportDraft(draft: ImportDraft) {
  const imageUrl = draftImageUrl(draft)

  return {
    id: draft.id,
    type: 'import_draft',
    fileName: draft.fileName,
    fileSize: draft.fileSize,
    status: draft.status,
    failureStage: draft.failureStage,
    message: draft.message,
    error: draft.error,
    canSave: draft.status === 'ready' && Boolean(draft.cutout && draft.form.name.trim() && draft.form.category.trim()),
    metadata: {
      name: metadataField(draft.form.name),
      category: metadataField(draft.form.category),
      subcategory: metadataField(draft.form.subcategory),
      color: metadataField(draft.form.color),
      description: metadataField(draft.form.description),
      occasion: metadataListField(draft.form.occasion),
      season: metadataListField(draft.form.season),
      status: statusField(draft.form.status),
      notes: metadataField(draft.form.notes),
    },
    metadataGaps: formGaps(draft.form, Boolean(draft.cutout)),
    media: {
      kind: draft.cutout ? 'browser-local-cutout-preview' : 'browser-local-source-preview',
      url: imageUrl,
      originalUrl: draft.originalUrl,
      cutoutUrl: draft.cutout?.url ?? null,
      width: draft.cutout?.width ?? null,
      height: draft.cutout?.height ?? null,
      availability: imageUrl ? 'current_tab_session' : 'missing',
    },
  }
}

function serializeAgentOutfit(outfit: Outfit) {
  return {
    ...outfit,
    type: 'outfit',
    metadata: {
      name: metadataField(outfit.name),
      category: metadataField(outfit.category),
      source: metadataField(outfit.source),
      description: metadataField(outfit.description),
      stylingFormula: metadataField(outfit.stylingFormula),
      occasion: metadataListField(outfit.occasion),
      season: metadataListField(outfit.season),
      status: statusField(outfit.status),
      notes: metadataField(outfit.notes),
    },
    metadataGaps: outfitGaps(outfit),
    preview: {
      compositionModel: 'layered_item_cutouts',
      itemCount: outfit.items.length,
    },
    items: outfit.items.map((item) => ({
      id: item.id,
      outfitItemId: item.outfitItemId,
      role: roleField(item.role),
      placement: {
        x: item.x,
        y: item.y,
        scale: item.scale,
        rotation: item.rotation,
        zIndex: item.zIndex,
      },
      metadata: {
        name: metadataField(item.name),
        category: metadataField(item.category),
        subcategory: metadataField(item.subcategory),
        color: metadataField(item.color),
        description: metadataField(item.description),
        occasion: metadataListField(item.occasion),
        season: metadataListField(item.season),
        status: statusField(item.status),
        notes: metadataField(item.notes),
      },
      metadataGaps: wardrobeItemGaps(item),
      media: serializeMedia(item.media),
    })),
  }
}

function metadataField(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''

  if (!normalized) {
    return {
      value: null,
      source: 'missing',
      confidence: 0,
    }
  }

  return {
    value: normalized,
    source: 'user_entered',
    confidence: 1,
  }
}

function roleField(role: OutfitRole) {
  return {
    value: role,
    source: 'user_entered',
    confidence: 1,
  }
}

// status is a controlled lifecycle value (e.g. 'owned') the app assigns and
// manages, not free-form metadata a user types. Mark it system-managed so the
// agent does not treat it as user-entered metadata it could revise or flag as
// a gap.
function statusField(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''

  return {
    value: normalized || null,
    source: 'system_managed',
    confidence: normalized ? 1 : 0,
  }
}

// occasion and season are multi-select controlled values stored as CSV. Expose
// them to the agent as an array under `values` so reads mirror what
// wardrobe_item_mutate accepts on write (an array of enum values).
function metadataListField(value: string | null | undefined) {
  const values = csvToArray(typeof value === 'string' ? value : '')

  if (values.length === 0) {
    return { values: [], source: 'missing', confidence: 0 }
  }

  return { values, source: 'user_entered', confidence: 1 }
}

function serializeMedia(media: WardrobeItem['media']) {
  if (!media) {
    return {
      availability: 'missing',
      reference: null,
    }
  }

  return {
    availability: 'authenticated_same_origin',
    reference: {
      id: media.id,
      url: absoluteUrl(media.url),
      relativeUrl: media.url,
      width: media.width,
      height: media.height,
      requiresBrowserSession: true,
    },
  }
}

function wardrobeItemGaps(item: Pick<WardrobeItem, 'media' | 'subcategory' | 'color' | 'occasion' | 'season' | 'description' | 'notes'>) {
  const gaps: string[] = []
  if (!item.media) gaps.push('missing_media')
  if (!item.subcategory?.trim()) gaps.push('missing_subcategory')
  if (!item.color?.trim()) gaps.push('missing_color')
  if (!item.occasion?.trim()) gaps.push('missing_occasion')
  if (!item.season?.trim()) gaps.push('missing_season')
  if (!item.description?.trim()) gaps.push('missing_description')
  if (!item.notes?.trim()) gaps.push('missing_notes')
  return gaps
}

function formGaps(form: WardrobeFormState, hasMedia: boolean) {
  return wardrobeItemGaps({
    media: hasMedia ? { id: 'draft-cutout', url: '', width: null, height: null } : null,
    subcategory: form.subcategory,
    color: form.color,
    occasion: form.occasion,
    season: form.season,
    description: form.description,
    notes: form.notes,
  })
}

function outfitGaps(outfit: Outfit) {
  const gaps: string[] = []
  if (!outfit.items.length) gaps.push('missing_items')
  if (!outfit.occasion?.trim()) gaps.push('missing_occasion')
  if (!outfit.season?.trim()) gaps.push('missing_season')
  if (!outfit.description?.trim()) gaps.push('missing_description')
  if (!outfit.notes?.trim()) gaps.push('missing_notes')
  if (outfit.items.some((item) => !item.media)) gaps.push('item_missing_media')
  return gaps
}

function roleConfidence(category: string | null | undefined, role: OutfitRole) {
  if (!category?.trim()) return 0
  if (role === 'accessories' && category !== 'Accessories') return 0.4
  return 0.7
}

function searchableItemText(item: WardrobeItem) {
  return [
    item.name,
    item.category,
    item.subcategory,
    item.color,
    item.description,
    item.occasion,
    item.season,
    item.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

// Read and validate the discriminating "action" field of a mutation/read tool.
// Per-action required fields are enforced in each handler rather than via JSON
// Schema oneOf, which the polyfill validator does not handle reliably.
function readAction<T extends string>(args: Record<string, unknown>, allowed: readonly T[]): T {
  const action = args.action
  if (typeof action !== 'string' || !allowed.includes(action as T)) {
    throw new ToolCallError(`action must be one of: ${allowed.join(', ')}.`, 'invalid_input')
  }
  return action as T
}

// Build the outfit create/update payload from tool args. The composition is
// replace-all: every item needs itemId + role; placement is optional. When an
// agent omits placement, use the same kind of flat-lay defaults the visual
// builder starts with instead of stacking pieces in the center.
function buildOutfitPayload(args: Record<string, unknown>): CreateOutfitPayload {
  const name = requiredString(args.name, 'name')

  if (!Array.isArray(args.items) || args.items.length === 0) {
    throw new ToolCallError('items must be a non-empty array; an outfit needs at least one piece.', 'invalid_input')
  }

  const seenItems = new Set<string>()
  const roleOffsets = new Map<OutfitRole, number>()
  const items: CreateOutfitItemPayload[] = args.items.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ToolCallError('Each outfit item must be an object.', 'invalid_input')
    const entry = raw as Record<string, unknown>
    const itemId = requiredString(entry.itemId, `items[${index}].itemId`)
    const role = entry.role
    if (typeof role !== 'string' || !outfitRoles.includes(role as OutfitRole)) {
      throw new ToolCallError(`items[${index}].role must be one of: ${outfitRoles.join(', ')}.`, 'invalid_input')
    }
    if (seenItems.has(itemId)) throw new ToolCallError(`items[${index}].itemId "${itemId}" appears more than once; each wardrobe item can be used once per outfit.`, 'invalid_input')
    seenItems.add(itemId)
    const outfitRole = role as OutfitRole
    const roleOffset = roleOffsets.get(outfitRole) ?? 0
    roleOffsets.set(outfitRole, roleOffset + 1)
    const defaultPosition = defaultAgentOutfitPosition(outfitRole, roleOffset)

    return {
      itemId,
      role: outfitRole,
      x: optionalNumber(entry.x) ?? defaultPosition.x,
      y: optionalNumber(entry.y) ?? defaultPosition.y,
      scale: optionalNumber(entry.scale) ?? 1,
      rotation: optionalNumber(entry.rotation) ?? 0,
      zIndex: optionalNumber(entry.zIndex) ?? defaultAgentOutfitZIndex(outfitRole, roleOffset, index),
    }
  })

  return {
    name,
    description: optionalString(args.description) || null,
    notes: optionalString(args.notes) || null,
    occasion: args.occasion === undefined ? null : parseControlledList(args.occasion, 'occasion', OCCASIONS) || null,
    season: args.season === undefined ? null : parseControlledList(args.season, 'season', SEASONS) || null,
    items,
  }
}

function defaultAgentOutfitPosition(role: OutfitRole, roleOffset: number) {
  const position = legacyPositionFor(role, roleOffset)

  if (role === 'accessories' || roleOffset === 0) {
    return position
  }

  const offsetX = ((roleOffset % 3) - 1) * 0.05
  return { x: clampUnit(position.x + offsetX), y: position.y }
}

function defaultAgentOutfitZIndex(role: OutfitRole, roleOffset: number, fallback: number) {
  return (agentOutfitZIndex[role] ?? fallback * 100) + roleOffset
}

function optionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

// Validate a multi-select controlled field (occasion, season) supplied as an
// array of enum values and return the CSV string the form/API expects. Order is
// preserved and duplicates are dropped; an empty array clears the field.
function parseControlledList(value: unknown, label: string, allowed: readonly string[]): string {
  if (!Array.isArray(value)) {
    throw new ToolCallError(`${label} must be an array of values from: ${allowed.join(', ')}.`, 'invalid_input')
  }

  const seen = new Set<string>()
  for (const entry of value) {
    if (typeof entry !== 'string' || !allowed.includes(entry)) {
      throw new ToolCallError(`${label} contains an invalid value; allowed values are: ${allowed.join(', ')}.`, 'invalid_input')
    }
    seen.add(entry)
  }

  return arrayToCsv([...seen])
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const payload = (await response.json().catch(() => null)) as { error?: string } | null

  if (!response.ok) {
    throw new ToolCallError(payload?.error ?? `Request failed with status ${response.status}.`, response.status === 401 ? 'authentication_required' : 'request_failed')
  }

  return payload as T
}

// WebMCP reports rejected execute callbacks as failed tool calls, so handlers
// throw instead of returning a separate error envelope.
class ToolCallError extends Error {
  constructor(message: string, code: string) {
    super(`[${code}] ${message}`)
    this.name = 'ToolCallError'
  }
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ToolCallError(`${label} is required.`, 'invalid_input')
  }

  return value.trim()
}

function optionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function boundedLimit(value: unknown, fallback: number, max: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(1, Math.min(Math.trunc(value), max))
}

function safeUser(user: WorkspaceUser) {
  return {
    name: user.name ?? null,
    email: user.email ?? null,
  }
}

function absoluteUrl(url: string) {
  if (typeof window === 'undefined') return url
  return new URL(url, window.location.origin).toString()
}

// Decode, optionally downscale (longest edge to maxWidth, never upscale), and
// re-encode an image so tool results stay light. The source is same-origin, so
// the canvas is not tainted and toBlob succeeds.
async function downscaleImage(source: Blob, maxWidth: number, format: ImageFormat): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(source)
  try {
    const scale = Math.min(1, maxWidth / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new ToolCallError('Could not get a 2D canvas context to encode the image.', 'image_encode_failed')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format, 0.86))
    if (!blob) throw new ToolCallError('Could not encode the resized image.', 'image_encode_failed')

    return { blob, width, height }
  } finally {
    bitmap.close()
  }
}

// Base64-encode in chunks to avoid String.fromCharCode stack overflow on large
// byte arrays.
async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const chunkSize = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}
