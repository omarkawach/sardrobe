import { useEffect, useRef, useState } from 'react'
import { OutfitsView, type OutfitsAgentEvent } from '../outfits/OutfitsView'
import type { Outfit } from '../outfits/domain'
import { PackingView, type PackingAgentEvent } from '../packing/PackingView'
import type { PackingPlan } from '../packing/domain'
import { FiltersDrawer } from './FiltersDrawer'
import { ImportView } from './ImportView'
import { ItemDetailOverlay } from './ItemDetailOverlay'
import { WardrobeLibraryView } from './WardrobeLibraryView'
import { WorkspaceMobileHeader, WorkspaceMobileNav, WorkspaceSidebar, type WorkspaceUser } from './WorkspaceNavigation'
import { WARDROBE_ITEM_LIMIT, type WardrobeItem } from './domain'
import { sectionFromLocationHash, sectionToHash, type ClosetSection } from './navigation'
import { useClosetFilters } from './useClosetFilters'
import { useImportDrafts } from './useImportDrafts'
import { useItemDetail } from './useItemDetail'
import { useWardrobeItems } from './useWardrobeItems'
import { useSardrobeWebMcpTools } from '../webmcp/useSardrobeWebMcpTools'
import { finishLocalAiLoad, getInterruptedLocalAiLoad } from '../local-ai/lifecycle'
import { isMobileOrTabletDevice } from '../local-ai/support'
import type { LocalAiStatus } from '../local-ai/types'

type WardrobeWorkspaceProps = {
  user: WorkspaceUser
}

const PRIVATE_AI_ENABLED_KEY = 'sardrobe-private-ai-enabled'

