function readRuntimeEnv(name: string) {
  // Dynamic lookup is intentional. Next.js inlines direct NEXT_PUBLIC_* access
  // during `next build`, while self-hosted containers receive these values at
  // runtime from Dokploy/Docker.
  return process.env[name]
}

function normalizeEnvValue(value: string | undefined) {
  if (!value) return undefined

  const trimmed = value.trim()
  const hasMatchingQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))

  return (hasMatchingQuotes ? trimmed.slice(1, -1) : trimmed).trim()
}

export function getSupabaseServerEnv() {
  const url = normalizeEnvValue(
    readRuntimeEnv("SUPABASE_URL") ?? readRuntimeEnv("NEXT_PUBLIC_SUPABASE_URL")
  )?.replace(/\/+$/, "")
  const publishableKey = normalizeEnvValue(
    readRuntimeEnv("SUPABASE_PUBLISHABLE_KEY") ??
      readRuntimeEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
  )

  if (!url || !publishableKey) {
    throw new Error("Supabase Auth runtime environment variables are missing.")
  }

  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      throw new Error("Unsupported protocol")
    }
  } catch {
    throw new Error("Supabase Auth URL is invalid.")
  }

  return { url, publishableKey }
}
