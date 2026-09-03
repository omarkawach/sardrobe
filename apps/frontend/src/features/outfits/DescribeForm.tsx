import { Button, Input } from '@sardrobe/react-components'
import { WardrobeMultiSelect } from '../../components/closet/FormControls'
import { OCCASIONS, SEASONS, arrayToCsv, csvToArray } from '../wardrobe/domain'
import type { BuilderMode, BuilderSaveState, DeleteState, OutfitFormState } from './domain'

type DescribeFormProps = {
  form: OutfitFormState
  mode: BuilderMode
  saveError: string
  saveState: BuilderSaveState
  deleteState: DeleteState
  deleteError: string
  onFormChange: <K extends keyof OutfitFormState>(key: K, value: OutfitFormState[K]) => void
  onRequestDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}

export function DescribeForm({
  form,
  mode,
  saveError,
  deleteState,
  deleteError,
  onFormChange,
  onCancelDelete,
  onConfirmDelete,
}: DescribeFormProps) {
  return (
    <form
      className="closet-builder__details"
      onSubmit={(event) => {
        event.preventDefault()
      }}
    >
      <div className="closet-details__row">
        <div className="closet-field">
          <span>Season</span>
          <WardrobeMultiSelect
            value={csvToArray(form.season)}
            onValueChange={(values) => onFormChange('season', arrayToCsv(values))}
            placeholder="Select seasons"
            options={SEASONS}
            ariaLabel="Season"
          />
        </div>
        <div className="closet-field">
          <span>Occasion</span>
          <WardrobeMultiSelect
            value={csvToArray(form.occasion)}
            onValueChange={(values) => onFormChange('occasion', arrayToCsv(values))}
            placeholder="Select occasions"
            options={OCCASIONS}
            ariaLabel="Occasion"
          />
        </div>
      </div>

      <div className="closet-details__row">
        <label className="closet-field">
          <span>Source</span>
          <Input
            name="outfit-source"
            value={form.source}
            onChange={(event) => onFormChange('source', event.target.value)}
            placeholder="Pinterest, Instagram, …"
          />
        </label>
        <label className="closet-field">
          <span>Styling formula</span>
          <Input
            name="outfit-styling"
            value={form.stylingFormula}
            onChange={(event) => onFormChange('stylingFormula', event.target.value)}
            placeholder="Monochromatic, contrast, …"
          />
        </label>
      </div>

      <label className="closet-field">
        <span>Notes</span>
        <textarea
          name="outfit-notes"
          value={form.notes}
          onChange={(event) => onFormChange('notes', event.target.value)}
          rows={4}
        />
      </label>

      {saveError ? (
        <p className="closet-builder__validation" role="alert">
          {saveError}
        </p>
      ) : null}

      {mode === 'edit' && deleteState !== 'idle' ? (
        <div className="closet-builder__delete-confirm" role="group" aria-label="Confirm deletion">
          <strong>Delete this outfit?</strong>
          <span>This removes the saved look. Your wardrobe pieces stay.</span>
          {deleteError ? (
            <span className="closet-builder__validation" role="alert">
              {deleteError}
            </span>
          ) : null}
          <div className="closet-builder__delete-actions">
            <Button variant="outline" color="neutral" type="button" onClick={onCancelDelete}>
              Cancel
            </Button>
            <Button
              variant="outline"
              color="destructive"
              type="button"
              onClick={onConfirmDelete}
              disabled={deleteState === 'deleting'}
            >
              {deleteState === 'deleting' ? 'Deleting…' : 'Delete outfit'}
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  )
}
