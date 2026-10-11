import { Button, Form } from '@sardrobe/react-components'
import { useState, type RefObject } from 'react'
import { EditableNameTitle } from '../../components/closet/EditableNameTitle'
import { ClosetEmptyState, ClosetPanel } from '../../components/closet/ClosetPrimitives'
import { ClosetStatus } from '../../components/closet/ClosetStatus'
import { WardrobeDetailsFields, readWardrobeForm } from '../../components/closet/FormControls'
import {
  formatFileSize,
  type CreateItemResponse,
  type ImportDraft,
  type ImportDraftFilter,
  type ImportMobileView,
  type ImportStatusTone,
  type WardrobeFormState,
} from './domain'
import { draftImageLabel, draftImageUrl, draftStatusLabel } from './import-processing'

type ImportViewProps = {
  atLimit: boolean
  limit: number
  itemCount: number
  changeDraftFilter: (filter: ImportDraftFilter) => void
  draftFilter: ImportDraftFilter
  draftFilters: { value: ImportDraftFilter; label: string; count: number }[]
  draftGalleryShouldScroll: boolean
  drafts: ImportDraft[]
  fileInputRef: RefObject<HTMLInputElement | null>
  filteredDrafts: ImportDraft[]
  handleFilesSelected: (fileList: FileList | null) => void
  importBusy: boolean
  importMessage: string
  importMessageTone: ImportStatusTone
  importMobileView: ImportMobileView
  importProgressValue: number | null
  importSummaryLabel: string
  removeDraft: (draftId: string) => void
  retryDraft: (draftId: string) => void
  saveDraftById: (draftId: string, options?: { form?: WardrobeFormState }) => Promise<CreateItemResponse['item'] | null>
  replaceDraftForm: (draftId: string, form: WardrobeFormState) => ImportDraft
  selectedDraft: ImportDraft | null
  selectedDraftCanSubmit: boolean
  selectedDraftHint: string
  selectedDraftSubmitLabel: string
  selectedDraftTone: ImportStatusTone
  setImportMobileView: (view: ImportMobileView) => void
  setSelectedDraftId: (draftId: string | null) => void
  updateDraftForm: (draftId: string, key: keyof WardrobeFormState, value: string) => void
}

