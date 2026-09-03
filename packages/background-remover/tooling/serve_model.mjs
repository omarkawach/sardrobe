import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, join, normalize, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const port = 8790
const buildDirectory = join(dirname(fileURLToPath(import.meta.url)), 'build')

function allowLocalOrigin(request, response) {
  const origin = request.headers.origin
  if (!origin) return

  try {
    const url = new URL(origin)
    if (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) {
      response.setHeader('Access-Control-Allow-Origin', origin)
      response.setHeader('Vary', 'Origin')
    }
  } catch {
    return
  }
}

const server = createServer((request, response) => {
  allowLocalOrigin(request, response)

  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS' })
    response.end()
    return
  }

  if (!['GET', 'HEAD'].includes(request.method ?? '')) {
    response.writeHead(405, { Allow: 'GET, HEAD, OPTIONS' })
    response.end()
    return
  }

  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
  const fileName = normalize(pathname).replace(/^[/\\]+/, '')
  const filePath = join(buildDirectory, fileName)
  const staysInBuildDirectory = !relative(buildDirectory, filePath).startsWith('..')
  const supportedFile = fileName === 'manifest.json' || extname(fileName) === '.onnx'

  if (!staysInBuildDirectory || !supportedFile || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Model file not found. Export the model first; see tooling/README.md.\n')
    return
  }

  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Length': statSync(filePath).size,
    'Content-Type': extname(fileName) === '.onnx' ? 'application/octet-stream' : 'application/json; charset=utf-8',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  })

  if (request.method === 'HEAD') {
    response.end()
    return
  }

  createReadStream(filePath).pipe(response)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Background-removal model: http://localhost:${port}/manifest.json`)
})
