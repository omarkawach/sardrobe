import type { OutfitFormState } from '../outfits/domain'
import type { PackingPlanFormState } from '../packing/domain'

export type LocalAiPhase = 'idle' | 'preparing' | 'downloading' | 'running' | 'ready' | 'error' | 'unsupported'

export type LocalAiStatus = {
  phase: LocalAiPhase
  message: string
  progress: number | null
}

export type LocalAiOutfitSuggestion = {
  kind: 'outfit'
  form: OutfitFormState
  itemIds: string[]
}

export type LocalAiPackingSuggestion = {
  kind: 'packing'
  form: PackingPlanFormState
  outfitIds: string[]
  itemIds: string[]
}
