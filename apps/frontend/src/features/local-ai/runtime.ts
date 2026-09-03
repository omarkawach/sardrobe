import type { TransformersJSLanguageModel } from '@browser-ai/transformers-js'
import { z } from 'zod'
import {
  wardrobeCategoryToRole,
  type Outfit,
  type OutfitFormState,
  type OutfitRole,
} from '../outfits/domain'
import type { PackingPlanFormState } from '../packing/domain'
import {
  OCCASIONS,
  SEASONS,
  type WardrobeItem,
} from '../wardrobe/domain'
import type {
  LocalAiOutfitSuggestion,
  LocalAiPackingSuggestion,
  LocalAiStatus,
} from './types'
import {
  beginLocalAiLoad,
  finishLocalAiLoad,
  recordLocalAiLoadProgress,
} from './lifecycle'
import { isMobileOrTabletDevice } from './support'

export const LOCAL_AI_MODEL_ID = 'HuggingFaceTB/SmolVLM-500M-Instruct'
export const LOCAL_AI_MODEL_DTYPE = {
  // This model's q4 embedding artifact is larger than its q8 artifact.
  // Keep the larger model stages
  // at q4 and avoid the unnecessary embedding allocation on desktop.
  embed_tokens: 'q8',
  vision_encoder: 'q4',
  decoder_model_merged: 'q4',
} as const
const MAX_CATALOG_ITEMS = 80
const MAX_IMAGE_BYTES = 192 * 1024
const MAX_OUTFIT_ITEMS = 7
const MAX_PACKING_ITEMS = 12
const OUTFIT_ROLE_ORDER: OutfitRole[] = ['top', 'bottom', 'shoes', 'outerwear', 'bag', 'belt', 'accessories']
let modelPromise: Promise<TransformersJSLanguageModel> | null = null
let modelWorker: Worker | null = null

const flexibleText = z.preprocess((value) => {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(String).join(', ')
  return String(value)
}, z.string())

const flexibleStringArray = z.preprocess((value) => {
  if (value == null) return []
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') return value.split(/[\s,|]+/).filter(Boolean)
  return []
}, z.array(z.string()))

const outfitResponseSchema = z.object({
  name: flexibleText,
  category: flexibleText,
  description: flexibleText,
  stylingFormula: flexibleText,
  occasion: flexibleText,
  season: flexibleText,
  notes: flexibleText,
  itemKeys: flexibleStringArray,
})

const packingResponseSchema = z.object({
  plan: flexibleText,
  startDate: flexibleText,
  endDate: flexibleText,
  notes: flexibleText,
  outfitKeys: flexibleStringArray,
  itemKeys: flexibleStringArray,
})

export class LocalAiUnsupportedError extends Error {
  constructor(message = 'AI needs a browser and device with WebGPU support.') {
    super(message)
    this.name = 'LocalAiUnsupportedError'
  }
}

function getLocalAiGpu() {
  return (navigator as Navigator & { gpu?: unknown }).gpu
}

export async function prepareLocalAi(onStatus: (status: LocalAiStatus) => void) {
  if (typeof window === 'undefined') {
    throw new LocalAiUnsupportedError()
  }
  if (isMobileOrTabletDevice(navigator)) {
    throw new LocalAiUnsupportedError('AI is available on desktop devices only.')
  }
  if (!getLocalAiGpu()) throw new LocalAiUnsupportedError()

  if (!modelPromise) {
    beginLocalAiLoad()
    modelPromise = initializeModel(onStatus, LOCAL_AI_MODEL_ID).catch((error) => {
      finishLocalAiLoad()
      modelPromise = null
      modelWorker?.terminate()
      modelWorker = null
      throw error
    })
  }

  return modelPromise
}

