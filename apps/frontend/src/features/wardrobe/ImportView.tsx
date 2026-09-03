import { Button } from '@sardrobe/react-components'
import type { RefObject } from 'react'
import { EditableNameTitle } from '../../components/closet/EditableNameTitle'
import { ClosetEmptyState, ClosetPanel } from '../../components/closet/ClosetPrimitives'
import { ClosetStatus } from '../../components/closet/ClosetStatus'
import { WardrobeMultiSelect, WardrobeSelect, toSelectOptions } from '../../components/closet/FormControls'
import {
  arrayToCsv,
  categories,
  COLORS,
  csvToArray,
  formatFileSize,
  OCCASIONS,
  SEASONS,
  SUBCATEGORIES_BY_CATEGORY,
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
  saveDraftById: (draftId: string) => void
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
    selectedDraft,
    selectedDraftCanSubmit,
    selectedDraftHint,
    selectedDraftSubmitLabel,
    selectedDraftTone,
    setImportMobileView,
    setSelectedDraftId,
    updateDraftForm,
  } = props

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

      <form
        className={`closet-panel closet-details closet-draft-editor ${!selectedDraft ? 'closet-details--disabled' : ''}`}
        onSubmit={(event) => {
          event.preventDefault()
          if (selectedDraft) saveDraftById(selectedDraft.id)
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

            {selectedDraft.status === 'failed' ? (
              <div className="closet-draft-editor__result closet-draft-editor__result--error">
                <strong>{selectedDraft.failureStage === 'saving' ? 'Save failed.' : 'Processing failed.'}</strong>
                <span>{selectedDraft.error || selectedDraft.message || 'Retry this draft or remove it from the import.'}</span>
                <div className="closet-draft-editor__actions">
                  <Button color="primary" type="button" onClick={() => retryDraft(selectedDraft.id)}>
                    {selectedDraft.failureStage === 'saving' ? 'Retry save' : 'Retry'}
                  </Button>
                  <Button variant="outline" color="destructive" type="button" onClick={() => removeDraft(selectedDraft.id)}>
                    Remove draft
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <fieldset className="closet-details__fields" disabled={selectedDraft.status === 'saving'}>
                  <div className="closet-details__row">
                    <div className="closet-field">
                      <span>Category</span>
                      <WardrobeSelect
                        value={selectedDraft.form.category}
                        onValueChange={(value) => updateDraftForm(selectedDraft.id, 'category', value)}
                        placeholder="Select category"
                        options={toSelectOptions(categories)}
                        ariaLabel="Category"
                      />
                    </div>
                    <div className="closet-field">
                      <span>Subcategory</span>
                      <WardrobeSelect
                        value={selectedDraft.form.subcategory}
                        onValueChange={(value) => updateDraftForm(selectedDraft.id, 'subcategory', value)}
                        placeholder={
                          (SUBCATEGORIES_BY_CATEGORY[selectedDraft.form.category] ?? []).length === 0
                            ? 'Pick a category first'
                            : 'Select subcategory'
                        }
                        options={toSelectOptions(SUBCATEGORIES_BY_CATEGORY[selectedDraft.form.category] ?? [])}
                        ariaLabel="Subcategory"
                      />
                    </div>
                  </div>

                  <div className="closet-field">
                    <span>Color</span>
                    <WardrobeSelect
                      value={selectedDraft.form.color}
                      onValueChange={(value) => updateDraftForm(selectedDraft.id, 'color', value)}
                      placeholder="Select color"
                      options={toSelectOptions(COLORS)}
                      ariaLabel="Color"
                    />
                  </div>

                  <div className="closet-details__row">
                    <div className="closet-field">
                      <span>Season</span>
                      <WardrobeMultiSelect
                        value={csvToArray(selectedDraft.form.season)}
                        onValueChange={(values) => updateDraftForm(selectedDraft.id, 'season', arrayToCsv(values))}
                        placeholder="Select seasons"
                        options={SEASONS}
                        ariaLabel="Season"
                      />
                    </div>
                    <div className="closet-field">
                      <span>Occasion</span>
                      <WardrobeMultiSelect
                        value={csvToArray(selectedDraft.form.occasion)}
                        onValueChange={(values) => updateDraftForm(selectedDraft.id, 'occasion', arrayToCsv(values))}
                        placeholder="Select occasions"
                        options={OCCASIONS}
                        ariaLabel="Occasion"
                      />
                    </div>
                  </div>

                  <label className="closet-field">
                    <span>Notes</span>
                    <textarea name="notes" value={selectedDraft.form.notes} onChange={(event) => updateDraftForm(selectedDraft.id, 'notes', event.target.value)} rows={3} />
                  </label>
                </fieldset>

                {limitNote || selectedDraftHint ? (
                  <p id="save-draft-hint" className="closet-details__hint">
                    {limitNote || selectedDraftHint}
                  </p>
                ) : null}
                <div className="closet-draft-editor__actions">
                  <Button color="primary" type="submit" disabled={!selectedDraftCanSubmit || selectedDraft.status === 'saving' || atLimit} aria-describedby={limitNote || selectedDraftHint ? 'save-draft-hint' : undefined}>
                    {selectedDraftSubmitLabel}
                  </Button>
                  <Button variant="outline" color="destructive" type="button" onClick={() => removeDraft(selectedDraft.id)} disabled={selectedDraft.status === 'saving'}>
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
      </form>
    </section>
  )
}