export function WardrobeWorkspace({ user }: WardrobeWorkspaceProps) {
  const [interruptedLocalAiLoad] = useState(() => getInterruptedLocalAiLoad())
  const [mobileOrTablet] = useState(() => (
    typeof window !== 'undefined' && isMobileOrTabletDevice(window.navigator)
  ))
  const { items, isLoading, refreshItems, applyItemUpdate, removeItem } = useWardrobeItems()
  const agentEventSequenceRef = useRef(0)
  const [activeSection, setActiveSection] = useState<ClosetSection>(() => sectionFromLocationHash() ?? 'wardrobe')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [localAiStatus, setLocalAiStatus] = useState<LocalAiStatus>({
    phase: 'idle',
    message: 'AI runs on this device.',
    progress: null,
  })
  const [privateAiEnabled, setPrivateAiEnabled] = useState(() => (
    typeof window !== 'undefined'
      && !isMobileOrTabletDevice(window.navigator)
      && !interruptedLocalAiLoad
      && window.localStorage.getItem(PRIVATE_AI_ENABLED_KEY) === 'true'
  ))
  const [outfitAgentEvent, setOutfitAgentEvent] = useState<OutfitsAgentEvent | null>(null)
  const [packingAgentEvent, setPackingAgentEvent] = useState<PackingAgentEvent | null>(null)
  const filters = useClosetFilters(items)
  const imports = useImportDrafts(refreshItems)
  const itemDetail = useItemDetail({ applyItemUpdate, removeItem })

  function nextAgentEventSequence() {
    agentEventSequenceRef.current += 1
    return agentEventSequenceRef.current
  }

  function revealAgentItemUpdate(item: WardrobeItem) {
    itemDetail.showAgentItemUpdate(item)
    setActiveSection('wardrobe')
    setMobileFiltersOpen(false)
  }

  function removeAgentDeletedItem(itemId: string) {
    itemDetail.removeAgentDeletedItem(itemId)
    setActiveSection('wardrobe')
    setMobileFiltersOpen(false)
  }

  function revealAgentImportDraft(draftId: string) {
    imports.revealAgentDraftUpdate(draftId)
    setActiveSection('import')
    setMobileFiltersOpen(false)
  }

  function revealAgentImportDraftList() {
    imports.revealAgentDraftList()
    setActiveSection('import')
    setMobileFiltersOpen(false)
  }

  function revealAgentOutfitUpdate(outfit: Outfit, mode: 'created' | 'updated') {
    setOutfitAgentEvent({ sequence: nextAgentEventSequence(), type: mode, outfit })
    setActiveSection('outfits')
    setMobileFiltersOpen(false)
  }

  function revealAgentOutfitDelete(outfitId: string) {
    setOutfitAgentEvent({ sequence: nextAgentEventSequence(), type: 'deleted', outfitId })
    setActiveSection('outfits')
    setMobileFiltersOpen(false)
  }

  function revealAgentPackingPlanUpdate(plan: PackingPlan, mode: 'created' | 'updated') {
    setPackingAgentEvent({ sequence: nextAgentEventSequence(), type: mode, plan })
    setActiveSection('packing')
    setMobileFiltersOpen(false)
  }

  function revealAgentPackingPlanDelete(planId: string) {
    setPackingAgentEvent({ sequence: nextAgentEventSequence(), type: 'deleted', planId })
    setActiveSection('packing')
    setMobileFiltersOpen(false)
  }

  function clearOutfitAgentEvent(sequence: number) {
    setOutfitAgentEvent((current) => (current?.sequence === sequence ? null : current))
  }

  function clearPackingAgentEvent(sequence: number) {
    setPackingAgentEvent((current) => (current?.sequence === sequence ? null : current))
  }

  useSardrobeWebMcpTools({
    applyItemUpdate: revealAgentItemUpdate,
    drafts: imports.drafts,
    revealImportDraft: revealAgentImportDraft,
    revealImportDraftList: revealAgentImportDraftList,
    revealOutfitDelete: revealAgentOutfitDelete,
    revealOutfitUpdate: revealAgentOutfitUpdate,
    revealPackingPlanDelete: revealAgentPackingPlanDelete,
    revealPackingPlanUpdate: revealAgentPackingPlanUpdate,
    refreshItems,
    removeDraft: imports.removeDraft,
    removeItem: removeAgentDeletedItem,
    saveDraftById: imports.saveDraftById,
    updateDraftForm: imports.updateDraftForm,
    user,
  })

  useEffect(() => {
    if (!interruptedLocalAiLoad || typeof window === 'undefined') return

    finishLocalAiLoad()
    window.localStorage.setItem(PRIVATE_AI_ENABLED_KEY, 'false')
    if (mobileOrTablet) return

    setLocalAiStatus({
      phase: 'error',
      message: 'On-device planning AI was turned off because the previous model load did not finish.',
      progress: interruptedLocalAiLoad.progress,
    })

    void import('@sentry/astro').then((Sentry) => {
      Sentry.withScope((scope) => {
        scope.setLevel('warning')
        scope.setTag('local_ai_load_interrupted', 'true')
        scope.setContext('local_ai_load', {
          progress: interruptedLocalAiLoad.progress,
          elapsedMilliseconds: Date.now() - interruptedLocalAiLoad.startedAt,
        })
        Sentry.captureMessage('On-device planning AI model load was interrupted before completion')
      })
    }).catch(() => undefined)
  }, [interruptedLocalAiLoad, mobileOrTablet])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(max-width: 62rem)')
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches)

    syncViewport()
    mediaQuery.addEventListener('change', syncViewport)

    return () => {
      mediaQuery.removeEventListener('change', syncViewport)
    }
  }, [])

  useEffect(() => {
    if (mobileOrTablet || !privateAiEnabled) return

    let active = true
    void import('../local-ai/runtime')
      .then(({ prepareLocalAi }) => prepareLocalAi((status) => {
        if (active) setLocalAiStatus(status)
      }))
      .then(() => {
        if (active) {
          setLocalAiStatus({ phase: 'ready', message: 'AI is ready on this device.', progress: 100 })
        }
      })
      .catch((caught: unknown) => {
        if (!active) return
        const unsupported = caught instanceof Error && caught.name === 'LocalAiUnsupportedError'
        setLocalAiStatus({
          phase: unsupported ? 'unsupported' : 'error',
          message: caught instanceof Error ? caught.message : 'AI could not start on this device.',
          progress: null,
        })
      })

    return () => {
      active = false
    }
  }, [mobileOrTablet, privateAiEnabled])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const desiredHash = `#${sectionToHash[activeSection]}`

    if (window.location.hash !== desiredHash) {
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${window.location.search}${desiredHash}`,
      )
    }
  }, [activeSection])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const syncFromHash = () => {
      const next = sectionFromLocationHash()
      if (next) setActiveSection(next)
    }

    window.addEventListener('hashchange', syncFromHash)

    return () => {
      window.removeEventListener('hashchange', syncFromHash)
    }
  }, [])

  function navigateToSection(section: ClosetSection) {
    setActiveSection(section)
    setMobileFiltersOpen(false)
  }

  function updatePrivateAiEnabled(enabled: boolean) {
    if (mobileOrTablet) return
    setPrivateAiEnabled(enabled)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PRIVATE_AI_ENABLED_KEY, String(enabled))
    }

    if (!enabled) {
      void import('../local-ai/runtime').then(({ releaseLocalAi }) => releaseLocalAi())
      setLocalAiStatus({ phase: 'idle', message: 'AI is off.', progress: null })
    }
  }

  // Block uploads once the wardrobe is full. Gate on !isLoading so the upload UI
  // isn't disabled before we know the real count.
  const atLimit = !isLoading && items.length >= WARDROBE_ITEM_LIMIT

  const workspaceClassName = `closet-workspace closet-workspace--${activeSection}${isSidebarCollapsed ? ' closet-workspace--sidebar-collapsed' : ''}`
  return (
    <main id="main-content" className={workspaceClassName}>
      <WorkspaceSidebar
        activeSection={activeSection}
        isSidebarCollapsed={isSidebarCollapsed}
        localAiStatus={localAiStatus}
        localAiAvailableOnDevice={!mobileOrTablet}
        privateAiEnabled={privateAiEnabled}
        onPrivateAiEnabledChange={updatePrivateAiEnabled}
        onSectionChange={navigateToSection}
        onSidebarCollapsedChange={setIsSidebarCollapsed}
        user={user}
      />

      <section className="closet-app" aria-label="Sardrobe workspace">
        <WorkspaceMobileHeader
          activeFilterCount={filters.activeFilterCount}
          activeSection={activeSection}
          mobileSearchOpen={mobileSearchOpen}
          localAiStatus={localAiStatus}
          localAiAvailableOnDevice={!mobileOrTablet}
          privateAiEnabled={privateAiEnabled}
          onPrivateAiEnabledChange={updatePrivateAiEnabled}
          onMobileFiltersOpen={() => setMobileFiltersOpen(true)}
          onMobileSearchToggle={() => setMobileSearchOpen((open) => !open)}
          user={user}
        />

        {activeSection === 'import' ? (
          <ImportView
            {...imports}
            atLimit={atLimit}
            itemCount={items.length}
            limit={WARDROBE_ITEM_LIMIT}
          />
        ) : activeSection === 'outfits' ? (
          <OutfitsView
            agentEvent={outfitAgentEvent}
            items={items}
            isMobileViewport={isMobileViewport}
            localAiStatus={localAiStatus}
            onAgentEventHandled={clearOutfitAgentEvent}
            onLocalAiStatusChange={setLocalAiStatus}
            onNavigateToUpload={() => setActiveSection('import')}
            privateAiEnabled={privateAiEnabled}
          />
        ) : activeSection === 'packing' ? (
          <PackingView
            agentEvent={packingAgentEvent}
            items={items}
            isMobileViewport={isMobileViewport}
            localAiStatus={localAiStatus}
            onAgentEventHandled={clearPackingAgentEvent}
            onLocalAiStatusChange={setLocalAiStatus}
            privateAiEnabled={privateAiEnabled}
          />
        ) : (
          <WardrobeLibraryView
            activeFilterCount={filters.activeFilterCount}
            closetGroups={filters.closetGroups}
            closetSummaryLabel={filters.closetSummaryLabel}
            items={items}
            mobileFiltersOpen={mobileFiltersOpen}
            mobileSearchOpen={mobileSearchOpen}
            onNavigateToImport={() => setActiveSection('import')}
            onOpenFilters={() => setMobileFiltersOpen(true)}
            onOpenItem={(item) => void itemDetail.openItem(item)}
            searchQuery={filters.searchQuery}
            setSearchQuery={filters.setSearchQuery}
          />
        )}
      </section>

      <FiltersDrawer
        activeFilterCount={filters.activeFilterCount}
        clearClosetFilters={filters.clearClosetFilters}
        closetFacetFilters={filters.closetFacetFilters}
        closetFacetOptions={filters.closetFacetOptions}
        closetGroupBy={filters.closetGroupBy}
        isMobileViewport={isMobileViewport}
        mobileFiltersOpen={mobileFiltersOpen}
        setClosetFacet={filters.setClosetFacet}
        setClosetGroupBy={filters.setClosetGroupBy}
        setMobileFiltersOpen={setMobileFiltersOpen}
      />

      <WorkspaceMobileNav
        activeSection={activeSection}
        onSectionChange={navigateToSection}
      />

      <ItemDetailOverlay
        closeItemDialog={itemDetail.closeItemDialog}
        confirmingDelete={itemDetail.confirmingDelete}
        deleteSelectedItem={() => void itemDetail.deleteSelectedItem()}
        detailMessage={itemDetail.detailMessage}
        detailState={itemDetail.detailState}
        editForm={itemDetail.editForm}
        isMobileViewport={isMobileViewport}
        saveSelectedItem={() => void itemDetail.saveSelectedItem()}
        selectedCreatedDate={itemDetail.selectedCreatedDate}
        selectedItem={itemDetail.selectedItem}
        selectedUpdatedDate={itemDetail.selectedUpdatedDate}
        setConfirmingDelete={itemDetail.setConfirmingDelete}
        setDetailMessage={itemDetail.setDetailMessage}
        updateEditForm={itemDetail.updateEditForm}
      />
    </main>
  )
}
