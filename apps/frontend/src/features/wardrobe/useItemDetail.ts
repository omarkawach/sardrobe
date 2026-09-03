import { useState } from 'react'
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

  function showAgentItemUpdate(item: WardrobeItem) {
    applySelectedItemUpdate(item)
    setDetailState('idle')
    setDetailMessage('Updated by agent.')
    setConfirmingDelete(false)
  }

  function removeAgentDeletedItem(itemId: string) {
    removeItem(itemId)

    if (selectedItem?.id === itemId) {
      closeItemDialog()
    }
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
    setSelectedItem(null)
    setDetailState('idle')
    setDetailMessage('')
    setConfirmingDelete(false)
  }

  async function openItem(item: WardrobeItem) {
    setSelectedItem(item)
    setEditForm(formFromItem(item))
    setDetailState('loading')
    setDetailMessage('Loading clothing details...')
    setConfirmingDelete(false)

    try {
      const nextItem = await fetchWardrobeItem(item.id)
      applySelectedItemUpdate(nextItem)
      setDetailState('idle')
      setDetailMessage('')
    } catch (error) {
      setDetailState('error')
      setDetailMessage(error instanceof Error ? error.message : 'Could not load this item.')
    }
  }

  async function saveSelectedItem() {
    if (!selectedItem) return

    if (!editForm.name.trim() || !editForm.category.trim()) {
      setDetailState('error')
      setDetailMessage('Name and category are required.')
      return
    }

    setDetailState('saving')
    setDetailMessage('Saving changes...')
    setConfirmingDelete(false)

    try {
      const item = await updateWardrobeItem(selectedItem.id, editForm)
      applySelectedItemUpdate(item)
      setDetailState('idle')
      setDetailMessage('Saved.')
    } catch (error) {
      setDetailState('error')
      setDetailMessage(error instanceof Error ? error.message : 'Could not save changes.')
    }
  }

  async function deleteSelectedItem() {
    if (!selectedItem) return

    if (!confirmingDelete) {
      setConfirmingDelete(true)
      setDetailState('idle')
      setDetailMessage('Confirm delete.')
      return
    }

    setDetailState('deleting')
    setDetailMessage('Deleting item...')

    try {
      await deleteWardrobeItem(selectedItem.id)
      removeItem(selectedItem.id)
      closeItemDialog()
    } catch (error) {
      setDetailState('error')
      setDetailMessage(error instanceof Error ? error.message : 'Could not delete this item.')
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
    removeAgentDeletedItem,
    saveSelectedItem,
    selectedCreatedDate,
    selectedItem,
    selectedUpdatedDate,
    setConfirmingDelete,
    setDetailMessage,
    showAgentItemUpdate,
    updateEditForm,
  }
}
