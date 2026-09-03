import * as Sentry from '@sentry/cloudflare'
import { isProtectedAppPath, requiresCrossOriginIsolation } from './isolation'

type FrontendEnv = Omit<Env, 'APP_ENV' | 'PUBLIC_APP_URL' | 'SENTRY_DSN'> & {
  APP_ENV?: string
  PUBLIC_APP_URL?: string
  SENTRY_DSN?: string
  ASSETS: Fetcher
}

function scrubUrl(url: string | undefined) {
  if (!url) return url
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return url.split('?')[0]
  }
}

type ScrubbableSpan = {
  data: Record<string, unknown>
  description?: string
}

type ScrubbableEvent = {
  request?: { headers?: unknown; cookies?: unknown; data?: unknown; query_string?: unknown; url?: string }
  user?: { ip_address?: unknown; email?: unknown; username?: unknown }
  spans?: ScrubbableSpan[]
}

function scrubSpan<T extends ScrubbableSpan>(span: T): T {
  span.data = {}
  span.description = scrubUrl(span.description)
  return span
}

function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) {
    delete event.request.headers
    delete event.request.cookies
    delete event.request.data
    delete event.request.query_string
    event.request.url = scrubUrl(event.request.url)
  }
  if (event.user) {
    delete event.user.ip_address
    delete event.user.email
    delete event.user.username
  }
  event.spans?.forEach(scrubSpan)
  return event
}

function isApiPath(pathname: string) {
  return pathname === '/api' || pathname.startsWith('/api/')
}

async function serveModelAsset(pathname: string, env: FrontendEnv) {
  let key: string

  try {
    key = decodeURIComponent(pathname.slice('/models/'.length))
  } catch {
    return new Response('Not found', { status: 404 })
  }

  if (!key || key.includes('..') || key.startsWith('/') || !/^[a-zA-Z0-9._/-]+$/.test(key)) {
    return new Response('Not found', { status: 404 })
  }

  const object = await env.MODEL_ASSETS.get(key)
  if (!object) return new Response('Not found', { status: 404 })

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')

  return new Response(object.body, { headers })
}

function buildBackendRequest(request: Request) {
  const url = new URL(request.url)
  const backendURL = new URL(url.pathname + url.search, 'https://sardrobe-backend.internal')
  const proxyRequest = new Request(backendURL, request)
  const headers = new Headers(proxyRequest.headers)

  headers.set('x-forwarded-host', url.host)
  headers.set('x-forwarded-proto', url.protocol.replace(':', ''))

  return new Request(proxyRequest, { headers })
}

async function proxyToBackend(request: Request, env: FrontendEnv) {
  return env.BACKEND_SERVICE.fetch(buildBackendRequest(request))
}

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval' 'unsafe-inline' blob: https://static.cloudflareinsights.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' data: blob: https://models.sardrobe.com https://cdn.jsdelivr.net https://huggingface.co https://*.huggingface.co https://*.hf.co https://cloudflareinsights.com https://*.ingest.us.sentry.io ws://127.0.0.1:* ws://localhost:*",
  "worker-src 'self' blob:",
  "child-src 'self' blob: https://cdn.jsdelivr.net",
  "frame-src 'self' blob: https://cdn.jsdelivr.net",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "manifest-src 'self'",
].join('; ')

function withSecurityHeaders(headers: Headers) {
  headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY)
  headers.set('X-Frame-Options', 'DENY')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}

function withSecurityResponse(
  response: Response,
  { isolate, preventIndexing }: { isolate: boolean; preventIndexing?: boolean },
) {
  const headers = new Headers(response.headers)

  withSecurityHeaders(headers)

  if (preventIndexing) {
    headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  if (isolate) {
    headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    headers.set('Cross-Origin-Embedder-Policy', 'credentialless')
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function redirectToPublicOrigin(request: Request, env: FrontendEnv) {
  if (!env.PUBLIC_APP_URL) {
    return null
  }

  const requestUrl = new URL(request.url)

  if (requestUrl.hostname !== 'sardrobe.com' && !requestUrl.hostname.endsWith('.sardrobe.com')) {
    return null
  }

  const publicOrigin = new URL(env.PUBLIC_APP_URL).origin

  if (requestUrl.origin === publicOrigin) {
    return null
  }

  return Response.redirect(new URL(requestUrl.pathname + requestUrl.search, publicOrigin), 308)
}

async function requireSession(request: Request, env: FrontendEnv) {
  const url = new URL(request.url)
  const headers = new Headers(request.headers)

  headers.set('x-forwarded-host', url.host)
  headers.set('x-forwarded-proto', url.protocol.replace(':', ''))

  const response = await env.BACKEND_SERVICE.fetch(
    new Request(new URL('/api/me', 'https://sardrobe-backend.internal'), {
      method: 'GET',
      headers,
    }),
  )

  if (!response.ok) {
    return false
  }

  try {
    const payload = (await response.json()) as { authenticated?: unknown }

    return payload.authenticated === true
  } catch {
    return false
  }
}

const handler = {
  async fetch(request: Request, env: FrontendEnv) {
    const url = new URL(request.url)
    const preventIndexing = env.APP_ENV === 'development'
    const originRedirect = redirectToPublicOrigin(request, env)

    if (originRedirect) {
      return withSecurityResponse(originRedirect, { isolate: false, preventIndexing })
    }

    if (isApiPath(url.pathname)) {
      return proxyToBackend(request, env)
    }

    if (request.method === 'GET' && url.pathname.startsWith('/models/')) {
      return withSecurityResponse(await serveModelAsset(url.pathname, env), {
        isolate: false,
        preventIndexing,
      })
    }

    if (request.method === 'GET' && isProtectedAppPath(url.pathname)) {
      const authenticated = await requireSession(request, env)

      if (!authenticated) {
        return withSecurityResponse(Response.redirect(new URL('/', request.url), 302), {
          isolate: true,
          preventIndexing,
        })
      }
    }

    const response = await env.ASSETS.fetch(request)
    const isolate = requiresCrossOriginIsolation(url.pathname)

    return withSecurityResponse(response, { isolate, preventIndexing })
  },
}

export default Sentry.withSentry(
  (env: FrontendEnv) => ({
    dsn: env.SENTRY_DSN,
    environment: env.APP_ENV ?? 'unknown',
    enableLogs: true,
    tracesSampleRate: 0.15,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    beforeSendSpan: scrubSpan,
    beforeSendTransaction: scrubEvent,
  }),
  handler,
)
