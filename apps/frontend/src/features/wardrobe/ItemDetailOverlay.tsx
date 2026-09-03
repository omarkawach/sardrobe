import {
  Button,
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
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
} from '@sardrobe/react-components'
import { EditableNameTitle } from '../../components/closet/EditableNameTitle'
import { ClosetIcon } from '../../components/closet/ClosetIcon'
import { WardrobeMultiSelect, WardrobeSelect, toSelectOptions } from '../../components/closet/FormControls'
import { ZoomableImage } from '../shared/ZoomableImage'
import {
  arrayToCsv,
  categories,
  COLORS,
  csvToArray,
  OCCASIONS,
  SEASONS,
  SUBCATEGORIES_BY_CATEGORY,
  type DetailState,
  type WardrobeFormState,
  type WardrobeItem,
} from './domain'

type ItemDetailOverlayProps = {
  closeItemDialog: () => void
  confirmingDelete: boolean
  deleteSelectedItem: () => void
  detailMessage: string
  detailState: DetailState
  editForm: WardrobeFormState
  isMobileViewport: boolean
  saveSelectedItem: () => void
  selectedCreatedDate: string | null
  selectedItem: WardrobeItem | null
  selectedUpdatedDate: string | null
  setConfirmingDelete: (confirming: boolean) => void
  setDetailMessage: (message: string) => void
  updateEditForm: (key: keyof WardrobeFormState, value: string) => void
}

