import * as Sentry from '@sentry/astro'

function scrubUrl(url) {
  if (!url) return url
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return url.split('?')[0]
  }
}

function scrubSpan(span) {
  span.data = {}
  span.description = scrubUrl(span.description)
  return span
}

function scrubEvent(event) {
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

Sentry.init({
  dsn: import.meta.env.PUBLIC_SENTRY_DSN,
  environment: import.meta.env.APP_ENV ?? import.meta.env.MODE,
  enableLogs: true,
  sendDefaultPii: false,
  tracesSampleRate: 0.15,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  // Errors thrown inside Cloudflare's auto-injected RUM beacon are not actionable here.
  denyUrls: [/static\.cloudflareinsights\.com/, /\/cdn-cgi\//],
  integrations: [Sentry.browserTracingIntegration()],
  beforeSend: scrubEvent,
  beforeSendSpan: scrubSpan,
  beforeSendTransaction: scrubEvent,
})
