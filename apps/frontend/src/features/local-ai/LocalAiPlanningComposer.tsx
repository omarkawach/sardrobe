import { Button, Progress, ProgressIndicator, ProgressTrack } from '@sardrobe/react-components'
import { ImagePlus, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Outfit } from '../outfits/domain'
import type { WardrobeItem } from '../wardrobe/domain'
import type { LocalAiOutfitSuggestion, LocalAiPackingSuggestion, LocalAiStatus } from './types'

type LocalAiPlanningComposerProps = {
  items: WardrobeItem[]
  status: LocalAiStatus
  onStatusChange: (status: LocalAiStatus) => void
} & (
  | { mode: 'outfits'; onApply: (suggestion: LocalAiOutfitSuggestion) => void }
  | { mode: 'packing'; outfits: Outfit[]; onApply: (suggestion: LocalAiPackingSuggestion) => void }
)

const copy = {
  outfits: {
    title: 'Create outfit with AI',
    label: 'Describe the look',
    placeholder: 'Dinner outside on a cool evening, polished but relaxed…',
    action: 'Submit',
  },
  packing: {
    title: 'Plan with AI',
    label: 'Describe the trip',
    placeholder: 'Four days in Lisbon in September, lots of walking and one nice dinner…',
    action: 'Submit',
  },
} as const

export function LocalAiPlanningComposer(props: LocalAiPlanningComposerProps) {
  const [instruction, setInstruction] = useState('')
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [error, setError] = useState('')
  const referenceImageUrl = useMemo(
    () => referenceImage ? URL.createObjectURL(referenceImage) : null,
    [referenceImage],
  )
  const content = copy[props.mode]
  const busy = props.status.phase === 'preparing'
    || props.status.phase === 'downloading'
    || props.status.phase === 'running'
  const requestReady = instruction.trim().length > 0
    || (props.mode === 'outfits' && referenceImage !== null)

  useEffect(() => {
    if (!referenceImageUrl) return
    return () => URL.revokeObjectURL(referenceImageUrl)
  }, [referenceImageUrl])

  async function fillForm() {
    if (!requestReady) return
    setError('')

    try {
      const runtime = await import('./runtime')
      if (props.mode === 'outfits') {
        const suggestion = await runtime.suggestOutfit({
          instruction,
          items: props.items,
          referenceImage: referenceImage ?? undefined,
          onStatus: props.onStatusChange,
        })
        props.onApply(suggestion)
      } else {
        const suggestion = await runtime.suggestPackingPlan({
          instruction,
          items: props.items,
          outfits: props.outfits,
          onStatus: props.onStatusChange,
        })
        props.onApply(suggestion)
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'AI could not finish this request.'
      const unsupported = caught instanceof Error && caught.name === 'LocalAiUnsupportedError'
      setError(message)
      props.onStatusChange({ phase: unsupported ? 'unsupported' : 'error', message, progress: null })
    }
  }

  return (
    <section className={`closet-local-ai-inline closet-local-ai-inline--${props.mode}`} aria-label={content.title}>
      <p className="closet-local-ai-inline__privacy">
        Planning only: AI selects from your saved wardrobe. It does not identify or describe clothing items.
      </p>
      <div className="closet-local-ai-inline__controls">
        <label className="closet-local-ai-inline__prompt">
          <span><Sparkles size={15} aria-hidden="true" />{content.label}</span>
          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder={content.placeholder}
            rows={2}
          />
        </label>

        <div className="closet-local-ai-inline__actions">
          {props.mode === 'outfits' ? (
            <div className="closet-local-ai-inline__reference">
              {referenceImageUrl ? (
                <span className="closet-local-ai-inline__reference-preview">
                  <img src={referenceImageUrl} alt="Outfit reference" />
                  <button type="button" aria-label="Remove reference image" onClick={() => setReferenceImage(null)}>
                    <X size={14} aria-hidden="true" />
                  </button>
                </span>
              ) : (
                <label>
                  <ImagePlus size={14} aria-hidden="true" />
                  <span>Reference image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => setReferenceImage(event.currentTarget.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>
          ) : null}

          <Button
            color="primary"
            size="sm"
            type="button"
            disabled={busy || props.items.length === 0 || !requestReady}
            onClick={() => void fillForm()}
          >
            {busy ? 'Working…' : content.action}
          </Button>
        </div>
      </div>

      {props.items.length === 0 ? (
        <p className="closet-local-ai-inline__error">Add clothes before asking AI to choose pieces.</p>
      ) : error ? (
        <p className="closet-local-ai-inline__error" role="alert">{error}</p>
      ) : busy ? (
        <div className="closet-local-ai-inline__status" role="status" aria-live="polite">
          <span>{props.status.message}</span>
          {props.status.progress !== null && props.status.phase !== 'running' ? (
            <Progress value={props.status.progress} aria-label="AI download progress">
              <ProgressTrack><ProgressIndicator /></ProgressTrack>
            </Progress>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