export function ImportView(props: ImportViewProps) {
  const {
    atLimit,
    limit,
    itemCount,
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
    retryDraft,
    saveDraftById,
    replaceDraftForm,
    selectedDraft,
    selectedDraftCanSubmit,
    selectedDraftHint,
    selectedDraftSubmitLabel,
    selectedDraftTone,
    setImportMobileView,
    setSelectedDraftId,
    updateDraftForm,
  } = props

  const [formError, setFormError] = useState<{ draftId: string; message: string } | null>(null)

  function reportFormError(message: string) {
    if (selectedDraft) setFormError({ draftId: selectedDraft.id, message })
  }

  async function saveSubmittedDraft(data: FormData, fields: ReadonlySet<string>) {
    if (!selectedDraft || atLimit) throw new Error('No draft selected or the wardrobe is full.')
    const item = await saveDraftById(selectedDraft.id, { form: readWardrobeForm(data, selectedDraft.form, fields) })
    if (!item) throw new Error('Could not save this draft. Check its readiness and details.')
    return { kind: 'imports.draft_submitted', draftId: selectedDraft.id, itemId: item.id, item }
  }

  const limitNote = atLimit ? `Wardrobe full (${itemCount}/${limit}). Remove items to add new ones.` : ''

  return (
    <section className={`closet-import-view closet-composer--mobile-${importMobileView}`} aria-labelledby="import-title">
      <div className="closet-import-mobile-switch" role="tablist" aria-label="Import screens">
        <button
          className={importMobileView === 'gallery' ? 'closet-import-mobile-switch__button closet-import-mobile-switch__button--active' : 'closet-import-mobile-switch__button'}
          type="button"
          role="tab"
          aria-selected={importMobileView === 'gallery'}
          onClick={() => setImportMobileView('gallery')}
        >
          Gallery
        </button>
        <button
          className={importMobileView === 'review' ? 'closet-import-mobile-switch__button closet-import-mobile-switch__button--active' : 'closet-import-mobile-switch__button'}
          type="button"
          role="tab"
          aria-selected={importMobileView === 'review'}
          disabled={!selectedDraft}
          onClick={() => setImportMobileView('review')}
        >
          Review
        </button>
      </div>

      <ClosetPanel className="closet-imports">
        <div className="closet-imports__header">
          <div>
            <h1 id="import-title">Upload clothes</h1>
            <p>Choose one photo or a batch, then review the cutouts before saving.</p>
          </div>
          <div className="closet-imports__actions">
            <Button
              color="primary"
              type="button"
              disabled={atLimit}
              aria-describedby={atLimit ? 'import-limit-note' : undefined}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose photos
            </Button>
            <input
              className="closet-file-input"
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
              multiple
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => handleFilesSelected(event.currentTarget.files)}
            />
          </div>
        </div>

        {limitNote ? (
          <p id="import-limit-note" className="closet-import-limit" role="status">
            {limitNote}
          </p>
        ) : null}

        <ClosetStatus
          busy={importBusy}
          progressValue={importProgressValue}
          message={importMessage}
          summary={importSummaryLabel}
          tone={importMessageTone}
        />

        {drafts.length > 0 ? (
          <>
            <div className="closet-draft-filters" role="tablist" aria-label="Import draft filters">
              {draftFilters.map((filter) => (
                <button
                  className={`closet-draft-filter ${draftFilter === filter.value ? 'closet-draft-filter--active' : ''}`}
                  key={filter.value}
                  type="button"
                  role="tab"
                  aria-selected={draftFilter === filter.value}
                  disabled={filter.count === 0}
                  onClick={() => changeDraftFilter(filter.value)}
                >
                  <span>{filter.label}</span>
                  <span>{filter.count}</span>
                </button>
              ))}
            </div>

            {filteredDrafts.length > 0 ? (
              <div
                className={`closet-draft-gallery ${draftGalleryShouldScroll ? 'closet-draft-gallery--scrollable' : ''}`}
                role="list"
                aria-label="Import drafts"
              >
                {filteredDrafts.map((draft) => {
                  const imageUrl = draftImageUrl(draft)
                  const isSelected = draft.id === selectedDraft?.id

                  return (
                    <article
                      className={`closet-draft-card ${isSelected ? 'closet-draft-card--selected' : ''}`}
                      data-status={draft.status}
                      key={draft.id}
                      role="listitem"
                      aria-current={isSelected ? 'true' : undefined}
                    >
                      <button
                        className="closet-draft-card__select"
                        type="button"
                        aria-label={`Review ${draft.form.name || draft.fileName}`}
                        onClick={() => {
                          setSelectedDraftId(draft.id)
                          setImportMobileView('review')
                        }}
                      >
                        <span className="closet-draft-card__media">
                          {imageUrl ? <img src={imageUrl} alt="" /> : <span>{draftImageLabel(draft)}</span>}
                        </span>
                        <span className="closet-draft-card__body">
                          <span className="closet-draft-card__name">{draft.form.name || draft.fileName}</span>
                          <span className="closet-draft-card__meta">{formatFileSize(draft.fileSize)}</span>
                        </span>
                      </button>
                      <div className="closet-draft-card__actions">
                        {draft.status === 'failed' ? (
                          <Button size="sm" variant="outline" color="neutral" type="button" onClick={() => retryDraft(draft.id)}>
                            {draft.failureStage === 'saving' ? 'Retry save' : 'Retry'}
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          color="destructive"
                          type="button"
                          onClick={() => removeDraft(draft.id)}
                          disabled={draft.status === 'saving'}
                        >
                          Remove
                        </Button>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <ClosetEmptyState
                className="closet-empty--imports"
                title="No drafts in this view."
                description="Choose another status filter to keep reviewing."
              />
            )}
          </>
        ) : (
          <ClosetEmptyState
            className="closet-empty--imports"
            title="No import drafts yet."
            description="Add photos to review them before saving."
          />
        )}
      </ClosetPanel>

      <Form
        tooltitle="Change an import draft"
        onChange={() => setFormError(null)}
        key={selectedDraft?.id ?? 'empty'}
        toolname={selectedDraft ? 'import_draft_mutate' : undefined}
        actions={['update', 'submit', 'discard']} defaultAction="submit" confirmActions={['submit', 'discard']} skipValidationActions={['discard']}
        tooldescription={`Change import draft ${selectedDraft?.id ?? ''} in this browser tab. action "submit" (the Save button and default) saves its details and cutout to the wardrobe and requires confirm: true. action "update" edits only the local draft with no confirmation. action "discard" removes the draft from this tab and requires confirm: true. The draft must have a processed cutout before saving, and the wardrobe must have room. Failed saves can be retried with fresh confirmation. Only set fields you are changing; omitted fields keep their current values. Category, subcategory, color, occasion, and season must use the allowed values, and subcategory must belong to the chosen category. Pass [] to clear occasions or seasons and an empty string to clear optional text. Inspect import_draft_image before guessing visual attributes; do not invent values. Returns the edited draft ID and fields. The Save button saves its details and cutout to the wardrobe after the user agrees.`}
        toolautosubmit=""
        className={`closet-panel closet-details closet-draft-editor ${!selectedDraft ? 'closet-details--disabled' : ''}`}
        onSubmitError={reportFormError}
        onSubmit={(data, { action, fields }) => {
          if (!selectedDraft) throw new Error('No draft selected.')
          if (action === 'discard') {
            removeDraft(selectedDraft.id)
            return { kind: 'imports.draft_discarded', draftId: selectedDraft.id }
          }
          if (action === 'submit') return saveSubmittedDraft(data, fields)
          const draft = replaceDraftForm(selectedDraft.id, readWardrobeForm(data, selectedDraft.form, fields))
          return { kind: 'imports.draft_updated', draftId: draft.id, fields: draft.form }
        }}
      >
        {selectedDraft ? (
          <>
            <div className="closet-draft-editor__header">
              <div>
                <EditableNameTitle
                  value={selectedDraft.form.name}
                  fallback={selectedDraft.fileName || 'New wardrobe item'}
                  label="Item name"
                  name="name"
                  disabled={selectedDraft.status === 'saving'}
                  pendingSubmit={selectedDraft.status === 'saving'}
                  onChange={(value) => updateDraftForm(selectedDraft.id, 'name', value)}
                  renderTitle={(className, children, title) => (
                    <h2 className={className} title={title}>
                      {children}
                    </h2>
                  )}
                />
                <p className={`closet-draft-editor__status closet-draft-editor__status--${selectedDraftTone}`} role="status" aria-live="polite">
                  {selectedDraft.message || draftStatusLabel(selectedDraft)}
                </p>
              </div>
            </div>

            <div className="closet-preview-grid closet-preview-grid--compact">
              <figure className="closet-preview">
                <figcaption>Original photo</figcaption>
                {selectedDraft.originalUrl ? <img src={selectedDraft.originalUrl} alt="" /> : <span>{draftImageLabel(selectedDraft)}</span>}
              </figure>
              <figure className="closet-preview closet-preview--cutout">
                <figcaption>Final cutout</figcaption>
                {selectedDraft.cutout ? (
                  <img src={selectedDraft.cutout.url} alt="" />
                ) : (
                  <span>{selectedDraft.status === 'failed' ? 'Failed' : 'Waiting'}</span>
                )}
              </figure>
            </div>

            {selectedDraft.status === 'failed' && selectedDraft.failureStage !== 'saving' ? (
              <div className="closet-draft-editor__result closet-draft-editor__result--error">
                <strong>Processing failed.</strong>
                <span>{selectedDraft.error || selectedDraft.message || 'Retry this draft or remove it from the import.'}</span>
                <div className="closet-draft-editor__actions">
                  <Button color="primary" type="button" onClick={() => retryDraft(selectedDraft.id)}>
                    Retry
                  </Button>
                  <Button variant="outline" color="destructive" type="submit" name="intent" value="discard">
                    Remove draft
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <fieldset className="closet-details__fields" inert={selectedDraft.status === 'saving'}>
                  <WardrobeDetailsFields
                    form={selectedDraft.form}
                    onChange={(key, value) => updateDraftForm(selectedDraft.id, key, value)}
                  />
                </fieldset>

                {formError?.draftId === selectedDraft.id ? (
                  <p className="closet-builder__validation" role="alert">{formError.message}</p>
                ) : null}
                {limitNote || selectedDraftHint ? (
                  <p id="save-draft-hint" className="closet-details__hint">
                    {limitNote || selectedDraftHint}
                  </p>
                ) : null}
                <div className="closet-draft-editor__actions">
                  <Button color="primary" type="submit" disabled={!selectedDraftCanSubmit || selectedDraft.status === 'saving' || atLimit} aria-describedby={limitNote || selectedDraftHint ? 'save-draft-hint' : undefined}>
                    {selectedDraftSubmitLabel}
                  </Button>
                  <Button variant="outline" color="destructive" type="submit" name="intent" value="discard" disabled={selectedDraft.status === 'saving'}>
                    Remove draft
                  </Button>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="closet-draft-editor__empty">
            <h2>Review draft</h2>
            <p>Select a photo to edit details before saving.</p>
          </div>
        )}
      </Form>
    </section>
  )
}
