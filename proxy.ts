import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"
import { createContentSecurityPolicy } from "@/lib/security/csp"

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID())
  const contentSecurityPolicy = createContentSecurityPolicy(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy)

  const response = await updateSession(request, requestHeaders)
  response.headers.set("Content-Security-Policy", contentSecurityPolicy)
  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|images/).*)",
  ],
}
