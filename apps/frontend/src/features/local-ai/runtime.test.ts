import { describe, expect, it } from 'vitest'
import type { Outfit, OutfitItem, OutfitRole } from '../outfits/domain'
import type { WardrobeItem } from '../wardrobe/domain'
import {
  LOCAL_AI_MODEL_ID,
  LOCAL_AI_MODEL_DTYPE,
  outfitSuggestionFromModelText,
  packingSuggestionFromModelText,
  parseJsonObject,
} from './runtime'

function wardrobeItem(
  id: string,
  name: string,
  category: string,
  subcategory: string,
  extras: Partial<WardrobeItem> = {},
): WardrobeItem {
  return {
    id,
    name,
    category,
    subcategory,
    color: 'Black',
    description: null,
    occasion: 'Casual',
    season: 'Fall,Winter',
    status: 'owned',
    notes: null,
    createdAt: '',
    updatedAt: '',
    media: null,
    ...extras,
  }
}

const planningWardrobe: WardrobeItem[] = [
  wardrobeItem('top-1', 'Black T-shirt', 'Tops', 'T-shirt'),
  wardrobeItem('bottom-1', 'Gray trousers', 'Bottoms', 'Trousers', { color: 'Gray' }),
  wardrobeItem('shoes-1', 'Black loafers', 'Shoes', 'Flats'),
  wardrobeItem('bag-1', 'Black shoulder bag', 'Bags', 'Crossbody'),
  wardrobeItem('outerwear-1', 'Beige trench coat', 'Outerwear', 'Coat', { color: 'Beige' }),
  wardrobeItem('top-2', 'White shirt', 'Tops', 'Blouse', { color: 'White' }),
  wardrobeItem('top-3', 'Navy sweater', 'Tops', 'Sweater', { color: 'Navy' }),
  wardrobeItem('top-4', 'Red polo', 'Tops', 'Polo', { color: 'Red' }),
  wardrobeItem('bottom-2', 'Blue jeans', 'Bottoms', 'Jeans', { color: 'Blue' }),
  wardrobeItem('dress-1', 'Black dinner dress', 'Dresses', 'Cocktail', { occasion: 'Formal,Date Night' }),
  wardrobeItem('shoes-2', 'White sneakers', 'Shoes', 'Sneakers', { color: 'White' }),
]

function savedOutfitItem(item: WardrobeItem, role: OutfitRole): OutfitItem {
  return {
    id: item.id,
    outfitItemId: `outfit-${item.id}`,
    role,
    x: null,
    y: null,
    scale: 1,
    rotation: 0,
    zIndex: 0,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    color: item.color,
    description: item.description,
    occasion: item.occasion,
    season: item.season,
    status: item.status,
    notes: item.notes,
    media: null,
  }
}

const dinnerOutfit: Outfit = {
  id: 'outfit-dinner',
  name: 'Build Polished Fall Dinner Ralph',
  category: null,
  source: 'Local AI',
  description: 'Polished fall dinner outfit.',
  stylingFormula: null,
  occasion: 'Date Night',
  season: 'Fall',
  status: 'saved',
  notes: null,
  createdAt: '',
  updatedAt: '',
  items: [
    savedOutfitItem(planningWardrobe[0]!, 'top'),
    savedOutfitItem(planningWardrobe[1]!, 'bottom'),
    savedOutfitItem(planningWardrobe[2]!, 'shoes'),
    savedOutfitItem(planningWardrobe[4]!, 'outerwear'),
  ],
}

describe('local AI model settings', () => {
  it('uses one capable planning model with compact compatible weights', () => {
    expect(LOCAL_AI_MODEL_ID).toBe('HuggingFaceTB/SmolVLM-500M-Instruct')
    expect(LOCAL_AI_MODEL_DTYPE).toEqual({
      embed_tokens: 'q8',
      vision_encoder: 'q4',
      decoder_model_merged: 'q4',
    })
  })
})

describe('parseJsonObject', () => {
  it('accepts a JSON object wrapped in a model response', () => {
    expect(parseJsonObject('Here is the draft:\n```json\n{"name":"Blue shirt"}\n```')).toEqual({
      name: 'Blue shirt',
    })
  })

  it('rejects responses without an object', () => {
    expect(() => parseJsonObject('I could not decide.')).toThrow('unreadable suggestion')
  })

  it('rejects malformed structured output', () => {
    expect(() => parseJsonObject('{"name":}')).toThrow('invalid structured data')
  })
})

