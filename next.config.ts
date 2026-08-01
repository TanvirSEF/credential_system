import type { NextConfig } from "next";

function configuredOrigin(...names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name];
    if (!value) continue;
    try {
      return new URL(value).origin;
    } catch {
      throw new Error(`${name} must be an absolute URL.`);
    }
  }
  return null;
}

const storageEndpointOrigin = configuredOrigin(
  "STORAGE_S3_ENDPOINT",
  "R2_S3_ENDPOINT"
);
const storagePublicOrigin = configuredOrigin(
  "STORAGE_PUBLIC_URL",
  "R2_PUBLIC_URL"
);
const storageConnectSources = [storageEndpointOrigin, storagePublicOrigin]
  .filter((value): value is string => Boolean(value))
  .join(" ");
const storageImageSources = storagePublicOrigin || "";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' blob: data: https://*.r2.dev ${storageImageSources}`.trim(),
      "font-src 'self' data:",
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.r2.cloudflarestorage.com ${storageConnectSources}`.trim(),
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
