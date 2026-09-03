import * as Sentry from '@sentry/cloudflare'

type SentryEnv = {
  SENTRY_DSN?: string
  APP_ENV?: string
}

function scrubUrl(url: string | undefined) {
  if (!url) {
    return url
  }
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
  request?: {
    headers?: unknown
    cookies?: unknown
    data?: unknown
    url?: string
    query_string?: unknown
  }
  user?: { ip_address?: unknown; email?: unknown; username?: unknown } & Record<string, unknown>
  spans?: ScrubbableSpan[]
}

function scrubSpan<T extends ScrubbableSpan>(span: T): T {
  span.data = {}
  span.description = scrubUrl(span.description)
  return span
}

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
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

export function sentryOptions(env: SentryEnv) {
  return {
    dsn: env.SENTRY_DSN,
    environment: env.APP_ENV ?? 'unknown',
    enableLogs: true,
    tracesSampleRate: 0.15,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    beforeSendSpan: scrubSpan,
    beforeSendTransaction: scrubEvent,
  }
}

export type AuditEvent =
  | 'auth.sign_in'
  | 'auth.sign_in_failed'
  | 'auth.sign_out'
  | 'item.delete'
  | 'outfit.delete'
  | 'plan.delete'
  | 'media.access_denied'
  | 'account.delete'

type AuditAttributes = {
  userId?: string | null
  mediaCount?: number
  deletedMediaCount?: number
  revokedGrants?: number
}

export function auditEvent(
  event: AuditEvent,
  attributes: AuditAttributes = {},
) {
  Sentry.logger.info(event, {
    audit: true,
    ...attributes,
  })
}
