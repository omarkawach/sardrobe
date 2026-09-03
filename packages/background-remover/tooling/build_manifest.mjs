#!/usr/bin/env node
/**
 * Build a versioned model manifest for an exported ONNX model.
 *
 * The manifest is the single document the runtime fetches; it pins the model
 * filename, byte size, SHA-256, input/output tensor names, and inference
 * resolution. The shape here must satisfy `ModelManifestSchema` in
 * `src/manifest.ts` — keep the two in sync.
 *
 * Usage:
 *   node build_manifest.mjs \
 *     --model ./build/isnet-general-use-1024.onnx \
 *     --model-id isnet-general-use-1024-v1 \
 *     --resolution 1024 \
 *     --out ./build/manifest.json
 *
 * The emitted `modelFile` is the model's basename, so the manifest and model
 * are served from the same immutable directory.
 */
import { createHash } from 'node:crypto'
import { readFile, writeFile, stat } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token.startsWith('--')) {
      const key = token.slice(2)
      const value = argv[i + 1]
      args[key] = value
      i += 1
    }
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const required = ['model', 'model-id', 'resolution', 'out']
  for (const key of required) {
    if (!args[key]) {
      console.error(`Missing required --${key}`)
      console.error('Usage: node build_manifest.mjs --model <path> --model-id <id> --resolution <px> --out <path>')
      process.exit(1)
    }
  }

  const modelPath = resolve(args.model)
  const bytes = await readFile(modelPath)
  const fileStat = await stat(modelPath)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const resolution = Number.parseInt(args.resolution, 10)

  if (!Number.isInteger(resolution) || resolution <= 0) {
    console.error(`--resolution must be a positive integer, got ${args.resolution}`)
    process.exit(1)
  }

  const manifest = {
    schemaVersion: 1,
    modelId: args['model-id'],
    modelFile: basename(modelPath),
    byteSize: fileStat.size,
    sha256,
    inputName: args['input-name'] ?? 'input',
    outputName: args['output-name'] ?? 'output',
    resolution,
  }

  await writeFile(resolve(args.out), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`Wrote manifest to ${args.out}:`)
  console.log(JSON.stringify(manifest, null, 2))
  console.log(`\nModel: ${(fileStat.size / (1024 * 1024)).toFixed(2)} MiB, sha256 ${sha256}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
