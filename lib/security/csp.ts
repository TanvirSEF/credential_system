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

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${imageSources.join(" ")}`,
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${connectSources.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ")
}
