import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { execFileSync } from 'node:child_process'
import { createHmac, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, relative, extname } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'

// The production frontend build and real backend Worker, with fresh local storage.
// Seed a valid local session instead of adding an authentication bypass to the app.
export async function startApplication() {
  const root = fileURLToPath(new URL('../../../', import.meta.url))
  const temporary = await mkdtemp(join(tmpdir(), 'sardrobe-webmcp-'))
  const origin = 'http://localhost:4344'
  const secret = randomBytes(32).toString('hex')
  const token = randomBytes(32).toString('hex')
  let mf
  let server
  const close = async () => {
    server?.closeAllConnections()
    if (server?.listening) await new Promise((done) => server.close(done))
    await mf?.dispose()
    await rm(temporary, { recursive: true, force: true })
  }
  try {
    execFileSync('pnpm', ['--filter', '@sardrobe/backend', 'exec', 'wrangler', 'deploy', '--dry-run', '--outdir', join(temporary, 'backend')], {
      cwd: root, stdio: 'pipe', env: { ...process.env, WRANGLER_LOG_PATH: join(temporary, 'wrangler.log') },
    })
    mf = new Miniflare(convertV4MiniflareOptions({
      port: 0,
      workers: [{
        name: 'backend', modules: true, script: await readFile(join(temporary, 'backend/index.js'), 'utf8'),
        compatibilityDate: '2026-08-22', compatibilityFlags: ['nodejs_compat'],
        bindings: {
          APP_ENV: 'test', BETTER_AUTH_URL: origin, BETTER_AUTH_SECRET: secret,
          GOOGLE_CLIENT_ID: 'local-test-client', GOOGLE_CLIENT_SECRET: 'local-test-secret', SENTRY_DSN: '',
        },
        d1Databases: ['DB'], r2Buckets: ['WARDROBE_MEDIA'], images: { binding: 'IMAGES' },
        ratelimits: { WRITE_RATE_LIMITER: { namespace_id: '1', simple: { limit: 10000, period: 60 } } },
      }],
    }))
    console.log('Starting the local backend Worker')
    await mf.ready
    console.log('Preparing fresh local storage')
    const db = await mf.getD1Database('DB', 'backend')
    const migrations = resolve(root, 'packages/data-ops/drizzle')
    for (const name of (await readdir(migrations)).filter((name) => name.endsWith('.sql')).sort()) {
      const sql = await readFile(join(migrations, name), 'utf8')
      for (const statement of sql.split('--> statement-breakpoint').filter((text) => text.trim())) {
        await db.prepare(statement).run()
      }
    }
    const now = Date.now()
    await db.prepare('INSERT INTO user (id,name,email,email_verified,created_at,updated_at) VALUES (?,?,?,?,?,?)')
      .bind('webmcp-e2e', 'WebMCP Test', 'webmcp-e2e@example.test', 1, now, now).run()
    await db.prepare('INSERT INTO session (id,token,user_id,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?)')
      .bind('webmcp-e2e-session', token, 'webmcp-e2e', now + 3600000, now, now).run()

    server = createServer(async (incoming, outgoing) => {
      try {
        const url = new URL(incoming.url, origin)
        // Only public model files are read remotely. Application data stays local.
        let response
        if (url.pathname.startsWith('/models/')) {
          response = await fetch(new URL(url.pathname + url.search, 'https://sardrobe.com'))
        } else if (url.pathname.startsWith('/api/')) {
          response = await mf.dispatchFetch(url, {
            method: incoming.method, headers: incoming.headers,
            ...(!['GET', 'HEAD'].includes(incoming.method) ? { body: Readable.toWeb(incoming), duplex: 'half' } : {}),
          })
        } else {
          const directory = resolve(root, 'apps/frontend/dist')
          let pathname = decodeURIComponent(url.pathname)
          if (!extname(pathname)) pathname = pathname.replace(/\/?$/, '/index.html')
          const file = resolve(directory, '.' + pathname)
          if (relative(directory, file).startsWith('..')) throw new Error('Invalid asset path')
          const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.xml': 'application/xml', '.woff2': 'font/woff2' }
          try {
            response = new Response(await readFile(file), { headers: { 'content-type': mime[extname(file)] ?? 'application/octet-stream' } })
          } catch {
            response = new Response('Not found', { status: 404 })
          }
        }
        const headers = Object.fromEntries(response.headers)
        delete headers['content-encoding']
        delete headers['content-length']
        headers['cross-origin-opener-policy'] = 'same-origin'
        headers['cross-origin-embedder-policy'] = 'credentialless'
        outgoing.writeHead(response.status, headers)
        if (response.body) Readable.fromWeb(response.body).pipe(outgoing)
        else outgoing.end()
      } catch (error) {
        outgoing.writeHead(500)
        outgoing.end(String(error))
      }
    })
    await new Promise((done, reject) => { server.once('error', reject); server.listen(4344, '127.0.0.1', done) })
    console.log(`Local application ready at ${origin}`)
    const signature = createHmac('sha256', secret).update(token).digest('base64')
    const cookie = { name: 'better-auth.session_token', value: encodeURIComponent(`${token}.${signature}`), url: origin, httpOnly: true, sameSite: 'Lax' }
    return { origin, cookie, close, db, media: await mf.getR2Bucket('WARDROBE_MEDIA', 'backend') }
  } catch (error) {
    await close()
    throw error
  }
}
