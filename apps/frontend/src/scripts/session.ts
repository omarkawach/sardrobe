export type SessionPayload = {
  authenticated: true
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
  session: {
    expiresAt: string
  }
}

type SessionResponse = SessionPayload | { authenticated: false }

export async function loadSession() {
  try {
    const response = await fetch('/api/me', {
      credentials: 'include',
      headers: {
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as SessionResponse

    if (!payload.authenticated) {
      return null
    }

    return payload
  } catch {
    return null
  }
}