async function initializeModel(onStatus: (status: LocalAiStatus) => void, modelId: string) {
  onStatus({ phase: 'preparing', message: 'Preparing AI…', progress: null })

  const { doesBrowserSupportTransformersJS, transformersJS } = await import('@browser-ai/transformers-js')

  if (!doesBrowserSupportTransformersJS()) {
    throw new LocalAiUnsupportedError()
  }

  modelWorker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  const model = transformersJS(modelId, {
    device: 'webgpu',
    dtype: LOCAL_AI_MODEL_DTYPE,
    isVisionModel: true,
    worker: modelWorker,
  })

  let recordedProgress = 0
  await model.createSessionWithProgress((progress) => {
    const percentage = Math.max(0, Math.min(100, Math.round(progress * 100)))
    if (percentage >= recordedProgress + 5) {
      recordedProgress = percentage
      recordLocalAiLoadProgress(percentage)
    }
    onStatus({
      phase: progress < 1 ? 'downloading' : 'preparing',
      message: progress < 1 ? `Downloading AI… ${percentage}%` : 'Opening the local model…',
      progress: percentage,
    })
  })

  finishLocalAiLoad()
  onStatus({ phase: 'ready', message: 'AI is ready on this device.', progress: 100 })
  return model
}

export async function releaseLocalAi() {
  const worker = modelWorker
  modelWorker = null
  modelPromise = null
  finishLocalAiLoad()
  worker?.terminate()
}

export async function suggestOutfit({
  instruction,
  items,
  referenceImage,
  onStatus,
}: {
  instruction: string
  items: WardrobeItem[]
  referenceImage?: Blob
  onStatus: (status: LocalAiStatus) => void
}): Promise<LocalAiOutfitSuggestion> {
  const catalog = buildCatalog(items, instruction)
  const response = await runJsonPrompt({
    image: referenceImage,
    maxOutputTokens: 64,
    onStatus,
    prompt: `Create one practical outfit using only the wardrobe catalog below.

User request: ${instruction.trim() || 'Create a versatile everyday outfit.'}
${referenceImage ? 'Use the attached image only as styling inspiration. Select actual pieces from the catalog.\n' : ''}
Wardrobe catalog:
${catalog.text}

Answer with only the catalog keys for the chosen pieces, separated by commas, for example: w1,w2,w3
Do not copy the catalog. Do not write words, sentences, labels, or markdown. Respect explicit item names, quantities, and exclusions such as "no bag". Select one item for each garment role requested by the user. A complete outfit normally has a top or dress, a bottom when needed, shoes, and only the requested or weather-appropriate layers, bags, and accessories.`,
  })

  return outfitSuggestionFromModelText(response, instruction, items, Boolean(referenceImage), catalog)
}

export async function suggestPackingPlan({
  instruction,
  items,
  outfits,
  onStatus,
}: {
  instruction: string
  items: WardrobeItem[]
  outfits: Outfit[]
  onStatus: (status: LocalAiStatus) => void
}): Promise<LocalAiPackingSuggestion> {
  const catalog = buildCatalog(items, instruction)
  const outfitCatalog = buildOutfitCatalog(outfits, instruction)
  const response = await runJsonPrompt({
    maxOutputTokens: 80,
    onStatus,
    prompt: `Create a compact packing-list draft using only the saved outfits and wardrobe catalogs below.

Trip request: ${instruction.trim() || 'Create a small versatile packing list.'}
Saved outfits:
${outfitCatalog.text || 'None'}

Wardrobe catalog:
${catalog.text}

Answer with only the catalog keys to pack, separated by commas, for example: o1,w1,w2,w3
Do not copy the catalog. Do not write words, sentences, labels, dates, or markdown. Respect explicit item names, quantities, and exclusions. Select a compact list with enough tops, bottoms, and shoes; include a layer, bag, dress, or accessory only when the request or weather calls for it. Never invent catalog keys.
When the user names a saved outfit, include its o key. Do not repeat that outfit's pieces as separate w keys unless the user asks for duplicates. If the user asks for that outfit only, return only its o key.`,
  })

  return packingSuggestionFromModelText(response, instruction, items, outfits, catalog, outfitCatalog)
}

