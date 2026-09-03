import { Button } from '@sardrobe/react-components'
import { ChevronLeft, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { WardrobeItem } from '../wardrobe/domain'
import { ComposePicker } from './ComposePicker'
import { DescribeForm } from './DescribeForm'
import {
  type BuilderMode,
  type BuilderSaveState,
  type BuilderStep,
  type DeleteState,
  type OutfitFormState,
  type PickerTab,
  type PlacedItem,
} from './domain'
import { Canvas } from './OutfitCanvas'

type BuilderBodyProps = {
  mode: BuilderMode
  step: BuilderStep
  titleSlot: ReactNode
  aiComposer?: ReactNode
  form: OutfitFormState
  placement: PlacedItem[]
  selectedItemId: string | null
  onSelectItem: (itemId: string | null) => void
  onMoveItem: (itemId: string, x: number, y: number) => void
  onScaleItem: (itemId: string, scale: number) => void
  onAdjustZIndex: (itemId: string, mode: 'front' | 'back') => void
  onRemovePlacedItem: (itemId: string) => void
  pickerTab: PickerTab
  pickerSearch: string
  pickerItems: WardrobeItem[]
  wardrobeEmpty: boolean
  onPickerTabChange: (tab: PickerTab) => void
  onPickerSearchChange: (value: string) => void
  onPlaceItem: (item: WardrobeItem) => void
  onFormChange: <K extends keyof OutfitFormState>(key: K, value: OutfitFormState[K]) => void
  onStepChange: (step: BuilderStep) => void
  onClose: () => void
  onSave: () => void
  onRequestDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
  saveState: BuilderSaveState
  saveError: string
  deleteState: DeleteState
  deleteError: string
  canProceedToStep2: boolean
  canSave: boolean
  stepIndicator: string
  onNavigateToUpload: () => void
}

export function BuilderBody(props: BuilderBodyProps) {
  const {
    mode,
    step,
    form,
    placement,
    selectedItemId,
    onSelectItem,
    onMoveItem,
    onScaleItem,
    onAdjustZIndex,
    onRemovePlacedItem,
    pickerTab,
    pickerSearch,
    pickerItems,
    wardrobeEmpty,
    onPickerTabChange,
    onPickerSearchChange,
    onPlaceItem,
    onFormChange,
    onStepChange,
    onClose,
    onSave,
    onRequestDelete,
    onCancelDelete,
    onConfirmDelete,
    saveState,
    saveError,
    deleteState,
    deleteError,
    canProceedToStep2,
    canSave,
    stepIndicator,
    onNavigateToUpload,
  } = props

  return (
    <div className="closet-builder">
      <div className="closet-builder__topbar">
        <div>
          {props.titleSlot}
          <p className="closet-builder__stepper">{stepIndicator}</p>
        </div>
        <button type="button" className="closet-builder__close" aria-label="Close builder" onClick={onClose}>
          <X size={18} strokeWidth={1.4} aria-hidden="true" />
        </button>
      </div>

      {step === 'compose' && mode === 'create' && props.aiComposer ? props.aiComposer : null}

      {step === 'compose' ? (
        <div className="closet-builder__compose">
          <ComposePicker
            tab={pickerTab}
            search={pickerSearch}
            items={pickerItems}
            placement={placement}
            wardrobeEmpty={wardrobeEmpty}
            onTabChange={onPickerTabChange}
            onSearchChange={onPickerSearchChange}
            onPlaceItem={onPlaceItem}
            onNavigateToUpload={onNavigateToUpload}
          />
          <Canvas
            placement={placement}
            interactive
            selectedItemId={selectedItemId}
            onSelectItem={onSelectItem}
            onMoveItem={onMoveItem}
            onScaleItem={onScaleItem}
            onAdjustZIndex={onAdjustZIndex}
            onRemovePlacedItem={onRemovePlacedItem}
          />
        </div>
      ) : (
        <div className="closet-builder__describe">
          <Canvas placement={placement} interactive={false} />
          <DescribeForm
            form={form}
            mode={mode}
            saveError={saveError}
            saveState={saveState}
            deleteState={deleteState}
            deleteError={deleteError}
            onFormChange={onFormChange}
            onRequestDelete={onRequestDelete}
            onCancelDelete={onCancelDelete}
            onConfirmDelete={onConfirmDelete}
          />
        </div>
      )}

      <div className={`closet-builder__footer closet-builder__footer--${step} closet-builder__footer--${mode}`}>
        {step === 'compose' ? (
          <>
            <Button variant="outline" color="neutral" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              type="button"
              onClick={() => onStepChange('describe')}
              disabled={!canProceedToStep2}
            >
              Next
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" color="neutral" type="button" onClick={() => onStepChange('compose')}>
              <ChevronLeft size={16} strokeWidth={1.4} aria-hidden="true" />
              Back
            </Button>
            {mode === 'edit' && deleteState === 'idle' ? (
              <Button variant="outline" color="destructive" type="button" onClick={onRequestDelete}>
                Delete
              </Button>
            ) : null}
            <span className="closet-builder__footer-spacer" />
            <Button variant="outline" color="neutral" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button color="primary" type="button" onClick={onSave} disabled={!canSave || saveState === 'saving'}>
              {saveState === 'saving' ? 'Saving…' : 'Save'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
