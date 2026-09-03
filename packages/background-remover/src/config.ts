import {
  BackgroundRemovalError,
  RemoveBackgroundOptionsSchema,
  type NormalizedOptions,
  type RemoveBackgroundOptions,
} from './types'

export function parseOptions(options: RemoveBackgroundOptions): NormalizedOptions {
  const result = RemoveBackgroundOptionsSchema.safeParse(options)

  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => {
        const path = issue.path.join('.')
        return path ? `${path}: ${issue.message}` : issue.message
      })
      .join('; ')
    throw new BackgroundRemovalError(`Invalid background removal options: ${detail}`)
  }

  return result.data as NormalizedOptions
}
