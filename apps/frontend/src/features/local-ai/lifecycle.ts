const LOCAL_AI_LOAD_ATTEMPT_KEY = 'sardrobe-local-ai-load-attempt'
const LOAD_ATTEMPT_MAX_AGE_MS = 15 * 60 * 1000

export type LocalAiLoadAttempt = {
  startedAt: number
  progress: number
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function beginLocalAiLoad(storage = browserStorage(), now = Date.now()) {
  writeLoadAttempt({ startedAt: now, progress: 0 }, storage)
}

export function recordLocalAiLoadProgress(progress: number, storage = browserStorage()) {
  const attempt = readLoadAttempt(storage)
  if (!attempt) return

  writeLoadAttempt({
    ...attempt,
    progress: Math.max(0, Math.min(100, Math.round(progress))),
  }, storage)
}

export function finishLocalAiLoad(storage = browserStorage()) {
  try {
    storage?.removeItem(LOCAL_AI_LOAD_ATTEMPT_KEY)
  } catch {
    // Storage may be unavailable in private browsing or a restricted iframe.
  }
}

export function getInterruptedLocalAiLoad(
  storage = browserStorage(),
  now = Date.now(),
): LocalAiLoadAttempt | null {
  const attempt = readLoadAttempt(storage)

  if (!attempt) return null
  if (attempt.startedAt > now || now - attempt.startedAt > LOAD_ATTEMPT_MAX_AGE_MS) return null
  return attempt
}

function readLoadAttempt(storage: Storage | null): LocalAiLoadAttempt | null {
  try {
    const raw = storage?.getItem(LOCAL_AI_LOAD_ATTEMPT_KEY)
    if (!raw) return null

    const value = JSON.parse(raw) as Partial<LocalAiLoadAttempt>
    if (!Number.isFinite(value.startedAt) || !Number.isFinite(value.progress)) return null

    return {
      startedAt: Number(value.startedAt),
      progress: Number(value.progress),
    }
  } catch {
    return null
  }
}

function writeLoadAttempt(attempt: LocalAiLoadAttempt, storage: Storage | null) {
  try {
    storage?.setItem(LOCAL_AI_LOAD_ATTEMPT_KEY, JSON.stringify(attempt))
  } catch {
    // The load can still proceed when persistent storage is unavailable.
  }
}