export function ItemDetailOverlay(props: ItemDetailOverlayProps) {
  const { closeItemDialog, detailState, editForm, isMobileViewport, selectedItem, updateEditForm } = props

  if (isMobileViewport) {
    return (
      <Drawer open={selectedItem !== null} modal onOpenChange={(open) => {
        if (!open) closeItemDialog()
      }}>
        <DrawerPortal>
          <DrawerBackdrop />
          <DrawerViewport>
            <DrawerPopup side="bottom" className="closet-detail-drawer">
              <DrawerContent className="closet-detail-drawer__content" data-base-ui-swipe-ignore>
                {selectedItem ? (
                  <>
                    <div className="closet-detail-drawer__topbar">
                      <div>
                        <EditableNameTitle
                          value={editForm.name}
                          fallback={selectedItem.name || 'Untitled wardrobe item'}
                          label="Item name"
                          name="edit-name"
                          disabled={detailState === 'saving' || detailState === 'deleting'}
                          onChange={(value) => updateEditForm('name', value)}
                          renderTitle={(className, children, title) => (
                            <DrawerTitle className={`${className} closet-detail-drawer__title`} title={title}>
                              {children}
                            </DrawerTitle>
                          )}
                        />
                        <p className="closet-detail-drawer__description">Cutout and details.</p>
                      </div>
                      <DrawerClose className="closet-detail-drawer__close" aria-label="Close">
                        <ClosetIcon name="close" />
                      </DrawerClose>
                    </div>
                    <ItemDetailBody {...props} />
                  </>
                ) : null}
              </DrawerContent>
            </DrawerPopup>
          </DrawerViewport>
        </DrawerPortal>
      </Drawer>
    )
  }

  return (
    <Dialog open={selectedItem !== null} onOpenChange={(open) => {
      if (!open) closeItemDialog()
    }}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup size="lg" className="closet-dialog">
          {selectedItem ? (
            <>
              <div className="closet-dialog__topbar">
                <div>
                  <EditableNameTitle
                    value={editForm.name}
                    fallback={selectedItem.name || 'Untitled wardrobe item'}
                    label="Item name"
                    name="edit-name"
                    disabled={detailState === 'saving' || detailState === 'deleting'}
                    onChange={(value) => updateEditForm('name', value)}
                    renderTitle={(className, children, title) => (
                      <DialogTitle className={`${className} closet-dialog__title`} title={title}>
                        {children}
                      </DialogTitle>
                    )}
                  />
                  <DialogDescription className="closet-dialog__description">Cutout and details.</DialogDescription>
                </div>
                <DialogClose className="closet-dialog__close" aria-label="Close">
                  <ClosetIcon name="close" />
                </DialogClose>
              </div>
              <ItemDetailBody {...props} />
            </>
          ) : null}
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}

function ItemDetailBody({
  confirmingDelete,
  deleteSelectedItem,
  detailMessage,
  detailState,
  editForm,
  isMobileViewport,
  saveSelectedItem,
  selectedCreatedDate,
  selectedItem,
  selectedUpdatedDate,
  setConfirmingDelete,
  setDetailMessage,
  updateEditForm,
}: ItemDetailOverlayProps) {
  if (!selectedItem) return null

  return (
    <div className="closet-dialog__layout">
      <div className="closet-dialog__media closet-preview--cutout">
        {selectedItem.media && isMobileViewport ? (
          <img
            src={selectedItem.media.url}
            alt={`${selectedItem.name || 'Wardrobe item'} cutout`}
            width={selectedItem.media.width ?? undefined}
            height={selectedItem.media.height ?? undefined}
          />
        ) : selectedItem.media ? (
          <ZoomableImage
            src={selectedItem.media.url}
            alt={`${selectedItem.name || 'Wardrobe item'} cutout`}
            label={`Zoom ${selectedItem.name || 'wardrobe item'} image`}
            width={selectedItem.media.width ?? undefined}
            height={selectedItem.media.height ?? undefined}
          />
        ) : (
          <span>No cutout saved</span>
        )}
      </div>

      <form
        className="closet-dialog__form"
        onSubmit={(event) => {
          event.preventDefault()
          saveSelectedItem()
        }}
      >
        <div className="closet-dialog__meta">
          {selectedCreatedDate ? <span>Added {selectedCreatedDate}</span> : null}
          {selectedUpdatedDate ? <span>Updated {selectedUpdatedDate}</span> : null}
        </div>

        <div className="closet-details__row">
          <div className="closet-field">
            <span>Category</span>
            <WardrobeSelect
              value={editForm.category}
              onValueChange={(value) => updateEditForm('category', value)}
              placeholder="Select category"
              options={toSelectOptions(categories)}
              ariaLabel="Category"
            />
          </div>
          <div className="closet-field">
            <span>Subcategory</span>
            <WardrobeSelect
              value={editForm.subcategory}
              onValueChange={(value) => updateEditForm('subcategory', value)}
              placeholder={
                (SUBCATEGORIES_BY_CATEGORY[editForm.category] ?? []).length === 0
                  ? 'Pick a category first'
                  : 'Select subcategory'
              }
              options={toSelectOptions(SUBCATEGORIES_BY_CATEGORY[editForm.category] ?? [])}
              ariaLabel="Subcategory"
            />
          </div>
        </div>

        <div className="closet-field">
          <span>Color</span>
          <WardrobeSelect
            value={editForm.color}
            onValueChange={(value) => updateEditForm('color', value)}
            placeholder="Select color"
            options={toSelectOptions(COLORS)}
            ariaLabel="Color"
          />
        </div>

        <div className="closet-details__row">
          <div className="closet-field">
            <span>Season</span>
            <WardrobeMultiSelect
              value={csvToArray(editForm.season)}
              onValueChange={(values) => updateEditForm('season', arrayToCsv(values))}
              placeholder="Select seasons"
              options={SEASONS}
              ariaLabel="Season"
            />
          </div>
          <div className="closet-field">
            <span>Occasion</span>
            <WardrobeMultiSelect
              value={csvToArray(editForm.occasion)}
              onValueChange={(values) => updateEditForm('occasion', arrayToCsv(values))}
              placeholder="Select occasions"
              options={OCCASIONS}
              ariaLabel="Occasion"
            />
          </div>
        </div>

        <label className="closet-field">
          <span>Notes</span>
          <textarea name="edit-notes" value={editForm.notes} onChange={(event) => updateEditForm('notes', event.target.value)} rows={3} />
        </label>

        <p className={`closet-dialog__message closet-dialog__message--${detailState}`} role="status" aria-live="polite">
          {detailMessage}
        </p>

        {confirmingDelete ? (
          <div className="closet-delete-confirm">
            <strong>Delete this item?</strong>
            <span>This removes the item and its saved cutout from storage.</span>
            <div>
              <Button type="button" variant="outline" color="neutral" onClick={() => {
                setConfirmingDelete(false)
                setDetailMessage('')
              }}>
                Cancel
              </Button>
              <Button type="button" color="destructive" onClick={deleteSelectedItem}>
                {detailState === 'deleting' ? 'Deleting...' : 'Delete item'}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="closet-dialog__actions">
          <Button type="submit" color="primary" disabled={detailState === 'saving'}>
            {detailState === 'saving' ? 'Saving...' : 'Save changes'}
          </Button>
          <Button type="button" variant="outline" color="destructive" onClick={deleteSelectedItem} disabled={detailState === 'deleting'}>
            Delete
          </Button>
        </div>
      </form>
    </div>
  )
}
