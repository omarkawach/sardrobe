import { useRef, useState } from 'react'
import { deleteWardrobeItem, fetchWardrobeItem, updateWardrobeItem } from './api'
import {
  formFromItem,
  formatItemDate,
  initialFormState,
  SUBCATEGORIES_BY_CATEGORY,
  type DetailState,
  type WardrobeFormState,
  type WardrobeItem,
} from './domain'

export function useItemDetail({
  applyItemUpdate,
  removeItem,
}: {
  applyItemUpdate: (item: WardrobeItem) => void
  removeItem: (itemId: string) => void
}) {
  const selectionVersionRef = useRef(0)
  const savingRef = useRef(false)
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null)
  const [editForm, setEditForm] = useState<WardrobeFormState>(initialFormState)
  const [detailState, setDetailState] = useState<DetailState>('idle')
  const [detailMessage, setDetailMessage] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function applySelectedItemUpdate(item: WardrobeItem) {
    applyItemUpdate(item)
    setSelectedItem(item)
    setEditForm(formFromItem(item))
  }

  function showItemEditor(item: WardrobeItem) {
    selectionVersionRef.current += 1
    applySelectedItemUpdate(item)
    setDetailState('idle')
    setDetailMessage('')
    setConfirmingDelete(false)
  }

  function updateEditForm(key: keyof WardrobeFormState, value: string) {
    setEditForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'category') {
        const allowed = SUBCATEGORIES_BY_CATEGORY[value] ?? []
        if (next.subcategory && !allowed.includes(next.subcategory)) {
          next.subcategory = ''
        }
      }
      return next
    })
    setConfirmingDelete(false)
  }

  function closeItemDialog() {
    selectionVersionRef.current += 1
    setSelectedItem(null)
    setDetailState('idle')
    setDetailMessage('')
    setConfirmingDelete(false)
  }

  async function openItem(item: WardrobeItem) {
    const selectionVersion = ++selectionVersionRef.current
    setSelectedItem(item)
    setEditForm(formFromItem(item))
    setDetailState('loading')
    setDetailMessage('Loading clothing details...')
    setConfirmingDelete(false)

    try {
      const nextItem = await fetchWardrobeItem(item.id)
      if (selectionVersionRef.current !== selectionVersion) return
      applySelectedItemUpdate(nextItem)
      setDetailState('idle')
      setDetailMessage('')
    } catch (error) {
      if (selectionVersionRef.current === selectionVersion) {
        setDetailState('error')
        setDetailMessage(error instanceof Error ? error.message : 'Could not load this item.')
      }
    }
  }

  async function saveSelectedItem(submittedForm = editForm) {
    if (!selectedItem || savingRef.current || detailState === 'loading' || detailState === 'deleting') return null

    const selectionVersion = selectionVersionRef.current
    savingRef.current = true
    setDetailState('saving')
    setDetailMessage('Saving changes...')
    setConfirmingDelete(false)

    try {
      const item = await updateWardrobeItem(selectedItem.id, submittedForm)
      if (selectionVersionRef.current !== selectionVersion) {
        applyItemUpdate(item)
        return item
      }
      applySelectedItemUpdate(item)
      setDetailState('idle')
      setDetailMessage('Saved.')
      return item
    } catch (error) {
      if (selectionVersionRef.current === selectionVersion) {
        setDetailState('error')
        setDetailMessage(error instanceof Error ? error.message : 'Could not save changes.')
      }
      return null
    } finally {
      savingRef.current = false
    }
  }

  async function deleteSelectedItem() {
    if (!selectedItem) return null

    setDetailState('deleting')
    setDetailMessage('Deleting item...')

    try {
      await deleteWardrobeItem(selectedItem.id)
      removeItem(selectedItem.id)
      closeItemDialog()
      return selectedItem.id
    } catch (error) {
      setDetailState('error')
      throw error
    }
  }

  const selectedCreatedDate = selectedItem ? formatItemDate(selectedItem.createdAt) : null
  const selectedUpdatedDate = selectedItem ? formatItemDate(selectedItem.updatedAt) : null

  return {
    closeItemDialog,
    confirmingDelete,
    deleteSelectedItem,
    detailMessage,
    detailState,
    editForm,
    openItem,
    saveSelectedItem,
    selectedCreatedDate,
    selectedItem,
    selectedUpdatedDate,
    setConfirmingDelete,
    setDetailMessage,
    showItemEditor,
    updateEditForm,
  }
}
