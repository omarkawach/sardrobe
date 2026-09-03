import { useEffect, useMemo, useRef, useState } from 'react'
import { persistWardrobeDraft } from './api'
import {
  formFromFile,
  SUBCATEGORIES_BY_CATEGORY,
  type ImportDraft,
  type ImportDraftFilter,
  type ImportMobileView,
  type ImportStatusTone,
  type WardrobeFormState,
} from './domain'
import {
  blobToWebp,
  backgroundRemovalProgressLabel,
  canSubmitDraft,
  countDrafts,
  createDraftId,
  draftMatchesFilter,
  draftStatusTone,
  hasRequiredDraftDetails,
  heicUnsupportedMessage,
  imageHasPrecutAlpha,
  isSupportedImageFile,
  isUnsupportedHeic,
  maxSourceFileBytes,
  nextAvailableDraftFilter,
  removeBackgroundFromFile,
  revokeDraftUrls,
  summarizeDraftCounts,
} from './import-processing'

export function useImportDrafts(refreshItems: () => Promise<void>) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const draftsRef = useRef<ImportDraft[]>([])
  const processingQueueRef = useRef<Promise<void>>(Promise.resolve())
  const [drafts, setDrafts] = useState<ImportDraft[]>([])
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
  const [draftFilter, setDraftFilter] = useState<ImportDraftFilter>('ready')
  const [importMobileView, setImportMobileView] = useState<ImportMobileView>('gallery')
  const [importMessage, setImportMessage] = useState('')
  const [importMessageTone, setImportMessageTone] = useState<ImportStatusTone>('idle')

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [drafts, selectedDraftId],
  )
  const draftCounts = useMemo(() => countDrafts(drafts), [drafts])
  const importSummaryLabel = useMemo(() => summarizeDraftCounts(draftCounts), [draftCounts])
  const importProgressValue =
    drafts.length > 0
      ? Math.round(
          (drafts.reduce((total, draft) => total + draft.progress, 0) / drafts.length) * 100,
        )
      : null
  const importBusy = drafts.some((draft) => draft.status === 'queued' || draft.status === 'processing' || draft.status === 'saving')
  const filteredDrafts = useMemo(() => drafts.filter((draft) => draftMatchesFilter(draft, draftFilter)), [draftFilter, drafts])
  const draftGalleryShouldScroll = filteredDrafts.length > 0
  const selectedDraftCanSubmit = selectedDraft ? canSubmitDraft(selectedDraft) : false
  const selectedDraftHint = getSelectedDraftHint(selectedDraft)
  const selectedDraftTone = selectedDraft ? draftStatusTone(selectedDraft) : 'idle'
  const selectedDraftSubmitLabel =
    selectedDraft?.status === 'saving'
      ? 'Saving...'
      : selectedDraft?.status === 'failed' && selectedDraft.failureStage === 'saving'
        ? 'Retry save'
        : 'Save selected'
  const draftFilters: { value: ImportDraftFilter; label: string; count: number }[] = [
    { value: 'processing', label: 'Processing', count: draftCounts.processing + draftCounts.saving },
    { value: 'ready', label: 'Review', count: draftCounts.ready },
    { value: 'failed', label: 'Failed', count: draftCounts.failed },
  ]

  useEffect(() => {
    draftsRef.current = drafts
  }, [drafts])

  useEffect(() => {
    if (drafts.length === 0 && selectedDraftId) {
      setSelectedDraftId(null)
      return
    }

    const nextFilter = nextAvailableDraftFilter(drafts, draftFilter)

    if (nextFilter !== draftFilter) {
      setDraftFilter(nextFilter)
      return
    }

    const selectedStillExists = selectedDraftId ? drafts.some((draft) => draft.id === selectedDraftId) : false

    if (drafts.length > 0 && !selectedStillExists) {
      setSelectedDraftId(drafts.find((draft) => draftMatchesFilter(draft, nextFilter))?.id ?? drafts[0].id)
    }
  }, [draftFilter, drafts, selectedDraftId])

  useEffect(
    () => () => {
      draftsRef.current.forEach(revokeDraftUrls)
    },
    [],
  )

  function updateDrafts(updater: (current: ImportDraft[]) => ImportDraft[]) {
    const nextDrafts = updater(draftsRef.current)
    draftsRef.current = nextDrafts
    setDrafts(nextDrafts)
  }

  function updateDraftForm(draftId: string, key: keyof WardrobeFormState, value: string) {
    updateDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== draftId) return draft
        const nextForm = { ...draft.form, [key]: value }
        if (key === 'category') {
          const allowed = SUBCATEGORIES_BY_CATEGORY[value] ?? []
          if (nextForm.subcategory && !allowed.includes(nextForm.subcategory)) {
            nextForm.subcategory = ''
          }
        }
        return { ...draft, form: nextForm }
      }),
    )
  }

  function handleFilesSelected(fileList: FileList | null) {
    const files = Array.from(fileList ?? [])

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (files.length === 0) {
      return
    }

    const acceptedDrafts: ImportDraft[] = []
    const rejectedMessages: string[] = []

    for (const file of files) {
      if (!isSupportedImageFile(file)) {
        rejectedMessages.push(`${file.name} is not a supported image.`)
        continue
      }

      if (file.size <= 0) {
        rejectedMessages.push(`${file.name} is empty.`)
        continue
      }

      if (file.size > maxSourceFileBytes) {
        rejectedMessages.push(`${file.name} is over 12 MB.`)
        continue
      }

      acceptedDrafts.push({
        id: createDraftId(),
        file,
        fileName: file.name,
        fileSize: file.size,
        originalUrl: URL.createObjectURL(file),
        cutout: null,
        form: formFromFile(file),
        status: 'queued',
        progress: 0,
        failureStage: null,
        message: 'Pending.',
        error: null,
      })
    }

    if (acceptedDrafts.length > 0) {
      updateDrafts((current) => [...acceptedDrafts, ...current])
      setDraftFilter('processing')
      setSelectedDraftId(acceptedDrafts[0].id)
      setImportMobileView('gallery')
      enqueueDraftProcessing(acceptedDrafts)
    }

    const addedText = acceptedDrafts.length
      ? `${acceptedDrafts.length} ${acceptedDrafts.length === 1 ? 'photo' : 'photos'} queued.`
      : ''
    const rejectedText = rejectedMessages.length
      ? `${rejectedMessages.length} skipped: ${rejectedMessages.slice(0, 2).join(' ')}`
      : ''

    setImportMessage([addedText, rejectedText].filter(Boolean).join(' '))
    setImportMessageTone(rejectedMessages.length && !acceptedDrafts.length ? 'error' : 'processing')
  }

  function enqueueDraftProcessing(draftsToProcess: ImportDraft[]) {
    processingQueueRef.current = processingQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        for (const draft of draftsToProcess) {
          const latestDraft = draftsRef.current.find((candidate) => candidate.id === draft.id)

          if (!latestDraft || latestDraft.status === 'saving') {
            continue
          }

          await processDraftFile(draft.id, draft.file)
        }

        const currentDrafts = draftsRef.current
        const hasBusyDraft = currentDrafts.some(
          (draft) => draft.status === 'queued' || draft.status === 'processing' || draft.status === 'saving',
        )

        if (!hasBusyDraft) {
          setImportMessage(currentDrafts.length > 0 ? summarizeDraftCounts(countDrafts(currentDrafts)) : '')
          setImportMessageTone(currentDrafts.some((draft) => draft.status === 'failed') ? 'error' : 'ready')
        }
      })
  }

  async function processDraftFile(draftId: string, file: File) {
    updateDrafts((current) =>
      current.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              status: 'processing',
              progress: 0.01,
              failureStage: null,
              error: null,
              message: 'Preparing cutout...',
            }
          : draft,
      ),
    )
    setImportMessage(`Processing ${file.name}...`)
    setImportMessageTone('processing')

    try {
      if (await isUnsupportedHeic(file)) {
        throw new Error(heicUnsupportedMessage)
      }

      const hasPrecutAlpha = await imageHasPrecutAlpha(file)

      if (!draftsRef.current.some((draft) => draft.id === draftId)) {
        return
      }

      let cutoutSource: Blob = file

      if (!hasPrecutAlpha) {
        updateDrafts((current) =>
          current.map((draft) =>
            draft.id === draftId
              ? {
                  ...draft,
                  message: 'Removing background...',
                }
              : draft,
          ),
        )

        cutoutSource = await removeBackgroundFromFile(file, (progress) => {
          updateDrafts((current) =>
            current.map((draft) =>
              draft.id === draftId
                ? {
                    ...draft,
                    progress: Math.max(draft.progress, progress.ratio * 0.95),
                    message: backgroundRemovalProgressLabel(progress),
                  }
                : draft,
            ),
          )
        })
      }

      if (!draftsRef.current.some((draft) => draft.id === draftId)) {
        return
      }

      const webp = await blobToWebp(cutoutSource, file.name, { isolateMainSubject: !hasPrecutAlpha })
      const nextCutoutUrl = URL.createObjectURL(webp.file)

      if (!draftsRef.current.some((draft) => draft.id === draftId)) {
        URL.revokeObjectURL(nextCutoutUrl)
        return
      }

      updateDrafts((current) =>
        current.map((draft) =>
          draft.id === draftId
            ? {
                ...draft,
                cutout: {
                  file: webp.file,
                  url: nextCutoutUrl,
                  width: webp.width,
                  height: webp.height,
                },
                status: 'ready',
                progress: 1,
                failureStage: null,
                error: null,
                message: webp.tinySubjectWarning
                  ? 'Cutout ready. Tiny subject detected; crop source image for best results.'
                  : hasPrecutAlpha
                    ? 'Precut image detected.'
                    : 'Cutout ready.',
              }
            : draft,
        ),
      )
      setImportMessage(`${file.name} is ready.`)
      setImportMessageTone('ready')
    } catch (error) {
      console.error('Background removal failed.', error)

      if (!draftsRef.current.some((draft) => draft.id === draftId)) {
        return
      }

      const reason = error instanceof Error ? error.message : 'Background removal failed.'
      updateDrafts((current) =>
        current.map((draft) =>
          draft.id === draftId
            ? {
                ...draft,
                status: 'failed',
                progress: 1,
                failureStage: 'processing',
                error: reason,
                message: reason,
              }
            : draft,
        ),
      )
      setImportMessage(`${file.name} failed. Retry or remove it.`)
      setImportMessageTone('error')
    }
  }

  function retryDraft(draftId: string) {
    const draft = draftsRef.current.find((candidate) => candidate.id === draftId)

    if (!draft) {
      return
    }

    if (draft.failureStage === 'saving' && draft.cutout) {
      void saveDraftById(draftId)
      return
    }

    if (draft.cutout?.url) {
      URL.revokeObjectURL(draft.cutout.url)
    }

    updateDrafts((current) =>
      current.map((candidate) =>
        candidate.id === draftId
          ? {
              ...candidate,
              cutout: null,
              status: 'queued',
              progress: 0,
              failureStage: null,
              error: null,
              message: 'Pending retry.',
            }
          : candidate,
      ),
    )
    setSelectedDraftId(draftId)
    setImportMessage(`${draft.fileName} queued again.`)
    setImportMessageTone('processing')
    enqueueDraftProcessing([draft])
  }

  function removeDraft(draftId: string) {
    const draft = draftsRef.current.find((candidate) => candidate.id === draftId)

    if (!draft || draft.status === 'saving') {
      return
    }

    revokeDraftUrls(draft)

    const remainingDrafts = draftsRef.current.filter((candidate) => candidate.id !== draftId)
    updateDrafts(() => remainingDrafts)
    setSelectedDraftId(remainingDrafts[0]?.id ?? null)
    setImportMessage(remainingDrafts.length > 0 ? `${draft.fileName} removed.` : '')
    setImportMessageTone(remainingDrafts.some((candidate) => candidate.status === 'failed') ? 'error' : 'ready')
  }

  function changeDraftFilter(nextFilter: ImportDraftFilter) {
    if (!draftsRef.current.some((draft) => draftMatchesFilter(draft, nextFilter))) {
      return
    }

    setDraftFilter(nextFilter)

    const nextSelectedDraft = draftsRef.current.find((draft) => draftMatchesFilter(draft, nextFilter))
    setSelectedDraftId(nextSelectedDraft?.id ?? null)
  }

  function revealAgentDraftUpdate(draftId: string) {
    const draft = draftsRef.current.find((candidate) => candidate.id === draftId)
    if (!draft) return

    const nextFilter: ImportDraftFilter =
      draft.status === 'failed'
        ? 'failed'
        : draft.status === 'ready'
          ? 'ready'
          : 'processing'

    setDraftFilter(nextFilter)
    setSelectedDraftId(draftId)
    setImportMobileView('review')
    setImportMessage('Draft updated by agent.')
    setImportMessageTone(draft.status === 'failed' ? 'error' : 'ready')
  }

  function revealAgentDraftList() {
    setImportMobileView('gallery')
    setImportMessage('Draft changed by agent.')
    setImportMessageTone(draftsRef.current.some((draft) => draft.status === 'failed') ? 'error' : 'ready')
  }

  async function saveDraftById(draftId: string, options: { refresh?: boolean; quiet?: boolean } = {}) {
    const draft = draftsRef.current.find((candidate) => candidate.id === draftId)

    if (!draft) {
      return null
    }

    if (!canSubmitDraft(draft)) {
      setSelectedDraftId(draftId)
      updateDrafts((current) =>
        current.map((candidate) =>
          candidate.id === draftId
            ? {
                ...candidate,
                message: 'Name and category are required.',
              }
            : candidate,
        ),
      )
      setImportMessage('Name and category are required.')
      setImportMessageTone('error')
      return null
    }

    updateDrafts((current) =>
      current.map((candidate) =>
        candidate.id === draftId
          ? {
              ...candidate,
              status: 'saving',
              failureStage: null,
              error: null,
              message: 'Saving to wardrobe...',
            }
          : candidate,
      ),
    )

    if (!options.quiet) {
      setImportMessage(`Saving ${draft.form.name || draft.fileName}...`)
      setImportMessageTone('saving')
    }

    try {
      const created = await persistWardrobeDraft({ cutout: draft.cutout!, form: draft.form })
      const latestDraft = draftsRef.current.find((candidate) => candidate.id === draftId)

      if (!latestDraft) {
        return null
      }

      revokeDraftUrls(latestDraft)
      const remainingDrafts = draftsRef.current.filter((candidate) => candidate.id !== draftId)
      updateDrafts(() => remainingDrafts)

      const nextDraft = remainingDrafts.find(
        (candidate) => candidate.status === 'ready' || candidate.status === 'processing',
      )
      setSelectedDraftId(nextDraft?.id ?? remainingDrafts[0]?.id ?? null)

      if (!options.quiet) {
        setImportMessage(`${draft.form.name || draft.fileName} saved.`)
        setImportMessageTone('ready')
      }

      if (options.refresh !== false) {
        await refreshItems()
      }

      return created.item
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Could not save this item.'
      updateDrafts((current) =>
        current.map((candidate) =>
          candidate.id === draftId
            ? {
                ...candidate,
                status: 'failed',
                failureStage: 'saving',
                error: reason,
                message: reason,
              }
            : candidate,
        ),
      )

      if (!options.quiet) {
        setImportMessage(`${draft.form.name || draft.fileName} could not be saved.`)
        setImportMessageTone('error')
      }

      return null
    }
  }

  return {
    changeDraftFilter,
    draftFilter,
    draftFilters,
    draftGalleryShouldScroll,
    drafts,
    fileInputRef,
    filteredDrafts,
    handleFilesSelected,
    importBusy,
    importMessage,
    importMessageTone,
    importMobileView,
    importProgressValue,
    importSummaryLabel,
    removeDraft,
    revealAgentDraftList,
    revealAgentDraftUpdate,
    retryDraft,
    saveDraftById,
    selectedDraft,
    selectedDraftCanSubmit,
    selectedDraftHint,
    selectedDraftSubmitLabel,
    selectedDraftTone,
    setImportMobileView,
    setSelectedDraftId,
    updateDraftForm,
  }
}

function getSelectedDraftHint(draft: ImportDraft | null) {
  if (!draft) return ''
  if (draft.status === 'saving') return 'Saving to wardrobe.'
  if (draft.status === 'queued' || draft.status === 'processing') return 'Details can be edited while the cutout is prepared.'
  if (draft.status === 'failed' && draft.failureStage === 'processing') return 'Retry processing or remove this draft.'
  if (!hasRequiredDraftDetails(draft)) return 'Name and category are required.'
  if (draft.status === 'failed' && draft.failureStage === 'saving') return 'The cutout is ready. Retry save when ready.'
  return ''
}
