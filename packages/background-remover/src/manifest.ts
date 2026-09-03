import { z } from 'zod'

export const ModelManifestSchema = z
  .object({
    /** Schema version of this manifest document, not the model. */
    schemaVersion: z.literal(1),
    /** Human-facing model release identifier, e.g. "isnet-general-use-1024-v1". */
    modelId: z.string().min(1),
    /** Model filename, resolved relative to the manifest URL. */
    modelFile: z.string().min(1),
    /** Exact byte length of the model file; used to verify a complete download. */
    byteSize: z.number().int().positive(),
    /** Lowercase hex SHA-256 of the model file. */
    sha256: z
      .string()
      .regex(/^[0-9a-f]{64}$/, 'sha256 must be 64 lowercase hex characters'),
    /** ONNX graph input tensor name (NCHW float32). */
    inputName: z.string().min(1),
    /** ONNX graph output tensor name (the sigmoid mask). */
    outputName: z.string().min(1),
    /** Square inference resolution in pixels, e.g. 1024. */
    resolution: z.number().int().positive(),
  })
  .strict()

export type ModelManifest = z.infer<typeof ModelManifestSchema>

export function parseManifest(value: unknown): ModelManifest {
  const result = ModelManifestSchema.safeParse(value)

  if (!result.success) {
    throw new ManifestError(
      `Invalid background-removal manifest: ${formatIssues(result.error)}`,
    )
  }

  return result.data
}

export function resolveModelUrl(manifest: ModelManifest, manifestUrl: string): string {
  return new URL(manifest.modelFile, manifestUrl).toString()
}

export class ManifestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ManifestError'
  }
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.')
      return path ? `${path}: ${issue.message}` : issue.message
    })
    .join('; ')
}
