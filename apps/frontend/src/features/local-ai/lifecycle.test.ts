import { describe, expect, it } from 'vitest'
import {
  beginLocalAiLoad,
  finishLocalAiLoad,
  getInterruptedLocalAiLoad,
  recordLocalAiLoadProgress,
} from './lifecycle'

function createStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

describe('local AI load lifecycle', () => {
  it('recovers a recent load that did not finish', () => {
    const storage = createStorage()
    beginLocalAiLoad(storage, 1_000)
    recordLocalAiLoadProgress(79.6, storage)

    expect(getInterruptedLocalAiLoad(storage, 2_000)).toEqual({
      startedAt: 1_000,
      progress: 80,
    })
    finishLocalAiLoad(storage)
    expect(getInterruptedLocalAiLoad(storage, 2_000)).toBeNull()
  })

  it('does not recover a completed load', () => {
    const storage = createStorage()
    beginLocalAiLoad(storage, 1_000)
    finishLocalAiLoad(storage)

    expect(getInterruptedLocalAiLoad(storage, 2_000)).toBeNull()
  })

  it('ignores stale attempts', () => {
    const storage = createStorage()
    beginLocalAiLoad(storage, 1_000)

    expect(getInterruptedLocalAiLoad(storage, 1_000 + 16 * 60 * 1_000)).toBeNull()
  })
})
