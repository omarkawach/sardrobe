import {
  Button,
  Checkbox,
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
  Field,
  Input,
  Tooltip,
  TooltipArrow,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipTrigger,
} from '@sardrobe/react-components'
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useEffectEvent, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { WardrobeSelect } from '../../components/closet/FormControls'
import { ClosetEmptyState, ClosetPanel } from '../../components/closet/ClosetPrimitives'
import { Canvas } from '../outfits/OutfitCanvas'
import { listOutfits } from '../outfits/api'
import { outfitToPlacement, type Outfit } from '../outfits/domain'
import { CachedImage } from '../shared/CachedImage'
import type { WardrobeItem } from '../wardrobe/domain'
import { LocalAiPlanningComposer } from '../local-ai/LocalAiPlanningComposer'
import type { LocalAiPackingSuggestion, LocalAiStatus } from '../local-ai/types'
import {
  addPackingItems,
  addPackingOutfits,
  createPackingPlan,
  deletePackingPlan,
  fetchPackingPlan,
  listPackingPlans,
  reconcilePackedStatus,
  removePackingItem,
  removePackingOutfit,
  togglePackingItem,
  togglePackingOutfit,
  updatePackingPlan,
} from './api'
import {
  formatPackingDateRange,
  formFromPackingPlan,
  initialPackingPlanForm,
  PACKING_STATUS_OPTIONS,
  packingSummaryFromPlan,
  type PackingAddMode,
  type PackingDetailState,
  type PackingGalleryState,
  type PackingMobileView,
  type PackingPlan,
  type PackingPlanFormState,
  type PackingPlanItem,
  type PackingPlanOutfit,
  type PackingPlanSummary,
} from './domain'

type PackingViewProps = {
  agentEvent: PackingAgentEvent | null
  items: WardrobeItem[]
  isMobileViewport: boolean
  localAiStatus: LocalAiStatus
  onAgentEventHandled: (sequence: number) => void
  onLocalAiStatusChange: (status: LocalAiStatus) => void
  privateAiEnabled: boolean
}

export type PackingAgentEvent =
  | { sequence: number; type: 'created' | 'updated'; plan: PackingPlan }
  | { sequence: number; type: 'deleted'; planId: string }

