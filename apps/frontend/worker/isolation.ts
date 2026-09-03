const onnxRuntimeAssetPrefix = '/vendor/onnxruntime/'

export function isProtectedAppPath(pathname: string) {
  return pathname === '/app' || pathname.startsWith('/app/')
}

export function requiresCrossOriginIsolation(pathname: string) {
  return (
    isProtectedAppPath(pathname) ||
    pathname.startsWith('/_astro/') ||
    pathname.startsWith(onnxRuntimeAssetPrefix)
  )
}
