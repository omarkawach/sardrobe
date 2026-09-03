/// <reference lib="webworker" />

import { TransformersJSWorkerHandler } from '@browser-ai/transformers-js'
import { env, Idefics3Processor } from '@huggingface/transformers'

const localAiRuntimeBaseUrl = new URL(
  `/vendor/transformers/${__TRANSFORMERS_VERSION__}/`,
  self.location.origin,
).toString()

if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = {
    mjs: `${localAiRuntimeBaseUrl}ort-wasm-simd-threaded.asyncify.mjs`,
    wasm: `${localAiRuntimeBaseUrl}ort-wasm-simd-threaded.asyncify.wasm`,
  }
}

// Transformers.js 4.2 dereferences image metadata in Idefics3Processor even
// for a text-only request. SmolVLM supports that request; bypassing the image
// processor restores the intended tokenizer-only path until upstream fixes it.
const idefics3Prototype = Idefics3Processor.prototype as unknown as {
  _call: (text: string | string[], images?: unknown, options?: Record<string, unknown>) => Promise<unknown>
  tokenizer: (text: string[], options?: Record<string, unknown>) => unknown
}
const originalIdefics3Call = idefics3Prototype._call
idefics3Prototype._call = async function (text, images, options = {}) {
  if (!images) return this.tokenizer(Array.isArray(text) ? text : [text], options)
  return originalIdefics3Call.call(this, text, images, options)
}

const handler = new TransformersJSWorkerHandler()

self.onmessage = (event: MessageEvent) => {
  handler.onmessage(event)
}