describe('outfitSuggestionFromModelText', () => {
  it('fills every requested role when the model returns only one key', () => {
    const suggestion = outfitSuggestionFromModelText(
      'w3',
      'Create an outfit with a top, bottom, shoes, and bag.',
      planningWardrobe,
    )

    expect(suggestion.itemIds).toEqual(['top-1', 'bottom-1', 'shoes-1', 'bag-1'])
    expect(suggestion.form.stylingFormula).toBe('Black T-shirt + Gray trousers + Black loafers + Black shoulder bag')
    expect(suggestion.form.description).toBe('Create an outfit with a top, bottom, shoes, and bag.')
  })

  it('honors an exact count and ignores an overlong model response', () => {
    const suggestion = outfitSuggestionFromModelText(
      'w1,w2,w3,w4,w5,w6,w7,w8,w9,w10,w11',
      'Choose exactly four items: one top, one bottom, one pair of shoes, and one bag. Make it polished for a cool evening.',
      planningWardrobe,
    )

    expect(suggestion.itemIds).toHaveLength(4)
    expect(suggestion.itemIds).toEqual(['top-1', 'bottom-1', 'shoes-1', 'bag-1'])
    expect(suggestion.form.name).toBe('Four Top Bottom Shoes Bag')
    expect(suggestion.form.stylingFormula).not.toContain('Beige trench coat')
  })

  it('creates a complete default outfit from malformed model output', () => {
    const suggestion = outfitSuggestionFromModelText(
      'I could not choose. Black T-shirt Gray trousers Black loafers Black shoulder bag Beige trench coat',
      'Polished casual dinner on a cool evening.',
      planningWardrobe,
    )

    expect(suggestion.itemIds).toEqual(['top-1', 'bottom-1', 'shoes-1', 'outerwear-1', 'bag-1'])
    expect(suggestion.form.occasion).toBe('Casual')
    expect(suggestion.form.season).toBe('Fall')
  })

  it('respects exclusions and prioritizes requested garment details', () => {
    const suggestion = outfitSuggestionFromModelText(
      'w6,w2,w3,w4,w5',
      'Business casual work outfit for a cool fall day. Use a sweater, trousers, and black loafers. Do not include a bag.',
      planningWardrobe,
    )

    expect(suggestion.itemIds).toEqual(['top-3', 'bottom-1', 'shoes-1', 'outerwear-1'])
    expect(suggestion.itemIds).not.toContain('bag-1')
  })

  it('honors exact named items without adding excluded roles', () => {
    const suggestion = outfitSuggestionFromModelText(
      'w2,w3,w4,w5',
      'Casual summer outfit with a Black T-shirt, Gray trousers, and White sneakers. No outerwear and no bag.',
      planningWardrobe,
    )

    expect(suggestion.itemIds).toEqual(['top-1', 'bottom-1', 'shoes-2'])
  })
})

describe('packingSuggestionFromModelText', () => {
  it('creates a compact multi-category list when model output is partial', () => {
    const instruction = 'Four days in Lisbon in September with lots of walking and one nice dinner.'
    const suggestion = packingSuggestionFromModelText('w1', instruction, planningWardrobe)
    const selected = planningWardrobe.filter((item) => suggestion.itemIds.includes(item.id))

    expect(suggestion.itemIds.length).toBeGreaterThanOrEqual(7)
    expect(suggestion.itemIds.length).toBeLessThanOrEqual(12)
    expect(selected.filter((item) => item.category === 'Tops')).toHaveLength(4)
    expect(selected.some((item) => item.category === 'Bottoms')).toBe(true)
    expect(selected.some((item) => item.category === 'Shoes')).toBe(true)
    expect(selected.some((item) => item.category === 'Bags')).toBe(false)
    expect(selected.some((item) => item.category === 'Dresses')).toBe(false)
    expect(suggestion.form.notes).toBe(instruction)
  })

  it('uses ISO dates from the request when the model omits dates', () => {
    const suggestion = packingSuggestionFromModelText(
      'w1,w2,w3',
      'Pack for a trip from 2026-09-10 to 2026-09-14.',
      planningWardrobe,
    )

    expect(suggestion.form.startDate).toBe('2026-09-10')
    expect(suggestion.form.endDate).toBe('2026-09-14')
  })

  it('includes a named saved outfit and parses natural-language dates without duplicating its pieces', () => {
    const suggestion = packingSuggestionFromModelText(
      'w1,w2,w3,w4,w5',
      'Three days in Seattle from October 9 to October 11, 2026. Include the Build Polished Fall Dinner Ralph outfit.',
      planningWardrobe,
      [dinnerOutfit],
    )

    expect(suggestion.outfitIds).toEqual(['outfit-dinner'])
    expect(suggestion.form.startDate).toBe('2026-10-09')
    expect(suggestion.form.endDate).toBe('2026-10-11')
    expect(suggestion.itemIds).not.toContain('top-1')
    expect(suggestion.itemIds).not.toContain('bottom-1')
    expect(suggestion.itemIds).not.toContain('shoes-1')
    expect(suggestion.itemIds).not.toContain('outerwear-1')
  })

  it('honors requested packing quantities and exclusions', () => {
    const suggestion = packingSuggestionFromModelText(
      'o1,w1,w2,w3,w4,w5,w6,w7,w8,w9',
      'Three-day summer city trip. Pack two tops, one pair of trousers, White sneakers, and one light outer layer. No bag and no dress.',
      planningWardrobe,
      [dinnerOutfit],
    )
    const selected = planningWardrobe.filter((item) => suggestion.itemIds.includes(item.id))

    expect(selected.filter((item) => item.category === 'Tops')).toHaveLength(2)
    expect(selected.filter((item) => item.category === 'Bottoms')).toHaveLength(1)
    expect(selected.filter((item) => item.category === 'Shoes')).toEqual([planningWardrobe[10]])
    expect(selected.filter((item) => item.category === 'Outerwear')).toHaveLength(1)
    expect(selected.some((item) => item.category === 'Bags')).toBe(false)
    expect(selected.some((item) => item.category === 'Dresses')).toBe(false)
    expect(suggestion.outfitIds).toEqual([])
  })

  it('packs an explicitly named saved outfit without unrelated individual items', () => {
    const suggestion = packingSuggestionFromModelText(
      'o1,w1,w2,w3,w4,w5',
      'One-night trip. Pack the saved outfit named Build Polished Fall Dinner Ralph. Include that saved outfit only and do not add individual wardrobe items.',
      planningWardrobe,
      [dinnerOutfit],
    )

    expect(suggestion.outfitIds).toEqual(['outfit-dinner'])
    expect(suggestion.itemIds).toEqual([])
  })
})
