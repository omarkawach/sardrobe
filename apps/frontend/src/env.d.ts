/// <reference types="astro/client" />
/// <reference types="webmcp-types" />

declare const __BACKGROUND_ONNX_RUNTIME_VERSION__: string
declare const __TRANSFORMERS_VERSION__: string

interface ImportMetaEnv {
  readonly PUBLIC_BACKGROUND_REMOVAL_MANIFEST_URL?: string
  readonly PUBLIC_SENTRY_DSN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
