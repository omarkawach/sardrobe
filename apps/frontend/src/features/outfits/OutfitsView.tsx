import {
  Button,
  Dialog,
  DialogBackdrop,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  Drawer,
  DrawerBackdrop,
  DrawerContent,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from '@sardrobe/react-components'
import { Plus } from 'lucide-react'
import { useCallback, useEffect, useEffectEvent, useMemo, useState, type ReactNode } from 'react'
import { EditableNameTitle } from '../../components/closet/EditableNameTitle'
import type { WardrobeItem } from '../wardrobe/domain'
import { createOutfit, deleteOutfit, listOutfits, updateOutfit } from './api'
import { BuilderBody } from './BuilderBody'
import {
  clampScale,
  clampUnit,
  defaultZIndexForPlacement,
  emptyFormFromOutfit,
  emptyPlacement,
  findSingleSlotPlacementIndex,
  initialOutfitFormState,
  legacyPositionFor,
  outfitToPlacement,
  placementToPayload,
  ROLE_LABEL,
  wardrobeCategoryToRole,
  type BuilderMode,
  type BuilderSaveState,
  type BuilderStep,
  type CreateOutfitPayload,
  type DeleteState,
  type GalleryState,
  type Outfit,
  type OutfitFormState,
  type PickerTab,
  type PlacedItem,
  type SingleSlotRole,
} from './domain'
import { OutfitCard } from './OutfitCard'
import { LocalAiPlanningComposer } from '../local-ai/LocalAiPlanningComposer'
import type { LocalAiOutfitSuggestion, LocalAiStatus } from '../local-ai/types'

type OutfitsViewProps = {
  agentEvent: OutfitsAgentEvent | null
  items: WardrobeItem[]
  isMobileViewport: boolean
  localAiStatus: LocalAiStatus
  onAgentEventHandled: (sequence: number) => void
  onLocalAiStatusChange: (status: LocalAiStatus) => void
  onNavigateToUpload: () => void
  privateAiEnabled: boolean
}

export type OutfitsAgentEvent =
  | { sequence: number; type: 'created' | 'updated'; outfit: Outfit }
  | { sequence: number; type: 'deleted'; outfitId: string }

export function OutfitsView({ agentEvent, items, isMobileViewport, localAiStatus, onAgentEventHandled, onLocalAiStatusChange, onNavigateToUpload, privateAiEnabled }: OutfitsViewProps) {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [galleryState, setGalleryState] = useState<GalleryState>('loading')
  const [galleryError, setGalleryError] = useState('')

  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderMode, setBuilderMode] = useState<BuilderMode>('create')
  const [builderStep, setBuilderStep] = useState<BuilderStep>('compose')
  const [builderOutfitId, setBuilderOutfitId] = useState<string | null>(null)
  const [builderForm, setBuilderForm] = useState<OutfitFormState>(initialOutfitFormState)
  const [builderPlacement, setBuilderPlacement] = useState<PlacedItem[]>(emptyPlacement)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [builderSaveState, setBuilderSaveState] = useState<BuilderSaveState>('idle')
  const [builderErrorMessage, setBuilderErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [deleteState, setDeleteState] = useState<DeleteState>('idle')
  const [deleteError, setDeleteError] = useState('')

  const [pickerTab, setPickerTab] = useState<PickerTab>('Tops')
  const [pickerSearch, setPickerSearch] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setGalleryState('loading')
      setGalleryError('')
      const result = await listOutfits()

      if (!active) return

      if ('error' in result) {
        setGalleryError(result.error)
        setGalleryState('error')
        return
      }

      setOutfits(result)
      setGalleryState('idle')
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const handleAgentEvent = useEffectEvent((event: OutfitsAgentEvent) => {
    if (event.type === 'deleted') {
      setOutfits((current) => current.filter((outfit) => outfit.id !== event.outfitId))
      if (builderOutfitId === event.outfitId) {
        closeBuilder()
        setBuilderOutfitId(null)
      }
      setBuilderSaveState('idle')
      setBuilderErrorMessage('')
      setDeleteState('idle')
      setDeleteError('')
      setGalleryState('idle')
      setGalleryError('')
      setStatusMessage('Outfit deleted by agent.')
      onAgentEventHandled(event.sequence)
      return
    }

    setOutfits((current) => {
      const exists = current.some((outfit) => outfit.id === event.outfit.id)
      return exists
        ? current.map((outfit) => (outfit.id === event.outfit.id ? event.outfit : outfit))
        : [event.outfit, ...current]
    })
    setGalleryState('idle')
    setGalleryError('')
    openEditBuilder(event.outfit)
    setBuilderSaveState('idle')
    setBuilderErrorMessage('')
    setDeleteState('idle')
    setDeleteError('')
    setStatusMessage(event.type === 'created' ? 'Outfit created by agent.' : 'Outfit updated by agent.')
    onAgentEventHandled(event.sequence)
  })

  useEffect(() => {
    if (agentEvent) handleAgentEvent(agentEvent)
  }, [agentEvent])

  const filteredPickerItems = useMemo(() => {
    const trimmed = pickerSearch.trim().toLowerCase()
    return items.filter((item) => {
      if (item.category !== pickerTab) return false
      if (!trimmed) return true
      const haystack = [item.name, item.category, item.subcategory, item.color]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(trimmed)
    })
  }, [items, pickerSearch, pickerTab])

  const placedCount = builderPlacement.length
  const canProceedToStep2 = placedCount > 0
  const canSave = builderForm.name.trim().length > 0 && placedCount > 0

  function announce(message: string) {
    setStatusMessage(message)
  }

  function resetBuilderState() {
    setBuilderMode('create')
    setBuilderStep('compose')
    setBuilderOutfitId(null)
    setBuilderForm(initialOutfitFormState)
    setBuilderPlacement(emptyPlacement)
    setSelectedItemId(null)
    setBuilderSaveState('idle')
    setBuilderErrorMessage('')
    setDeleteState('idle')
    setDeleteError('')
    setPickerTab('Tops')
    setPickerSearch('')
    setStatusMessage('')
  }

  function openCreateBuilder() {
    resetBuilderState()
    setBuilderOpen(true)
  }

  function openEditBuilder(outfit: Outfit) {
    resetBuilderState()
    setBuilderMode('edit')
    setBuilderOutfitId(outfit.id)
    setBuilderForm(emptyFormFromOutfit(outfit))
    setBuilderPlacement(outfitToPlacement(outfit, items))
    setBuilderStep('describe')
    setBuilderOpen(true)
  }

  function closeBuilder() {
    setBuilderOpen(false)
  }

  function updateForm<K extends keyof OutfitFormState>(key: K, value: OutfitFormState[K]) {
    setBuilderForm((current) => ({ ...current, [key]: value }))
  }

  function applyLocalAiOutfit(suggestion: LocalAiOutfitSuggestion) {
    setBuilderForm(suggestion.form)
    setBuilderPlacement(placementFromLocalAi(suggestion.itemIds, items))
    setSelectedItemId(null)
    setBuilderStep('describe')
    setStatusMessage('AI filled this outfit. Review it before saving.')
  }

  function placeItem(item: WardrobeItem) {
    const role = wardrobeCategoryToRole(item)

    setBuilderPlacement((current) => {
      const existingIndex = current.findIndex((placed) => placed.item.id === item.id)

      if (existingIndex >= 0) {
        announce(`Removed ${item.name}.`)
        return current.filter((_, index) => index !== existingIndex)
      }

      const accessoriesPlaced = current.filter((placed) => placed.role === 'accessories').length
      const legacy = legacyPositionFor(role, accessoriesPlaced)
      const newPlaced: PlacedItem = {
        item,
        role,
        x: legacy.x,
        y: legacy.y,
        scale: 1,
        rotation: 0,
        zIndex: defaultZIndexForPlacement(role, current),
      }

      if (role === 'accessories') {
        announce(`Added ${item.name} as accessory.`)
        return [...current, newPlaced]
      }

      const slotRole = role as SingleSlotRole
      const replacedIndex = findSingleSlotPlacementIndex(current, slotRole)

      if (replacedIndex >= 0) {
        const replaced = current[replacedIndex]
        announce(`Replaced ${replaced.item.name} with ${item.name}.`)
        const next = current.slice()
        next[replacedIndex] = { ...newPlaced, x: replaced.x, y: replaced.y, scale: replaced.scale, rotation: replaced.rotation, zIndex: replaced.zIndex }
        return next
      }

      announce(`Added ${item.name} as ${ROLE_LABEL[slotRole].toLowerCase()}.`)
      return [...current, newPlaced]
    })
  }

  const moveItem = useCallback((itemId: string, x: number, y: number) => {
    setBuilderPlacement((current) =>
      current.map((placed) =>
        placed.item.id === itemId ? { ...placed, x: clampUnit(x), y: clampUnit(y) } : placed,
      ),
    )
  }, [])

  const scaleItem = useCallback((itemId: string, scale: number) => {
    setBuilderPlacement((current) =>
      current.map((placed) =>
        placed.item.id === itemId ? { ...placed, scale: clampScale(scale) } : placed,
      ),
    )
  }, [])

  const adjustZIndex = useCallback((itemId: string, mode: 'front' | 'back') => {
    setBuilderPlacement((current) => {
      if (current.length === 0) return current
      const max = current.reduce((acc, placed) => Math.max(acc, placed.zIndex), -Infinity)
      const min = current.reduce((acc, placed) => Math.min(acc, placed.zIndex), Infinity)
      return current.map((placed) => {
        if (placed.item.id !== itemId) return placed
        if (mode === 'front') return { ...placed, zIndex: max + 1 }
        return { ...placed, zIndex: min - 1 }
      })
    })
  }, [])

  const removePlacedItem = useCallback((itemId: string) => {
    setBuilderPlacement((current) => current.filter((placed) => placed.item.id !== itemId))
    setSelectedItemId((current) => (current === itemId ? null : current))
  }, [])

  async function handleSave() {
    if (!canSave || builderSaveState === 'saving') return

    setBuilderSaveState('saving')
    setBuilderErrorMessage('')
    announce('Saving outfit…')

    const payload: CreateOutfitPayload = {
      name: builderForm.name.trim(),
      category: builderForm.category.trim() || null,
      source: builderForm.source.trim() || null,
      description: builderForm.description.trim() || null,
      stylingFormula: builderForm.stylingFormula.trim() || null,
      occasion: builderForm.occasion.trim() || null,
      season: builderForm.season.trim() || null,
      notes: builderForm.notes.trim() || null,
      items: placementToPayload(builderPlacement),
    }

    const result =
      builderMode === 'edit' && builderOutfitId
        ? await updateOutfit(builderOutfitId, payload)
        : await createOutfit(payload)

    if ('error' in result) {
      setBuilderSaveState('error')
      setBuilderErrorMessage(result.error)
      announce(`Couldn't save outfit: ${result.error}`)
      return
    }

    setOutfits((current) => {
      const exists = current.some((outfit) => outfit.id === result.id)
      if (exists) {
        return current.map((outfit) => (outfit.id === result.id ? result : outfit))
      }
      return [result, ...current]
    })
    setBuilderSaveState('idle')
    announce(builderMode === 'edit' ? 'Outfit updated.' : 'Outfit saved.')
    setBuilderOpen(false)
  }

  async function handleDeleteConfirm() {
    if (!builderOutfitId || deleteState === 'deleting') return

    setDeleteState('deleting')
    setDeleteError('')
    announce('Deleting outfit…')

    const result = await deleteOutfit(builderOutfitId)

    if ('error' in result) {
      setDeleteState('error')
      setDeleteError(result.error)
      announce(`Couldn't delete outfit: ${result.error}`)
      return
    }

    setOutfits((current) => current.filter((outfit) => outfit.id !== builderOutfitId))
    setDeleteState('idle')
    announce('Outfit deleted.')
    setBuilderOpen(false)
  }

  const builderTitleFallback = builderMode === 'edit' ? 'Untitled outfit' : 'New outfit'
  const stepIndicator = builderStep === 'compose' ? 'Step 1 of 2' : 'Step 2 of 2'

  const builderBodyWithTitle = (titleSlot: ReactNode) =>
    builderOpen ? (
      <BuilderBody
        mode={builderMode}
        step={builderStep}
        titleSlot={titleSlot}
        aiComposer={privateAiEnabled ? (
          <LocalAiPlanningComposer
            mode="outfits"
            items={items}
            status={localAiStatus}
            onApply={applyLocalAiOutfit}
            onStatusChange={onLocalAiStatusChange}
          />
        ) : null}
        form={builderForm}
        placement={builderPlacement}
        selectedItemId={selectedItemId}
        onSelectItem={setSelectedItemId}
        onMoveItem={moveItem}
        onScaleItem={scaleItem}
        onAdjustZIndex={adjustZIndex}
        onRemovePlacedItem={removePlacedItem}
        pickerTab={pickerTab}
        pickerSearch={pickerSearch}
        pickerItems={filteredPickerItems}
        wardrobeEmpty={items.length === 0}
        onPickerTabChange={setPickerTab}
        onPickerSearchChange={setPickerSearch}
        onPlaceItem={placeItem}
        onFormChange={updateForm}
        onStepChange={setBuilderStep}
        onClose={closeBuilder}
        onSave={handleSave}
        onRequestDelete={() => setDeleteState('confirming')}
        onCancelDelete={() => {
          setDeleteState('idle')
          setDeleteError('')
        }}
        onConfirmDelete={handleDeleteConfirm}
        saveState={builderSaveState}
        saveError={builderErrorMessage}
        deleteState={deleteState}
        deleteError={deleteError}
        canProceedToStep2={canProceedToStep2}
        canSave={canSave}
        stepIndicator={stepIndicator}
        onNavigateToUpload={onNavigateToUpload}
      />
    ) : null

  const builderTitleSlot = (Title: typeof DialogTitle | typeof DrawerTitle) => (
    <EditableNameTitle
      value={builderForm.name}
      fallback={builderTitleFallback}
      label="Outfit name"
      name="outfit-name"
      disabled={builderSaveState === 'saving'}
      onChange={(value) => updateForm('name', value)}
      renderTitle={(className, children, title) => (
        <Title className={`${className} closet-builder__title`} title={title}>
          {children}
        </Title>
      )}
    />
  )

  return (
    <section className="closet-outfits-view" aria-labelledby="outfits-title">
      <div className="closet-panel closet-outfits">
        <div className="closet-outfits__header">
          <div>
            <h1 id="outfits-title">Outfits</h1>
            <span className="closet-outfits__count">
              {outfits.length} {outfits.length === 1 ? 'saved look' : 'saved looks'}
            </span>
          </div>
          <div className="closet-outfits__actions">
            <Button color="primary" type="button" onClick={openCreateBuilder} className="closet-outfits__new-button">
              <Plus size={16} strokeWidth={1.4} aria-hidden="true" />
              New outfit
            </Button>
          </div>
        </div>

        {galleryState === 'loading' ? (
          <p className="closet-empty" role="status">
            Loading outfits…
          </p>
        ) : galleryState === 'error' ? (
          <div className="closet-empty">
            <strong>Couldn't load your outfits.</strong>
            <span>{galleryError}</span>
            <Button
              color="primary"
              type="button"
              onClick={() => {
                setGalleryState('loading')
                void listOutfits().then((result) => {
                  if ('error' in result) {
                    setGalleryError(result.error)
                    setGalleryState('error')
                  } else {
                    setOutfits(result)
                    setGalleryState('idle')
                  }
                })
              }}
            >
              Try again
            </Button>
          </div>
        ) : outfits.length === 0 ? (
          <div className="closet-empty">
            <strong>No outfits yet.</strong>
            <span>Build a look from your saved pieces.</span>
          </div>
        ) : (
          <div className="closet-outfit-grid" aria-live="polite">
            {outfits.map((outfit) => (
              <OutfitCard key={outfit.id} outfit={outfit} wardrobe={items} onOpen={() => openEditBuilder(outfit)} />
            ))}
          </div>
        )}

        <div className="closet-builder__status" role="status" aria-live="polite" aria-atomic="true">
          {statusMessage}
        </div>

        {isMobileViewport ? (
          <Drawer
            open={builderOpen}
            modal
            onOpenChange={(open) => {
              if (!open) closeBuilder()
            }}
          >
            <DrawerPortal>
              <DrawerBackdrop />
              <DrawerViewport>
                <DrawerPopup side="bottom" className="closet-builder-drawer">
                  <DrawerContent className="closet-builder-drawer__content" data-base-ui-swipe-ignore>
                    {builderBodyWithTitle(builderTitleSlot(DrawerTitle))}
                  </DrawerContent>
                </DrawerPopup>
              </DrawerViewport>
            </DrawerPortal>
          </Drawer>
        ) : (
          <Dialog
            open={builderOpen}
            onOpenChange={(open) => {
              if (!open) closeBuilder()
            }}
          >
            <DialogPortal>
              <DialogBackdrop />
              <DialogPopup size="lg" className="closet-builder-dialog">
                {builderBodyWithTitle(builderTitleSlot(DialogTitle))}
              </DialogPopup>
            </DialogPortal>
          </Dialog>
        )}
      </div>
    </section>
  )
}

function placementFromLocalAi(itemIds: string[], items: WardrobeItem[]): PlacedItem[] {
  const itemById = new Map(items.map((item) => [item.id, item]))
  const placement: PlacedItem[] = []

  for (const itemId of itemIds) {
    const item = itemById.get(itemId)
    if (!item) continue
    const role = wardrobeCategoryToRole(item)
    if (role !== 'accessories' && placement.some((placed) => placed.role === role)) continue
    const accessoriesPlaced = placement.filter((placed) => placed.role === 'accessories').length
    const position = legacyPositionFor(role, accessoriesPlaced)
    placement.push({
      item,
      role,
      x: position.x,
      y: position.y,
      scale: 1,
      rotation: 0,
      zIndex: defaultZIndexForPlacement(role, placement),
    })
  }

  return placement
}
