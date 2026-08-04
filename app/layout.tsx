import { Outfit, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google"
import type { Metadata, Viewport } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { PwaManager } from "@/components/pwa-manager"
import { cn } from "@/lib/utils"
import { headers } from "next/headers"

export const metadata: Metadata = {
  applicationName: "Secure Personal Vault",
  title: {
    default: "Secure Personal Vault",
    template: "%s | Secure Personal Vault",
  },
  description:
    "A zero-knowledge encrypted vault for passwords, API keys, and private documents.",
  manifest: "/manifest.webmanifest?v=2",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SP Vault",
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#08132b" },
  ],
}

const fontHeading = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700", "800"],
})

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
})

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Nonce-based CSP requires request-time rendering so Next.js can attach the
  // per-request nonce to generated scripts and styles.
  await headers()

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased selection:bg-indigo-500 selection:text-white",
        fontHeading.variable,
        fontSans.variable,
        fontMono.variable
      )}
    >
      <body
        suppressHydrationWarning
        className="min-h-screen bg-background font-sans text-foreground"
      >
        <ThemeProvider>
          {children}
          <PwaManager />
        </ThemeProvider>
      </body>
    </html>
  )
}
