import { useEffect, useState } from 'react'
import { fetchWardrobeItems } from './api'
import type { WardrobeItem } from './domain'

export function useWardrobeItems() {
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadItems() {
      try {
        const nextItems = await fetchWardrobeItems()

        if (active && nextItems) {
          setItems(nextItems)
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadItems()

    return () => {
      active = false
    }
  }, [])

  async function refreshItems() {
    const nextItems = await fetchWardrobeItems()

    if (nextItems) {
      setItems(nextItems)
    }
  }

  function applyItemUpdate(item: WardrobeItem) {
    setItems((current) => {
      const exists = current.some((existing) => existing.id === item.id)

      if (!exists) {
        return [item, ...current]
      }

      return current.map((existing) => (existing.id === item.id ? item : existing))
    })
  }

  function removeItem(itemId: string) {
    setItems((current) => current.filter((item) => item.id !== itemId))
  }

  return {
    items,
    isLoading,
    refreshItems,
    applyItemUpdate,
    removeItem,
  }
}