export function PackingView({ agentEvent, items, isMobileViewport, localAiStatus, onAgentEventHandled, onLocalAiStatusChange, privateAiEnabled }: PackingViewProps) {
  const [plans, setPlans] = useState<PackingPlanSummary[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PackingPlan | null>(null)
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [outfitLoadError, setOutfitLoadError] = useState('')
  const [galleryState, setGalleryState] = useState<PackingGalleryState>('loading')
  const [galleryError, setGalleryError] = useState('')
  const [detailState, setDetailState] = useState<PackingDetailState>('idle')
  const [detailError, setDetailError] = useState('')
  const [form, setForm] = useState<PackingPlanFormState>(initialPackingPlanForm)
  const [isCreating, setIsCreating] = useState(false)
  const [draftOutfitIds, setDraftOutfitIds] = useState<string[]>([])
  const [draftItemIds, setDraftItemIds] = useState<string[]>([])
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [mobileView, setMobileView] = useState<PackingMobileView>('plans')
  const [addMode, setAddMode] = useState<PackingAddMode | null>(null)
  const [addSearch, setAddSearch] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [initialAgentPlanId] = useState(() => (
    agentEvent && agentEvent.type !== 'deleted' ? agentEvent.plan.id : null
  ))
  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const loadInitialPlanDetail = useEffectEvent((planId: string) => (
    loadPlanDetail(planId, { announceSelection: false })
  ))

  useEffect(() => {
    let active = true

    async function load() {
      setGalleryState('loading')
      setGalleryError('')
      setOutfitLoadError('')

      const [planResult, outfitResult] = await Promise.all([listPackingPlans(), listOutfits()])

      if (!active) return

      if ('error' in outfitResult) {
        setOutfitLoadError(outfitResult.error)
      } else {
        setOutfits(outfitResult)
      }

      if ('error' in planResult) {
        setGalleryError(planResult.error)
        setGalleryState('error')
        return
      }

      setPlans(planResult)
      setGalleryState('idle')

      if (planResult.length > 0 && !initialAgentPlanId) {
        await loadInitialPlanDetail(planResult[0]!.id)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [initialAgentPlanId])

  useEffect(() => {
    if (!agentEvent) return

    if (agentEvent.type === 'deleted') {
      setPlans((current) => current.filter((plan) => plan.id !== agentEvent.planId))

      if (selectedPlanId === agentEvent.planId || selectedPlan?.id === agentEvent.planId) {
        setSelectedPlan(null)
        setSelectedPlanId(null)
        setForm(initialPackingPlanForm)
        setDraftOutfitIds([])
        setDraftItemIds([])
        setEditingTitle(false)
        setConfirmingDelete(false)
        setMobileView('plans')
      }

      setIsCreating(false)
      setAddMode(null)
      setDetailState('idle')
      setDetailError('')
      setGalleryState('idle')
      setGalleryError('')
      setStatusMessage('Packing plan deleted by agent.')
      onAgentEventHandled(agentEvent.sequence)
      return
    }

    applyPlan(agentEvent.plan)
    setIsCreating(false)
    setEditingTitle(false)
    setConfirmingDelete(false)
    setAddMode(null)
    setDetailState('idle')
    setDetailError('')
    setGalleryState('idle')
    setGalleryError('')
    setMobileView('checklist')
    setStatusMessage(agentEvent.type === 'created' ? 'Packing plan created by agent.' : 'Packing plan updated by agent.')
    onAgentEventHandled(agentEvent.sequence)
  }, [agentEvent, onAgentEventHandled, selectedPlan, selectedPlanId])

  function applyLocalAiPacking(suggestion: LocalAiPackingSuggestion) {
    const validItemIds = new Set(items.map((item) => item.id))
    const validOutfitIds = new Set(outfits.map((outfit) => outfit.id))
    setForm(suggestion.form)
    setDraftOutfitIds(suggestion.outfitIds.filter((outfitId) => validOutfitIds.has(outfitId)))
    setDraftItemIds(suggestion.itemIds.filter((itemId) => validItemIds.has(itemId)))
    setEditingTitle(false)
    setConfirmingDelete(false)
    setAddMode(null)
    setDetailState('idle')
    setDetailError('')
    setMobileView('checklist')
    setStatusMessage('AI filled this packing plan. Review it before saving.')
  }

  useEffect(() => {
    if (!editingTitle && !isCreating) return
    titleInputRef.current?.focus()
    titleInputRef.current?.select()
  }, [editingTitle, isCreating, selectedPlanId])

  const selectedOutfitIds = useMemo(
    () => new Set(isCreating ? draftOutfitIds : selectedPlan?.outfits.map((row) => row.outfit.id) ?? []),
    [draftOutfitIds, isCreating, selectedPlan],
  )
  const selectedItemIds = useMemo(
    () => new Set(isCreating ? draftItemIds : selectedPlan?.items.map((row) => row.item.id) ?? []),
    [draftItemIds, isCreating, selectedPlan],
  )

  const availableOutfits = useMemo(
    () => outfits.filter((outfit) => !selectedOutfitIds.has(outfit.id)),
    [outfits, selectedOutfitIds],
  )
  const availableItems = useMemo(
    () => items.filter((item) => !selectedItemIds.has(item.id)),
    [items, selectedItemIds],
  )
  const outfitById = useMemo(() => new Map(outfits.map((outfit) => [outfit.id, outfit])), [outfits])
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  const draftOutfitRows = useMemo<PackingPlanOutfit[]>(
    () =>
      draftOutfitIds.flatMap((outfitId) => {
        const outfit = outfitById.get(outfitId)
        return outfit ? [{ id: `draft-outfit-${outfit.id}`, packedAt: null, createdAt: '', outfit }] : []
      }),
    [draftOutfitIds, outfitById],
  )
  const draftItemRows = useMemo<PackingPlanItem[]>(
    () =>
      draftItemIds.flatMap((itemId) => {
        const item = itemById.get(itemId)
        return item ? [{ id: `draft-item-${item.id}`, packedAt: null, createdAt: '', item }] : []
      }),
    [draftItemIds, itemById],
  )
  const checklistOutfits = selectedPlan?.outfits ?? draftOutfitRows
  const checklistItems = selectedPlan?.items ?? draftItemRows
  const draftTotalCount = draftOutfitRows.length + draftItemRows.length

  function updateForm<K extends keyof PackingPlanFormState>(key: K, value: PackingPlanFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setDetailError('')
  }

  function applyPlan(plan: PackingPlan) {
    setDraftOutfitIds([])
    setDraftItemIds([])
    setSelectedPlan(plan)
    setSelectedPlanId(plan.id)
    setForm(formFromPackingPlan(plan))
    setPlans((current) => {
      const summary = packingSummaryFromPlan(plan)
      const exists = current.some((candidate) => candidate.id === plan.id)
      return exists
        ? current.map((candidate) => (candidate.id === plan.id ? summary : candidate))
        : [summary, ...current]
    })
  }

  async function loadPlanDetail(planId: string, options: { announceSelection?: boolean } = {}) {
    setSelectedPlanId(planId)
    setIsCreating(false)
    setDraftOutfitIds([])
    setDraftItemIds([])
    setEditingTitle(false)
    setConfirmingDelete(false)
    setDetailState('loading')
    setDetailError('')
    setMobileView('checklist')

    const result = await fetchPackingPlan(planId)

    if ('error' in result) {
      setDetailState('error')
      setDetailError(result.error)
      setStatusMessage(`Couldn't load packing plan: ${result.error}`)
      return
    }

    applyPlan(result)
    setDetailState('idle')
    if (options.announceSelection) setStatusMessage(`Opened ${result.plan}.`)
  }

  function openCreatePlan() {
    setIsCreating(true)
    setEditingTitle(true)
    setSelectedPlanId(null)
    setSelectedPlan(null)
    setForm(initialPackingPlanForm)
    setDraftOutfitIds([])
    setDraftItemIds([])
    setConfirmingDelete(false)
    setDetailState('idle')
    setDetailError('')
    setStatusMessage('')
    setMobileView('checklist')
  }

  async function savePlan() {
    if (!form.plan.trim() || detailState === 'saving') {
      setDetailError('Plan is required.')
      setEditingTitle(true)
      return
    }

    setDetailState('saving')
    setDetailError('')
    setStatusMessage(isCreating ? 'Creating packing plan...' : 'Saving packing plan...')

    const result = isCreating || !selectedPlan
      ? await createPackingPlan(form, { outfitIds: draftOutfitIds, itemIds: draftItemIds })
      : await updatePackingPlan(selectedPlan.id, form)

    if ('error' in result) {
      setDetailState('error')
      setDetailError(result.error)
      setStatusMessage(`Couldn't save packing plan: ${result.error}`)
      return
    }

    applyPlan(result)
    setIsCreating(false)
    setEditingTitle(false)
    setDetailState('idle')
    setStatusMessage(isCreating ? 'Packing plan created.' : 'Packing plan saved.')
  }

  async function deleteSelectedPlan() {
    if (!selectedPlan || detailState === 'deleting') return

    setDetailState('deleting')
    setDetailError('')
    setStatusMessage('Deleting packing plan...')

    const result = await deletePackingPlan(selectedPlan.id)

    if ('error' in result) {
      setDetailState('error')
      setDetailError(result.error)
      setStatusMessage(`Couldn't delete packing plan: ${result.error}`)
      return
    }

    const remaining = plans.filter((plan) => plan.id !== selectedPlan.id)
    setPlans(remaining)
    setSelectedPlan(null)
    setSelectedPlanId(null)
    setForm(initialPackingPlanForm)
    setDraftOutfitIds([])
    setDraftItemIds([])
    setEditingTitle(false)
    setConfirmingDelete(false)
    setDetailState('idle')
    setStatusMessage('Packing plan deleted.')

    if (remaining[0]) {
      await loadPlanDetail(remaining[0].id)
    } else {
      setMobileView('plans')
    }
  }

  async function addOutfitToPlan(outfitId: string) {
    if (isCreating) {
      setDraftOutfitIds((current) => (current.includes(outfitId) ? current : [...current, outfitId]))
      setDetailError('')
      setStatusMessage('Outfit added.')
      return
    }

    if (!selectedPlan) return
    setStatusMessage('Adding outfit...')
    const result = await addPackingOutfits(selectedPlan.id, [outfitId])
    handlePlanMutationResult('error' in result ? result : await reconcilePackedStatus(result), 'Outfit added.')
  }

  async function addItemToPlan(itemId: string) {
    if (isCreating) {
      setDraftItemIds((current) => (current.includes(itemId) ? current : [...current, itemId]))
      setDetailError('')
      setStatusMessage('Wardrobe item added.')
      return
    }

    if (!selectedPlan) return
    setStatusMessage('Adding wardrobe item...')
    const result = await addPackingItems(selectedPlan.id, [itemId])
    handlePlanMutationResult('error' in result ? result : await reconcilePackedStatus(result), 'Wardrobe item added.')
  }

  function removeDraftOutfit(outfitId: string) {
    setDraftOutfitIds((current) => current.filter((id) => id !== outfitId))
    setDetailError('')
    setStatusMessage('Outfit removed.')
  }

  function removeDraftItem(itemId: string) {
    setDraftItemIds((current) => current.filter((id) => id !== itemId))
    setDetailError('')
    setStatusMessage('Wardrobe item removed.')
  }

  async function toggleOutfit(row: PackingPlanOutfit, packed: boolean) {
    if (!selectedPlan) return
    setStatusMessage(packed ? 'Marking outfit packed...' : 'Marking outfit unpacked...')
    const result = await togglePackingOutfit(selectedPlan.id, row.id, packed)
    handlePlanMutationResult('error' in result ? result : await reconcilePackedStatus(result), packed ? 'Outfit packed.' : 'Outfit unpacked.')
  }

  async function toggleItem(row: PackingPlanItem, packed: boolean) {
    if (!selectedPlan) return
    setStatusMessage(packed ? 'Marking item packed...' : 'Marking item unpacked...')
    const result = await togglePackingItem(selectedPlan.id, row.id, packed)
    handlePlanMutationResult('error' in result ? result : await reconcilePackedStatus(result), packed ? 'Item packed.' : 'Item unpacked.')
  }

  async function removeOutfit(row: PackingPlanOutfit) {
    if (!selectedPlan) return
    setStatusMessage('Removing outfit...')
    const result = await removePackingOutfit(selectedPlan.id, row.id)
    handlePlanMutationResult('error' in result ? result : await reconcilePackedStatus(result), 'Outfit removed.')
  }

  async function removeItem(row: PackingPlanItem) {
    if (!selectedPlan) return
    setStatusMessage('Removing wardrobe item...')
    const result = await removePackingItem(selectedPlan.id, row.id)
    handlePlanMutationResult('error' in result ? result : await reconcilePackedStatus(result), 'Wardrobe item removed.')
  }

  function handlePlanMutationResult(result: PackingPlan | { error: string }, successMessage: string) {
    if ('error' in result) {
      setDetailError(result.error)
      setStatusMessage(result.error)
      return
    }

    applyPlan(result)
    setDetailError('')
    setStatusMessage(successMessage)
  }

  function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    if (selectedPlan) updateForm('plan', selectedPlan.plan)
    if (!isCreating) setEditingTitle(false)
  }

  const activeDetail = isCreating || selectedPlan !== null
  const planCountLabel = `${plans.length} ${plans.length === 1 ? 'plan' : 'plans'}`
  const titleDisplay = form.plan.trim() || (isCreating ? 'New packing plan' : selectedPlan?.plan ?? 'Untitled packing plan')
  const titleIsEditable = editingTitle
  const detailSubtitle = selectedPlan
    ? `${selectedPlan.packedCount}/${selectedPlan.totalCount} packed`
    : draftTotalCount > 0
      ? `${draftTotalCount} ${draftTotalCount === 1 ? 'row' : 'rows'} ready for first save`
      : 'Start with a plan name, then add outfits and items.'

  return (
    <section className={`closet-packing-view closet-packing-view--mobile-${mobileView}`} aria-labelledby="packing-title">
      <div className="closet-packing-mobile-switch" role="tablist" aria-label="Packing screens">
        <button
          className={mobileView === 'plans' ? 'closet-packing-mobile-switch__button closet-packing-mobile-switch__button--active' : 'closet-packing-mobile-switch__button'}
          type="button"
          role="tab"
          aria-selected={mobileView === 'plans'}
          onClick={() => setMobileView('plans')}
        >
          Plans
        </button>
        <button
          className={mobileView === 'checklist' ? 'closet-packing-mobile-switch__button closet-packing-mobile-switch__button--active' : 'closet-packing-mobile-switch__button'}
          type="button"
          role="tab"
          aria-selected={mobileView === 'checklist'}
          disabled={!activeDetail}
          onClick={() => setMobileView('checklist')}
        >
          Checklist
        </button>
      </div>

      <ClosetPanel className="closet-packing-list">
        <div className="closet-packing__header">
          <div>
            <h1 id="packing-title">Packing list</h1>
            <span className="closet-packing__count">{planCountLabel}</span>
          </div>
          <Button color="primary" type="button" onClick={openCreatePlan} className="closet-packing__new-button">
            <Plus size={16} strokeWidth={1.4} aria-hidden="true" />
            New plan
          </Button>
        </div>

        {galleryState === 'loading' ? (
          <p className="closet-empty" role="status">
            Loading packing plans...
          </p>
        ) : galleryState === 'error' ? (
          <div className="closet-empty">
            <strong>Couldn't load packing plans.</strong>
            <span>{galleryError}</span>
            <Button
              color="primary"
              type="button"
              onClick={() => {
                setGalleryState('loading')
                void listPackingPlans().then((result) => {
                  if ('error' in result) {
                    setGalleryError(result.error)
                    setGalleryState('error')
                  } else {
                    setPlans(result)
                    setGalleryState('idle')
                  }
                })
              }}
            >
              Try again
            </Button>
          </div>
        ) : plans.length === 0 ? (
          <ClosetEmptyState
            title="No packing plans yet."
            description="Create one for a trip, gym bag, or repeatable kit."
          >
            <Button color="primary" type="button" onClick={openCreatePlan}>
              New plan
            </Button>
          </ClosetEmptyState>
        ) : (
          <div className="closet-packing-plan-list" aria-live="polite">
            {plans.map((plan) => (
              <button
                className={`closet-packing-plan-card ${plan.id === selectedPlanId ? 'closet-packing-plan-card--active' : ''}`}
                key={plan.id}
                type="button"
                aria-current={plan.id === selectedPlanId ? 'true' : undefined}
                onClick={() => void loadPlanDetail(plan.id, { announceSelection: true })}
              >
                <span className="closet-packing-plan-card__main">
                  <span className="closet-packing-plan-card__title">{plan.plan}</span>
                  <span className="closet-packing-plan-card__dates">{formatPackingDateRange(plan.startDate, plan.endDate)}</span>
                </span>
                <span className="closet-packing-plan-card__meta">
                  <span>{plan.packedCount}/{plan.totalCount} packed</span>
                  <span>{plan.status === 'packed' ? 'Packed' : 'Planning'}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </ClosetPanel>

      <form
        className={`closet-panel closet-packing-detail ${isCreating ? 'closet-packing-detail--creating' : ''} ${!activeDetail ? 'closet-packing-detail--empty' : ''}`}
        onSubmit={(event) => {
          event.preventDefault()
          void savePlan()
        }}
      >
        {detailState === 'loading' && !selectedPlan ? (
          <p className="closet-empty" role="status">
            Loading checklist...
          </p>
        ) : activeDetail ? (
          <>
            <div className="closet-packing-detail__header">
              <div>
                {titleIsEditable ? (
                  <Field.Root className="closet-packing-title-edit__field">
                    <Field.Label className="sr-only">Plan title</Field.Label>
                    <Field.Control
                      ref={titleInputRef}
                      name="packing-plan"
                      className="closet-packing-title-edit__input"
                      value={form.plan}
                      placeholder="New packing plan"
                      onChange={(event) => updateForm('plan', event.target.value)}
                      onBlur={() => setEditingTitle(false)}
                      onKeyDown={handleTitleKeyDown}
                      disabled={detailState === 'saving' || detailState === 'deleting'}
                      required
                      aria-required="true"
                    />
                  </Field.Root>
                ) : (
                  <div className="closet-packing-title-edit">
                    <h2 title={titleDisplay}>{titleDisplay}</h2>
                    <Tooltip>
                      <TooltipTrigger
                        render={(
                          <Button
                            className="closet-packing-title-edit__button"
                            size="icon"
                            variant="ghost"
                            color="neutral"
                            type="button"
                            aria-label={`Edit title for ${titleDisplay}`}
                            disabled={detailState === 'saving' || detailState === 'deleting'}
                            onClick={() => {
                              setDetailError('')
                              setEditingTitle(true)
                            }}
                          />
                        )}
                      >
                        <Pencil size={15} strokeWidth={1.4} aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipPortal>
                        <TooltipPositioner side="top" sideOffset={4}>
                          <TooltipPopup>
                            <TooltipArrow />
                            Edit title
                          </TooltipPopup>
                        </TooltipPositioner>
                      </TooltipPortal>
                    </Tooltip>
                  </div>
                )}
                <p>{detailSubtitle}</p>
              </div>
            </div>

            {privateAiEnabled && isCreating ? (
              <LocalAiPlanningComposer
                mode="packing"
                items={items}
                outfits={outfits}
                status={localAiStatus}
                onApply={applyLocalAiPacking}
                onStatusChange={onLocalAiStatusChange}
              />
            ) : null}

            <fieldset className="closet-details__fields" disabled={detailState === 'saving' || detailState === 'deleting'}>
              <div className="closet-details__row">
                <label className="closet-field">
                  <span>Start date</span>
                  <Input
                    name="packing-start-date"
                    type="date"
                    className="closet-packing-date-input"
                    value={form.startDate}
                    onChange={(event) => updateForm('startDate', event.target.value)}
                  />
                </label>
                <label className="closet-field">
                  <span>End date</span>
                  <Input
                    name="packing-end-date"
                    type="date"
                    className="closet-packing-date-input"
                    value={form.endDate}
                    onChange={(event) => updateForm('endDate', event.target.value)}
                  />
                </label>
              </div>

              <div className="closet-field">
                <span>Status</span>
                <WardrobeSelect
                  value={form.status}
                  onValueChange={(value) => updateForm('status', value === 'packed' ? 'packed' : 'planning')}
                  placeholder="Select status"
                  options={PACKING_STATUS_OPTIONS}
                  ariaLabel="Status"
                />
              </div>

              <label className="closet-field">
                <span>Notes</span>
                <textarea name="packing-notes" value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} rows={3} />
              </label>
            </fieldset>

            <div className="closet-packing-detail__meta">
              <p className={`closet-packing-detail__message closet-packing-detail__message--${detailState}`} role="status" aria-live="polite">
                {detailError}
              </p>

              {confirmingDelete ? (
                <div className="closet-delete-confirm">
                  <strong>Delete this packing plan?</strong>
                  <span>This removes the checklist. Your outfits and wardrobe stay.</span>
                  <div>
                    <Button type="button" variant="outline" color="neutral" onClick={() => setConfirmingDelete(false)}>
                      Cancel
                    </Button>
                    <Button type="button" color="destructive" onClick={() => void deleteSelectedPlan()}>
                      {detailState === 'deleting' ? 'Deleting...' : 'Delete plan'}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="closet-packing-detail__actions">
                <button
                  type="button"
                  className="button button--normal button--primary button--md"
                  disabled={detailState === 'saving' || detailState === 'deleting'}
                  onClick={() => void savePlan()}
                >
                  {detailState === 'saving' ? 'Saving...' : isCreating ? 'Create plan' : 'Save changes'}
                </button>
                {!isCreating && selectedPlan ? (
                  <Button
                    type="button"
                    variant="outline"
                    color="destructive"
                    disabled={detailState === 'deleting'}
                    onClick={() => setConfirmingDelete(true)}
                  >
                    <Trash2 size={16} strokeWidth={1.4} aria-hidden="true" />
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="closet-packing-checklist">
              <ChecklistSection
                title="Outfits"
                emptyText="No outfits added yet."
                addLabel="Add outfits"
                onAdd={() => {
                  setAddMode('outfits')
                  setAddSearch('')
                }}
              >
                {checklistOutfits.map((row) => (
                  <PackingOutfitRow
                    key={row.id}
                    row={row}
                    wardrobe={items}
                    toggleDisabled={!selectedPlan}
                    onToggle={(packed) => {
                      if (selectedPlan) void toggleOutfit(row, packed)
                    }}
                    onRemove={() => {
                      if (selectedPlan) {
                        void removeOutfit(row)
                      } else {
                        removeDraftOutfit(row.outfit.id)
                      }
                    }}
                  />
                ))}
              </ChecklistSection>

              <ChecklistSection
                title="Wardrobe items"
                emptyText="No wardrobe items added yet."
                addLabel="Add wardrobe items"
                onAdd={() => {
                  setAddMode('items')
                  setAddSearch('')
                }}
              >
                {checklistItems.map((row) => (
                  <PackingItemRow
                    key={row.id}
                    row={row}
                    toggleDisabled={!selectedPlan}
                    onToggle={(packed) => {
                      if (selectedPlan) void toggleItem(row, packed)
                    }}
                    onRemove={() => {
                      if (selectedPlan) {
                        void removeItem(row)
                      } else {
                        removeDraftItem(row.item.id)
                      }
                    }}
                  />
                ))}
              </ChecklistSection>
            </div>
          </>
        ) : (
          <ClosetEmptyState
            title="Select or create a packing plan."
            description="Use one checklist for trips, repeatable bags, or event packing."
          />
        )}

        <div className="closet-packing-status" role="status" aria-live="polite" aria-atomic="true">
          {statusMessage}
        </div>
      </form>

      <PackingAddOverlay
        mode={addMode}
        open={addMode !== null}
        isMobileViewport={isMobileViewport}
        search={addSearch}
        onSearchChange={setAddSearch}
        outfits={availableOutfits}
        items={availableItems}
        wardrobe={items}
        outfitError={outfitLoadError}
        onClose={() => setAddMode(null)}
        onAddOutfit={(outfitId) => void addOutfitToPlan(outfitId)}
        onAddItem={(itemId) => void addItemToPlan(itemId)}
      />
    </section>
  )
}

function ChecklistSection({
  title,
  emptyText,
  addLabel,
  onAdd,
  children,
}: {
  title: string
  emptyText: string
  addLabel: string
  onAdd: () => void
  children: ReactNode[]
}) {
  const sectionId = `packing-section-${title.replace(/\W+/g, '-').toLowerCase()}`

  return (
    <section className="closet-packing-section" aria-labelledby={sectionId}>
      <div className="closet-packing-section__header">
        <div className="closet-packing-section__titlebar">
          <h3 id={sectionId}>{title}</h3>
          <PackingSectionAddButton label={addLabel} onClick={onAdd} />
        </div>
        <span>
          {children.length} {children.length === 1 ? 'row' : 'rows'}
        </span>
      </div>
      {children.length > 0 ? (
        <div className="closet-packing-rows">{children}</div>
      ) : (
        <p className="closet-packing-section__empty">{emptyText}</p>
      )}
    </section>
  )
}

function PackingSectionAddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <Button
            className="closet-packing-section__add"
            size="icon"
            variant="ghost"
            color="neutral"
            type="button"
            aria-label={label}
            onClick={onClick}
          />
        )}
      >
        <Plus size={16} strokeWidth={1.4} aria-hidden="true" />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipPositioner side="top" sideOffset={4}>
          <TooltipPopup>
            <TooltipArrow />
            {label}
          </TooltipPopup>
        </TooltipPositioner>
      </TooltipPortal>
    </Tooltip>
  )
}

function PackingOutfitRow({
  row,
  wardrobe,
  toggleDisabled = false,
  onToggle,
  onRemove,
}: {
  row: PackingPlanOutfit
  wardrobe: WardrobeItem[]
  toggleDisabled?: boolean
  onToggle: (packed: boolean) => void
  onRemove: () => void
}) {
  const placement = useMemo(() => outfitToPlacement(row.outfit, wardrobe), [row.outfit, wardrobe])
  const packed = row.packedAt !== null

  return (
    <article className={`closet-packing-row ${packed ? 'closet-packing-row--packed' : ''}`}>
      <Checkbox
        checked={packed}
        disabled={toggleDisabled}
        onCheckedChange={(checked) => onToggle(checked === true)}
        aria-label={`${packed ? 'Mark unpacked' : 'Mark packed'}: ${row.outfit.name}`}
      />
      <span className="closet-packing-row__preview closet-packing-row__preview--outfit" aria-hidden="true">
        <Canvas placement={placement} interactive={false} />
      </span>
      <span className="closet-packing-row__body">
        <span className="closet-packing-row__title">{row.outfit.name}</span>
        <span className="closet-packing-row__meta">
          {row.outfit.items.length} {row.outfit.items.length === 1 ? 'piece' : 'pieces'}
        </span>
      </span>
      <Button size="icon" variant="ghost" color="neutral" type="button" aria-label={`Remove ${row.outfit.name}`} onClick={onRemove}>
        <Trash2 size={16} strokeWidth={1.4} aria-hidden="true" />
      </Button>
    </article>
  )
}

function PackingItemRow({
  row,
  toggleDisabled = false,
  onToggle,
  onRemove,
}: {
  row: PackingPlanItem
  toggleDisabled?: boolean
  onToggle: (packed: boolean) => void
  onRemove: () => void
}) {
  const packed = row.packedAt !== null

  return (
    <article className={`closet-packing-row ${packed ? 'closet-packing-row--packed' : ''}`}>
      <Checkbox
        checked={packed}
        disabled={toggleDisabled}
        onCheckedChange={(checked) => onToggle(checked === true)}
        aria-label={`${packed ? 'Mark unpacked' : 'Mark packed'}: ${row.item.name}`}
      />
      <span className="closet-packing-row__preview">
        {row.item.media ? (
          <CachedImage src={row.item.media.url} alt="" />
        ) : (
          <span>No cutout</span>
        )}
      </span>
      <span className="closet-packing-row__body">
        <span className="closet-packing-row__title">{row.item.name}</span>
        <span className="closet-packing-row__meta">{[row.item.category, row.item.color].filter(Boolean).join(' · ')}</span>
      </span>
      <Button size="icon" variant="ghost" color="neutral" type="button" aria-label={`Remove ${row.item.name}`} onClick={onRemove}>
        <Trash2 size={16} strokeWidth={1.4} aria-hidden="true" />
      </Button>
    </article>
  )
}

function PackingAddOverlay({
  mode,
  open,
  isMobileViewport,
  search,
  onSearchChange,
  outfits,
  items,
  wardrobe,
  outfitError,
  onClose,
  onAddOutfit,
  onAddItem,
}: {
  mode: PackingAddMode | null
  open: boolean
  isMobileViewport: boolean
  search: string
  onSearchChange: (value: string) => void
  outfits: Outfit[]
  items: WardrobeItem[]
  wardrobe: WardrobeItem[]
  outfitError: string
  onClose: () => void
  onAddOutfit: (outfitId: string) => void
  onAddItem: (itemId: string) => void
}) {
  const title = mode === 'outfits' ? 'Add outfits' : 'Add wardrobe items'
  const filteredOutfits = useMemo(() => filterOutfits(outfits, search), [outfits, search])
  const filteredItems = useMemo(() => filterItems(items, search), [items, search])
  const body = (
    <div className="closet-packing-add">
      <label className="closet-search closet-packing-add__search">
        <Search size={16} strokeWidth={1.4} aria-hidden="true" />
        <span className="sr-only">Search</span>
        <Input value={search} placeholder={mode === 'outfits' ? 'Search outfits' : 'Search wardrobe'} onChange={(event) => onSearchChange(event.target.value)} />
      </label>

      {mode === 'outfits' && outfitError ? (
        <div className="closet-empty">
          <strong>Couldn't load outfits.</strong>
          <span>{outfitError}</span>
        </div>
      ) : mode === 'outfits' ? (
        <div className="closet-packing-add__list closet-packing-add__list--outfits">
          {filteredOutfits.length > 0 ? filteredOutfits.map((outfit) => (
            <PackingAddOutfitRow key={outfit.id} outfit={outfit} wardrobe={wardrobe} onAdd={() => onAddOutfit(outfit.id)} />
          )) : <p className="closet-packing-section__empty closet-packing-add__empty">No available outfits match.</p>}
        </div>
      ) : (
        <div className="closet-packing-add__list closet-packing-add__list--items">
          {filteredItems.length > 0 ? filteredItems.map((item) => (
            <PackingAddItemRow key={item.id} item={item} onAdd={() => onAddItem(item.id)} />
          )) : <p className="closet-packing-section__empty closet-packing-add__empty">No available wardrobe items match.</p>}
        </div>
      )}
    </div>
  )

  if (isMobileViewport) {
    return (
      <Drawer open={open} modal onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}>
        <DrawerPortal>
          <DrawerBackdrop />
          <DrawerViewport>
            <DrawerPopup side="bottom" className="closet-packing-add-drawer">
              <DrawerContent className="closet-packing-add-drawer__content" data-base-ui-swipe-ignore>
                <div className="closet-packing-add__topbar">
                  <DrawerTitle className="closet-packing-add__title">{title}</DrawerTitle>
                  <DrawerClose className="closet-packing-add__close" aria-label="Close">
                    <X size={18} strokeWidth={1.35} aria-hidden="true" />
                  </DrawerClose>
                </div>
                <div className="closet-packing-add__content">{body}</div>
              </DrawerContent>
            </DrawerPopup>
          </DrawerViewport>
        </DrawerPortal>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onClose()
    }}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup size="md" className="closet-packing-add-dialog">
          <div className="closet-packing-add__topbar">
            <DialogTitle className="closet-packing-add__title">{title}</DialogTitle>
            <DialogClose className="closet-packing-add__close" aria-label="Close">
              <X size={18} strokeWidth={1.35} aria-hidden="true" />
            </DialogClose>
          </div>
          <div className="closet-packing-add__content">{body}</div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}

function PackingAddOutfitRow({ outfit, wardrobe, onAdd }: { outfit: Outfit; wardrobe: WardrobeItem[]; onAdd: () => void }) {
  const placement = useMemo(() => outfitToPlacement(outfit, wardrobe), [outfit, wardrobe])

  return (
    <article className="closet-packing-add-row">
      <span className="closet-packing-add-row__preview closet-packing-add-row__preview--outfit" aria-hidden="true">
        <Canvas placement={placement} interactive={false} />
      </span>
      <span className="closet-packing-add-row__body">
        <span className="closet-packing-add-row__title">{outfit.name}</span>
        <span className="closet-packing-add-row__meta">
          {outfit.items.length} {outfit.items.length === 1 ? 'piece' : 'pieces'}
        </span>
      </span>
      <Button className="closet-packing-add-row__action" variant="outline" color="neutral" type="button" aria-label={`Add outfit ${outfit.name}`} onClick={onAdd}>
        Add
      </Button>
    </article>
  )
}

function PackingAddItemRow({ item, onAdd }: { item: WardrobeItem; onAdd: () => void }) {
  return (
    <article className="closet-packing-add-row">
      <span className="closet-packing-add-row__preview">
        {item.media ? (
          <CachedImage className="closet-packing-add-row__image" src={item.media.url} alt="" />
        ) : (
          <span>No cutout</span>
        )}
      </span>
      <span className="closet-packing-add-row__body">
        <span className="closet-packing-add-row__title">{item.name}</span>
        <span className="closet-packing-add-row__meta">{[item.category, item.color].filter(Boolean).join(' · ')}</span>
      </span>
      <Button className="closet-packing-add-row__action" variant="outline" color="neutral" type="button" aria-label={`Add ${item.name}`} onClick={onAdd}>
        Add
      </Button>
    </article>
  )
}

function filterOutfits(outfits: Outfit[], query: string) {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return outfits
  return outfits.filter((outfit) =>
    [outfit.name, outfit.category, outfit.occasion, outfit.season, outfit.notes]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(trimmed),
  )
}

function filterItems(items: WardrobeItem[], query: string) {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return items
  return items.filter((item) =>
    [item.name, item.category, item.subcategory, item.color, item.occasion, item.season, item.notes]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(trimmed),
  )
}