export function outfitSuggestionFromModelText(
  response: string,
  instruction: string,
  items: WardrobeItem[],
  hasReferenceImage = false,
  preparedCatalog = buildCatalog(items, instruction),
): LocalAiOutfitSuggestion {
  if (items.length === 0) throw new Error('Add at least one wardrobe item before building an outfit with AI.')

  const parsed = parseOutfitModelText(response, instruction)
  const itemIds = completeOutfitSelection(parsed.itemKeys, preparedCatalog, instruction)
  if (itemIds.length === 0) throw new Error('The wardrobe does not contain enough compatible items for an outfit.')

  const itemById = new Map(items.map((item) => [item.id, item]))
  const selectedNames = itemIds.map((itemId) => itemById.get(itemId)?.name).filter((name): name is string => Boolean(name))
  const form: OutfitFormState = {
    name: cleanText(parsed.name) || titleFromInstruction(instruction, 'Outfit draft'),
    category: cleanText(parsed.category),
    source: hasReferenceImage ? 'On-device AI reference image' : 'On-device planning AI',
    description: cleanText(parsed.description) || cleanText(instruction),
    stylingFormula: selectedNames.join(' + '),
    occasion: normalizeCsvChoices(parsed.occasion, OCCASIONS) || inferChoicesFromPrompt(instruction, OCCASIONS),
    season: normalizeCsvChoices(parsed.season, SEASONS) || inferSeasonFromPrompt(instruction),
    notes: cleanText(parsed.notes),
  }

  return { kind: 'outfit', form, itemIds }
}

export function packingSuggestionFromModelText(
  response: string,
  instruction: string,
  items: WardrobeItem[],
  outfits: Outfit[] = [],
  preparedCatalog = buildCatalog(items, instruction),
  preparedOutfitCatalog = buildOutfitCatalog(outfits, instruction),
): LocalAiPackingSuggestion {
  if (items.length === 0) throw new Error('Add at least one wardrobe item before filling a packing plan with AI.')

  const parsed = parsePackingModelText(response, instruction)
  const outfitIds = completePackingOutfitSelection(parsed.outfitKeys, preparedOutfitCatalog, instruction)
  const packedItemIds = new Set(outfits
    .filter((outfit) => outfitIds.includes(outfit.id))
    .flatMap((outfit) => outfit.items.map((item) => item.id)))
  const outfitOnly = outfitIds.length > 0 && /\b(?:outfit only|saved outfit only|only (?:the )?(?:saved )?outfit|do not (?:add|include|pack) individual (?:wardrobe )?items?)\b/i.test(instruction)
  const itemIds = outfitOnly
    ? []
    : completePackingSelection(parsed.itemKeys, preparedCatalog, instruction)
        .filter((itemId) => !packedItemIds.has(itemId))
  if (itemIds.length === 0 && outfitIds.length === 0) throw new Error('The wardrobe does not contain enough compatible items for a packing plan.')

  const dates = extractPromptDates(instruction)
  const form: PackingPlanFormState = {
    plan: cleanText(parsed.plan) || titleFromInstruction(instruction, 'Packing plan'),
    startDate: normalizeDate(parsed.startDate) || dates[0] || '',
    endDate: normalizeDate(parsed.endDate) || dates[1] || '',
    status: 'planning',
    notes: cleanText(parsed.notes) || cleanText(instruction),
  }

  return { kind: 'packing', form, outfitIds, itemIds }
}

function parseOutfitModelText(value: string, instruction: string): z.infer<typeof outfitResponseSchema> {
  try {
    return outfitResponseSchema.parse(parseJsonObject(value))
  } catch {
    return {
      name: extractLabeledText(value, 'name') || titleFromInstruction(instruction, 'Outfit draft'),
      category: '',
      description: instruction,
      stylingFormula: '',
      occasion: '',
      season: '',
      notes: '',
      itemKeys: extractCatalogKeys(value),
    }
  }
}

function parsePackingModelText(value: string, instruction: string): z.infer<typeof packingResponseSchema> {
  try {
    return packingResponseSchema.parse(parseJsonObject(value))
  } catch {
    return {
      plan: extractLabeledText(value, 'plan') || titleFromInstruction(instruction, 'Packing plan'),
      startDate: extractLabeledText(value, 'start'),
      endDate: extractLabeledText(value, 'end'),
      notes: '',
      outfitKeys: extractCatalogKeys(value, 'o'),
      itemKeys: extractCatalogKeys(value),
    }
  }
}

