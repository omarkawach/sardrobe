import {
  Button,
  Form,
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
import { WardrobeDetailsFields, readWardrobeForm } from '../../components/closet/FormControls'
import { ZoomableImage } from '../shared/ZoomableImage'
import {
  type DetailState,
  type WardrobeFormState,
  type WardrobeItem,
} from './domain'

type ItemDetailOverlayProps = {
  closeItemDialog: () => void
  confirmingDelete: boolean
  deleteSelectedItem: () => Promise<string | null | undefined>
  detailMessage: string
  detailState: DetailState
  editForm: WardrobeFormState
  isMobileViewport: boolean
  saveSelectedItem: (form?: WardrobeFormState) => Promise<WardrobeItem | null>
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
                          name="name"
                          form={`wardrobe-item-form-${selectedItem.id}`}
                          disabled={detailState === 'saving' || detailState === 'deleting'}
                          pendingSubmit={detailState === 'saving' || detailState === 'deleting'}
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
                    name="name"
                    form={`wardrobe-item-form-${selectedItem.id}`}
                    disabled={detailState === 'saving' || detailState === 'deleting'}
                    pendingSubmit={detailState === 'saving' || detailState === 'deleting'}
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

      <Form
        key={selectedItem.id}
        id={`wardrobe-item-form-${selectedItem.id}`}
        toolname={detailState === 'loading' ? undefined : 'wardrobe_item_mutate'}
        actions={['update', 'delete']} defaultAction="update" confirmActions={['delete']} skipValidationActions={['delete']}
        tooldescription={`Change wardrobe item ${selectedItem.id}. action "update" (the default) saves its name and metadata directly with no confirmation. action "delete" permanently removes this item and its cutout and requires confirm: true. Only set fields you are changing; omitted fields keep their current values. Category, subcategory, color, occasion, and season must use the allowed values, and subcategory must belong to the chosen category. Pass [] to clear occasions or seasons and an empty string to clear optional text. Inspect wardrobe_item_image before guessing visual attributes; do not invent values. Returns the updated item.`}
        tooltitle="Change a wardrobe item"
        toolautosubmit=""
        className="closet-dialog__form"
        onSubmitError={setDetailMessage}
        onSubmit={async (data, { action, fields }) => {
          if (action === 'delete') {
            const itemId = await deleteSelectedItem()
            if (!itemId) throw new Error('Could not delete this item. Try again.')
            return { kind: 'wardrobe.item_deleted', itemId }
          }
          const item = await saveSelectedItem(readWardrobeForm(data, editForm, fields))
          if (!item) throw new Error('Could not save this item. Check its details and try again.')
          return { kind: 'wardrobe.item_updated', item }
        }}
      >
        <div className="closet-dialog__meta">
          {selectedCreatedDate ? <span>Added {selectedCreatedDate}</span> : null}
          {selectedUpdatedDate ? <span>Updated {selectedUpdatedDate}</span> : null}
        </div>

        <WardrobeDetailsFields form={editForm} onChange={updateEditForm} />

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
              <Button type="submit" name="intent" value="delete" color="destructive">
                {detailState === 'deleting' ? 'Deleting...' : 'Delete item'}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="closet-dialog__actions">
          <Button type="submit" color="primary" disabled={detailState === 'saving' || detailState === 'loading' || detailState === 'deleting'}>
            {detailState === 'saving' ? 'Saving...' : 'Save changes'}
          </Button>
          <Button type="button" variant="outline" color="destructive" onClick={() => { setConfirmingDelete(true); setDetailMessage('Confirm delete.') }} disabled={detailState === 'deleting'}>
            Delete
          </Button>
        </div>
      </Form>
    </div>
  )
}
