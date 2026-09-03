import type { ModelManifest } from './manifest'
import { BackgroundRemovalError } from './types'
import { ort, type SessionHandle } from './session'

export async function runInference(
  handle: SessionHandle,
  input: Float32Array,
  manifest: ModelManifest,
): Promise<Float32Array> {
  const { resolution, inputName, outputName } = manifest
  const tensor = new ort.Tensor('float32', input, [1, 3, resolution, resolution])

  let outputs: ort.InferenceSession.OnnxValueMapType
  try {
    outputs = await handle.session.run({ [inputName]: tensor })
  } catch (cause) {
    throw new BackgroundRemovalError(`Inference failed on ${handle.backend}`, cause)
  }

  const output = outputs[outputName]
  if (!output) {
    const available = Object.keys(outputs).join(', ') || '(none)'
    throw new BackgroundRemovalError(
      `Model output "${outputName}" not found; available outputs: ${available}`,
    )
  }

  const data = output.data
  if (!(data instanceof Float32Array)) {
    throw new BackgroundRemovalError(
      `Model output "${outputName}" is ${output.type}, expected float32`,
    )
  }

  const expected = resolution * resolution
  if (data.length < expected) {
    throw new BackgroundRemovalError(
      `Model output too small: expected at least ${expected} values, got ${data.length}`,
    )
  }

  // Some exports emit a leading batch/channel dim; the mask is the first
  // resolution*resolution block either way.
  return data.subarray(0, expected) as Float32Array
}