function extractLabeledText(value: string, label: string) {
  const match = value.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*([^\\n]+)`, 'i'))
  return cleanText(match?.[1] ?? '')
}

function extractCatalogKeys(value: string, prefix = 'w') {
  return Array.from(new Set(value.match(new RegExp(`\\b${prefix}\\d+\\b`, 'gi'))?.map((key) => key.toLowerCase()) ?? []))
}

function titleFromInstruction(value: string, fallback: string) {
  const stopWords = new Set([
    'a', 'an', 'and', 'but', 'choose', 'create', 'exactly', 'for', 'from', 'in', 'item', 'items',
    'make', 'of', 'on', 'one', 'outfit', 'pair', 'piece', 'pieces', 'plan', 'the', 'to', 'use', 'with',
  ])
  const words = cleanText(value)
    .replace(/[^a-z0-9' -]/gi, '')
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !stopWords.has(word.toLowerCase()))
    .slice(0, 5)
  if (words.length === 0) return fallback
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
}

function inferChoicesFromPrompt(value: string, choices: readonly string[]) {
  const normalized = ` ${value.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `
  return choices.filter((choice) => normalized.includes(` ${choice.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `)).join(',')
}

async function runJsonPrompt({
  prompt,
  system,
  image,
  maxOutputTokens,
  onStatus,
}: {
  prompt: string
  system?: string
  image?: Blob
  maxOutputTokens: number
  onStatus: (status: LocalAiStatus) => void
}) {
  const model = await prepareLocalAi(onStatus)
  onStatus({ phase: 'running', message: 'Working locally on this device…', progress: null })

  const [{ generateText }, preparedImage] = await Promise.all([
    import('ai'),
    image ? prepareImageForLocalAi(image) : Promise.resolve(undefined),
  ])
  const content: Array<{ type: 'text'; text: string } | { type: 'file'; data: Uint8Array; mediaType: 'image/jpeg' }> = [{
    // This provider's documented vision format places the instruction before
    // the image. It also only processes the final user message for vision, so
    // keep the system rules in that same message.
    type: 'text',
    text: preparedImage && system ? `${system}\n\n${prompt}` : prompt,
  }]
  if (preparedImage) {
    content.push({
      type: 'file',
      data: new Uint8Array(await preparedImage.arrayBuffer()),
      mediaType: 'image/jpeg',
    })
  }

  const result = await generateText({
    model,
    system: preparedImage ? undefined : system,
    messages: [{ role: 'user', content }],
    maxOutputTokens,
    temperature: 0,
  })

  onStatus({ phase: 'ready', message: 'Suggestion ready to review.', progress: 100 })
  return result.text
}

export function parseJsonObject(value: string): unknown {
  const trimmed = cleanModelOutput(value).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')

  if (start < 0 || end <= start) {
    throw new Error('The local model returned an unreadable suggestion. Try again.')
  }

  try {
    return JSON.parse(trimmed.slice(start, end + 1))
  } catch {
    throw new Error('The local model returned invalid structured data. Try again.')
  }
}

function buildCatalog(items: WardrobeItem[], instruction: string) {
  const ranked = items
    .map((item, index) => {
      return { item, index, score: catalogItemMatchScore(item, instruction) }
    })
    .sort((first, second) => second.score - first.score || first.index - second.index)
    .slice(0, MAX_CATALOG_ITEMS)

  const keyToId = new Map<string, string>()
  const entries: Array<{ key: string; item: WardrobeItem }> = []
  const text = ranked.map(({ item }, index) => {
    const key = `w${index + 1}`
    keyToId.set(key, item.id)
    entries.push({ key, item })
    const details = [item.name, item.category, item.subcategory, item.color, item.season, item.occasion]
      .filter(Boolean)
      .join(' | ')
    return `${key}: ${details}`
  }).join('\n')

  return { entries, keyToId, text }
}

function catalogItemMatchScore(item: WardrobeItem, instruction: string) {
  const words = new Set(instruction.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 2) ?? [])
  const haystack = [item.name, item.category, item.subcategory, item.color, item.occasion, item.season, item.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  let score = 0
  for (const word of words) if (haystack.includes(word)) score += 1
  return score
}

function buildOutfitCatalog(outfits: Outfit[], instruction: string) {
  const words = new Set(instruction.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 2) ?? [])
  const ranked = outfits
    .map((outfit, index) => {
      const haystack = [outfit.name, outfit.category, outfit.description, outfit.occasion, outfit.season, outfit.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      let score = 0
      for (const word of words) if (haystack.includes(word)) score += 1
      return { outfit, index, score }
    })
    .sort((first, second) => second.score - first.score || first.index - second.index)
    .slice(0, 24)

  const keyToId = new Map<string, string>()
  const entries: Array<{ key: string; outfit: Outfit }> = []
  const text = ranked.map(({ outfit }, index) => {
    const key = `o${index + 1}`
    keyToId.set(key, outfit.id)
    entries.push({ key, outfit })
    const details = [outfit.name, outfit.season, outfit.occasion, `${outfit.items.length} pieces`]
      .filter(Boolean)
      .join(' | ')
    return `${key}: ${details}`
  }).join('\n')

  return { entries, keyToId, text }
}

function mapCatalogKeys(keys: string[], keyToId: Map<string, string>) {
  return Array.from(new Set(keys.map((key) => key.toLowerCase().replace(/[^a-z0-9]/g, '')).map((key) => keyToId.get(key)).filter((id): id is string => Boolean(id))))
}

type Catalog = ReturnType<typeof buildCatalog>
type OutfitCatalog = ReturnType<typeof buildOutfitCatalog>

function completeOutfitSelection(
  keys: string[],
  catalog: Catalog,
  instruction: string,
) {
  const explicitlyNamedIds = explicitlyNamedItemIds(instruction, catalog)
  const preferredIds = Array.from(new Set([
    ...explicitlyNamedIds,
    ...mapCatalogKeys(keys, catalog.keyToId),
  ])).slice(0, MAX_OUTFIT_ITEMS)
  const pool = rankCatalogEntriesForInstruction(
    preferredCatalogEntries(preferredIds, catalog),
    instruction,
    explicitlyNamedIds,
    preferredIds,
  )
  const requestedRoles = requestedOutfitRoles(instruction)
  const dressRequested = /\b(dress|gown)\b/i.test(instruction)
    && !instructionNegates(instruction, 'dress(?:es)?|gowns?')
  const exactCount = requestedItemCount(instruction)
  const desiredRoles: OutfitRole[] = [...requestedRoles]

  if (dressRequested) {
    if (!desiredRoles.includes('bottom')) desiredRoles.push('bottom')
    if (!instructionNegatesRole(instruction, 'shoes') && !desiredRoles.includes('shoes')) desiredRoles.push('shoes')
  } else {
    for (const role of ['top', 'bottom', 'shoes'] as const) {
      if (!instructionNegatesRole(instruction, role) && !desiredRoles.includes(role)) desiredRoles.push(role)
    }
  }

  if (!exactCount
    && !instructionNegatesRole(instruction, 'outerwear')
    && /\b(cool|cold|chilly|winter|fall|autumn|rain|layer)\b/i.test(instruction)
    && !desiredRoles.includes('outerwear')) {
    desiredRoles.push('outerwear')
  }
  if (!exactCount
    && !instructionNegatesRole(instruction, 'bag')
    && /\b(dinner|date|event|travel|vacation|bag|purse)\b/i.test(instruction)
    && !desiredRoles.includes('bag')) {
    desiredRoles.push('bag')
  }

  const targetCount = Math.min(MAX_OUTFIT_ITEMS, Math.max(1, exactCount ?? desiredRoles.length))
  const selected: Array<{ key: string; item: WardrobeItem }> = []

  for (const role of desiredRoles) {
    if (selected.length >= targetCount) break
    const candidate = pool.find((entry) => {
      if (selected.some((selectedEntry) => selectedEntry.item.id === entry.item.id)) return false
      if (wardrobeCategoryToRole(entry.item) !== role) return false
      if (role === 'bottom' && !dressRequested && entry.item.category === 'Dresses') return false
      if (role === 'bottom' && dressRequested && entry.item.category !== 'Dresses') return false
      return true
    })
    if (candidate) selected.push(candidate)
  }

  if (selected.length < targetCount) {
    for (const role of OUTFIT_ROLE_ORDER) {
      if (selected.length >= targetCount) break
      if (instructionNegatesRole(instruction, role)) continue
      if (role !== 'accessories' && selected.some((entry) => wardrobeCategoryToRole(entry.item) === role)) continue
      const candidate = pool.find((entry) => {
        if (selected.some((selectedEntry) => selectedEntry.item.id === entry.item.id)) return false
        if (wardrobeCategoryToRole(entry.item) !== role) return false
        if (role === 'bottom' && selected.some((entry) => wardrobeCategoryToRole(entry.item) === 'top') && entry.item.category === 'Dresses') return false
        return true
      })
      if (candidate) selected.push(candidate)
    }
  }

  return selected.map(({ item }) => item.id)
}

function completePackingSelection(
  keys: string[],
  catalog: Catalog,
  instruction: string,
) {
  const explicitlyNamedIds = explicitlyNamedItemIds(instruction, catalog)
  const preferredIds = Array.from(new Set([
    ...explicitlyNamedIds,
    ...mapCatalogKeys(keys, catalog.keyToId),
  ])).slice(0, MAX_PACKING_ITEMS)
  const pool = rankCatalogEntriesForInstruction(
    preferredCatalogEntries(preferredIds, catalog),
    instruction,
    explicitlyNamedIds,
    preferredIds,
  )
  const days = tripDayCount(instruction)
  const dressRequested = /\b(dress|gown)\b/i.test(instruction)
    && !instructionNegates(instruction, 'dress(?:es)?|gowns?')
  const selected: Array<{ key: string; item: WardrobeItem }> = []
  const explicitlyRequestedRoles = new Set(requestedOutfitRoles(instruction))
  const quotas: Array<{ role: OutfitRole; count: number; dressesOnly?: boolean; excludeDresses?: boolean }> = []
  const defaultCounts: Partial<Record<OutfitRole, number>> = {
    top: Math.min(4, Math.max(2, days)),
    bottom: Math.min(3, Math.max(1, Math.ceil(days / 2))),
    shoes: days >= 5 ? 2 : 1,
  }
  for (const role of ['top', 'bottom', 'shoes', 'outerwear', 'bag'] as const) {
    if (instructionNegatesRole(instruction, role)) continue
    const requestedCount = requestedRoleCount(instruction, role)
    const explicitlyRequested = explicitlyRequestedRoles.has(role)
    const weatherLayer = role === 'outerwear' && /\b(cool|cold|chilly|winter|fall|autumn|rain|layer)\b/i.test(instruction)
    const count = requestedCount
      ?? (explicitlyRequested || weatherLayer ? 1 : defaultCounts[role] ?? 0)
    if (count > 0) quotas.push({ role, count, excludeDresses: role === 'bottom' })
  }

  if (dressRequested || (!instructionNegates(instruction, 'dress(?:es)?|gowns?') && /\b(formal|wedding)\b/i.test(instruction))) {
    quotas.splice(2, 0, { role: 'bottom', count: 1, dressesOnly: true })
  }

  for (const quota of quotas) {
    for (let count = 0; count < quota.count && selected.length < MAX_PACKING_ITEMS; count += 1) {
      const candidate = pool.find((entry) => {
        if (selected.some((selectedEntry) => selectedEntry.item.id === entry.item.id)) return false
        if (wardrobeCategoryToRole(entry.item) !== quota.role) return false
        if (quota.dressesOnly && entry.item.category !== 'Dresses') return false
        if (quota.excludeDresses && entry.item.category === 'Dresses') return false
        return true
      })
      if (!candidate) break
      selected.push(candidate)
    }
  }

  if (selected.length === 0) return pool.slice(0, Math.min(8, MAX_PACKING_ITEMS)).map(({ item }) => item.id)
  return selected.map(({ item }) => item.id)
}

function completePackingOutfitSelection(
  keys: string[],
  catalog: OutfitCatalog,
  instruction: string,
) {
  const normalizedInstruction = normalizeSearchText(instruction)
  const explicitlyNamed = catalog.entries
    .filter(({ outfit }) => {
      const name = normalizeSearchText(outfit.name)
      return name.length >= 6 && normalizedInstruction.includes(name)
    })
    .map(({ outfit }) => outfit.id)
  if (explicitlyNamed.length > 0) return explicitlyNamed.slice(0, 3)
  if (!/\b(?:outfit|look)\b/i.test(instruction)) return []
  const modelSelected = mapCatalogKeys(keys, catalog.keyToId)
  return Array.from(new Set(modelSelected)).slice(0, 3)
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function preferredCatalogEntries(preferredIds: string[], catalog: Catalog) {
  const entryById = new Map(catalog.entries.map((entry) => [entry.item.id, entry]))
  const preferred = preferredIds.map((itemId) => entryById.get(itemId)).filter((entry): entry is Catalog['entries'][number] => Boolean(entry))
  const preferredSet = new Set(preferredIds)
  return [...preferred, ...catalog.entries.filter((entry) => !preferredSet.has(entry.item.id))]
}

const ROLE_NOUN_SOURCE: Record<OutfitRole, string> = {
  top: 'tops?|shirts?|t-?shirts?|tees?|blouses?|sweaters?|cardigans?|hoodies?|tanks?|polos?',
  bottom: 'bottoms?|pants?|trousers?|jeans?|shorts?|leggings?|skirts?',
  shoes: 'shoes?|sneakers?|boots?|loafers?|heels?|flats?|sandals?|pumps?',
  bag: 'bags?|totes?|purses?|clutches?|backpacks?|crossbodies|crossbody',
  outerwear: 'outerwear|coats?|jackets?|blazers?|trenches|trench coats?|parkas?|layers?',
  belt: 'belts?',
  accessories: 'accessor(?:y|ies)|hats?|scarves|jewelry|necklaces?|bracelets?|rings?|sunglasses|watches',
}

function instructionNegates(instruction: string, nounSource: string) {
  return new RegExp(
    `\\b(?:no|without|excluding?|skip|do not (?:include|add|pack)|don't (?:include|add|pack))\\s+(?:(?:a|an|any|individual|extra|additional)\\s+)?(?:${nounSource})\\b`,
    'i',
  ).test(instruction)
}

function instructionNegatesRole(instruction: string, role: OutfitRole) {
  return instructionNegates(instruction, ROLE_NOUN_SOURCE[role])
}

function explicitlyNamedItemIds(instruction: string, catalog: Catalog) {
  const normalizedInstruction = normalizeSearchText(instruction)
  const seenNames = new Set<string>()
  return catalog.entries.flatMap(({ item }) => {
    const name = normalizeSearchText(item.name)
    if (name.length < 4 || seenNames.has(name) || !normalizedInstruction.includes(name)) return []
    seenNames.add(name)
    return [item.id]
  })
}

function rankCatalogEntriesForInstruction(
  entries: Catalog['entries'],
  instruction: string,
  explicitlyNamedIds: string[],
  preferredIds: string[],
) {
  const explicitlyNamed = new Set(explicitlyNamedIds)
  const preferredOrder = new Map(preferredIds.map((id, index) => [id, index]))
  return entries.slice().sort((first, second) => {
    const explicitDifference = Number(explicitlyNamed.has(second.item.id)) - Number(explicitlyNamed.has(first.item.id))
    if (explicitDifference) return explicitDifference
    const scoreDifference = catalogItemMatchScore(second.item, instruction) - catalogItemMatchScore(first.item, instruction)
    if (scoreDifference) return scoreDifference
    return (preferredOrder.get(first.item.id) ?? Number.MAX_SAFE_INTEGER)
      - (preferredOrder.get(second.item.id) ?? Number.MAX_SAFE_INTEGER)
  })
}

function requestedRoleCount(instruction: string, role: OutfitRole) {
  const numberWords: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  }
  const match = instruction.match(new RegExp(
    `\\b(one|two|three|four|five|six|\\d+)\\s+(?:pairs?\\s+of\\s+)?(?:[a-z-]+\\s+){0,2}(?:${ROLE_NOUN_SOURCE[role]})\\b`,
    'i',
  ))
  if (!match?.[1]) return null
  const count = numberWords[match[1].toLowerCase()] ?? Number.parseInt(match[1], 10)
  return Number.isFinite(count) ? Math.max(0, count) : null
}

function requestedOutfitRoles(instruction: string): OutfitRole[] {
  return OUTFIT_ROLE_ORDER.filter((role) => (
    new RegExp(`\\b(?:${ROLE_NOUN_SOURCE[role]})\\b`, 'i').test(instruction)
    && !instructionNegatesRole(instruction, role)
  ))
}

function requestedItemCount(instruction: string) {
  const numberWords: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
  }
  const match = instruction.match(/\b(?:exactly\s+)?(one|two|three|four|five|six|seven|\d+)\s+(?:items?|pieces?)\b/i)
  if (!match?.[1]) return null
  const count = numberWords[match[1].toLowerCase()] ?? Number.parseInt(match[1], 10)
  if (!Number.isFinite(count)) return null
  return Math.min(MAX_OUTFIT_ITEMS, Math.max(1, count))
}

