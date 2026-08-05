const DEFAULT_STORAGE_IMAGE_SOURCE = "https://*.r2.dev"
const DEFAULT_STORAGE_CONNECT_SOURCE = "https://*.r2.cloudflarestorage.com"

function configuredOrigin(...names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name]
    if (!value) continue
    try {
      return new URL(value).origin
    } catch {
      throw new Error(`${name} must be an absolute URL.`)
    }
  }
  return null
}

export function createContentSecurityPolicy(
  nonce: string,
  isDevelopment = process.env.NODE_ENV === "development"
): string {
  const storageEndpointOrigin = configuredOrigin(
    "STORAGE_S3_ENDPOINT",
    "R2_S3_ENDPOINT"
  )
  const storagePublicOrigin = configuredOrigin(
    "STORAGE_PUBLIC_URL",
    "R2_PUBLIC_URL"
  )
  const connectSources = [
    DEFAULT_STORAGE_CONNECT_SOURCE,
    storageEndpointOrigin,
    storagePublicOrigin,
  ].filter((value): value is string => Boolean(value))
  const imageSources = [
    DEFAULT_STORAGE_IMAGE_SOURCE,
    storagePublicOrigin,
  ].filter((value): value is string => Boolean(value))

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${imageSources.join(" ")}`,
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.pwnedpasswords.com ${connectSources.join(" ")}`,
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]

  // upgrade-insecure-requests is only meaningful in production, where the app
  // is served behind HTTPS. In development the app runs over plain HTTP, and
  // this directive forces browsers to rewrite subresource requests (CSS, JS,
  // fonts) to HTTPS — which fails against a local/LAN dev server and leaves
  // pages unstyled. Browsers exempt localhost from this upgrade, but not LAN
  // IPs such as 192.168.x.x, so it must stay disabled during development.
  if (!isDevelopment) {
    directives.push("upgrade-insecure-requests")
  }

  return directives.join("; ")
}
