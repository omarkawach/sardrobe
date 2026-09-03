import { z } from 'zod'

export type BackgroundRemovalBackend = 'auto' | 'webgpu' | 'wasm'

export type ResolvedBackend = 'webgpu' | 'wasm'

export type BackgroundRemovalStage =
  | 'fetch-manifest'
  | 'fetch-model'
  | 'init-session'
  | 'decode'
  | 'preprocess'
  | 'inference'
  | 'postprocess'
  | 'encode'
  | 'done'

export interface BackgroundRemovalProgress {
  stage: BackgroundRemovalStage
  ratio: number
  backend?: ResolvedBackend
}

export interface RemoveBackgroundOptions {
  /** URL of the versioned model manifest (JSON). */
  manifestUrl: string
  /** Base URL of the same-origin ONNX Runtime WASM/MJS assets directory. */
  wasmBaseUrl: string
  /** Backend selection; defaults to `auto`. */
  backend?: BackgroundRemovalBackend
  /** Output WebP quality in 0..1; defaults to 0.88. */
  quality?: number
  /** When true, emits timing/diagnostic logs to the console. */
  debug?: boolean
  /** Progress callback invoked across the pipeline stages. */
  onProgress?: (event: BackgroundRemovalProgress) => void
}

export const RemoveBackgroundOptionsSchema = z
  .object({
    manifestUrl: z.string().url('manifestUrl must be a valid URL'),
    wasmBaseUrl: z.string().url('wasmBaseUrl must be a valid URL'),
    backend: z.enum(['auto', 'webgpu', 'wasm']).default('auto'),
    quality: z.number().gt(0).max(1).default(0.88),
    debug: z.boolean().default(false),
    // A function reference; validated structurally rather than by zod's
    // function schema, which differs across zod majors. It is passed through
    // untouched by `parseOptions`.
    onProgress: z
      .custom<(event: BackgroundRemovalProgress) => void>(
        (value) => value === undefined || typeof value === 'function',
        'onProgress must be a function',
      )
      .optional(),
  })
  .strict()

export type NormalizedOptions = {
  manifestUrl: string
  wasmBaseUrl: string
  backend: BackgroundRemovalBackend
  quality: number
  debug: boolean
  onProgress?: (event: BackgroundRemovalProgress) => void
}

export class BackgroundRemovalError extends Error {
  readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'BackgroundRemovalError'
    this.cause = cause
  }
}