function tripDayCount(instruction: string) {
  const numberWords: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  }
  const match = instruction.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:day|days|night|nights)\b/i)
  if (!match?.[1]) return 3
  const count = numberWords[match[1].toLowerCase()] ?? Number.parseInt(match[1], 10)
  return Math.min(10, Math.max(1, count))
}

function extractPromptDates(value: string) {
  const isoDates = Array.from(value.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g), (match) => match[1]).slice(0, 2)
  if (isoDates.length >= 2) return isoDates

  const monthNumber: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
    may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9,
    sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
    dec: 12, december: 12,
  }
  const mentions = Array.from(value.matchAll(/\b(january|february|march|april|may|june|july|august|september|sept|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/gi))
  if (mentions.length < 2) return isoDates
  const sharedYear = mentions.find((match) => match[3])?.[3]
  if (!sharedYear) return isoDates

  const dates = mentions.slice(0, 2).map((match) => {
    const month = monthNumber[match[1].toLowerCase()]
    const day = Number.parseInt(match[2], 10)
    const year = Number.parseInt(match[3] || sharedYear, 10)
    const date = new Date(Date.UTC(year, month - 1, day))
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return ''
    return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  })
  return dates.every(Boolean) ? dates : isoDates
}

function inferSeasonFromPrompt(value: string) {
  const direct = inferChoicesFromPrompt(value, SEASONS)
  if (direct) return direct
  if (/\b(cold|chilly|snow|winter)\b/i.test(value)) return 'Winter'
  if (/\b(cool|autumn|fall)\b/i.test(value)) return 'Fall'
  if (/\b(hot|warm|beach|summer)\b/i.test(value)) return 'Summer'
  if (/\b(mild|spring)\b/i.test(value)) return 'Spring'
  return ''
}

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function cleanModelOutput(value: string) {
  return value
    .replace(/<\/?(?:end_of_utterance|endoftext|bos|eos)>/gi, '')
    .replace(/<\|(?:end_of_utterance|endoftext|bos|eos)\|>/gi, '')
    .trim()
}

function normalizeCsvChoices(value: string, choices: readonly string[]) {
  const requested = value.split(/[,/|]+/).map((part) => part.trim().toLowerCase()).filter(Boolean)
  return choices.filter((choice) => requested.includes(choice.toLowerCase())).join(',')
}

function normalizeDate(value: string) {
  const normalized = cleanText(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : ''
}

async function prepareImageForLocalAi(source: Blob) {
  const bitmap = await createImageBitmap(source)
  try {
    let maxEdge = 768
    let quality = 0.84
    let output = await renderCompressedImage(bitmap, maxEdge, quality)

    while (output.size > MAX_IMAGE_BYTES && (maxEdge > 288 || quality > 0.48)) {
      if (quality > 0.5) quality -= 0.1
      else maxEdge = Math.max(288, Math.round(maxEdge * 0.78))
      output = await renderCompressedImage(bitmap, maxEdge, quality)
    }

    return output
  } finally {
    bitmap.close()
  }
}

async function renderCompressedImage(bitmap: ImageBitmap, maxEdge: number, quality: number) {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not prepare the image for on-device AI.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('This browser could not prepare the image for on-device AI.')),
      'image/jpeg',
      quality,
    )
  })
}
