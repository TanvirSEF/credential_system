import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "Secure Personal Vault",
    short_name: "SP Vault",
    description:
      "A zero-knowledge encrypted vault for passwords, API keys, and private documents.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#08132b",
    theme_color: "#2563eb",
    orientation: "portrait-primary",
    lang: "en",
    dir: "ltr",
    categories: ["security", "productivity", "utilities"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Open vault",
        short_name: "Vault",
        description: "Sign in and unlock your encrypted vault",
        url: "/dashboard",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Credentials",
        short_name: "Credentials",
        description: "Open encrypted credentials",
        url: "/dashboard/credentials",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Documents",
        short_name: "Documents",
        description: "Open encrypted documents",
        url: "/dashboard/documents",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  }
}
