import { describe, expect, it } from 'vitest'
import { scrubEvent, sentryOptions } from '../src/observability'

describe('Sentry privacy scrubbing', () => {
  it('removes request, user, and span data while preserving route context', () => {
    const event = {
      request: {
        headers: { cookie: 'session=secret', referer: 'https://sardrobe.com/app?search=private' },
        cookies: { session: 'secret' },
        data: { notes: 'private' },
        query_string: 'search=private',
        url: 'https://sardrobe.com/api/wardrobe/items?search=private',
      },
      user: {
        id: 'user-1',
        email: 'user@example.com',
        ip_address: '192.0.2.1',
        username: 'private',
      },
      spans: [
        {
          data: { 'http.query': 'search=private' },
          description: 'https://sardrobe.com/api/wardrobe/items?search=private',
        },
      ],
    }

    scrubEvent(event)

    expect(event.request).toEqual({
      url: 'https://sardrobe.com/api/wardrobe/items',
    })
    expect(event.user).toEqual({ id: 'user-1' })
    expect(event.spans).toEqual([
      {
        data: {},
        description: 'https://sardrobe.com/api/wardrobe/items',
      },
    ])
  })

  it('applies the same scrubber to errors, transactions, and spans', () => {
    const options = sentryOptions({ APP_ENV: 'test' })

    expect(options.beforeSend).toBe(scrubEvent)
    expect(options.beforeSendTransaction).toBe(scrubEvent)
    expect(options.beforeSendSpan).toBeTypeOf('function')
    expect(options.sendDefaultPii).toBe(false)
  })
})
