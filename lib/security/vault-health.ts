import type { DecryptedCredential } from "@/lib/types/credential"
import { estimatePasswordEntropy } from "./password-generator"

export type HealthIssueType = "weak" | "reused" | "old" | "exposed"

export interface PasswordHealthEntry {
  key: string
  credentialId: string
  credentialTitle: string
  fieldId: string
  fieldLabel: string
  value: string
  updatedAt: Date
  issues: HealthIssueType[]
  breachCount?: number
}

const COMMON_PASSWORDS = new Set([
  "123456",
  "12345678",
  "123456789",
  "admin",
  "letmein",
  "password",
  "password1",
  "qwerty",
  "qwerty123",
  "welcome",
  "iloveyou",
  "abc123",
])

export function analyzePasswordHealth(
  credentials: DecryptedCredential[],
  now = Date.now()
): PasswordHealthEntry[] {
  const entries = credentials.flatMap((credential) =>
    credential.payload.fields
      .filter((field) => field.type === "password" && field.value)
      .map((field) => ({
        key: `${credential.id}:${field.id}`,
        credentialId: credential.id,
        credentialTitle: credential.payload.title,
        fieldId: field.id,
        fieldLabel: field.label,
        value: field.value,
        updatedAt: new Date(credential.updatedAt),
        issues: [] as HealthIssueType[],
      }))
  )
  const frequency = new Map<string, number>()
  for (const entry of entries) {
    frequency.set(entry.value, (frequency.get(entry.value) || 0) + 1)
  }

  for (const entry of entries) {
    const normalized = entry.value.toLowerCase()
    if (
      entry.value.length < 12 ||
      estimatePasswordEntropy(entry.value) < 50 ||
      COMMON_PASSWORDS.has(normalized)
    ) {
      entry.issues.push("weak")
    }
    if ((frequency.get(entry.value) || 0) > 1) entry.issues.push("reused")
    if (now - entry.updatedAt.getTime() > 180 * 24 * 60 * 60 * 1000) {
      entry.issues.push("old")
    }
  }
  return entries
}

async function sha1Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(value)
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
}

export async function checkPwnedPassword(password: string): Promise<number> {
  const hash = await sha1Hex(password)
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)
  const response = await fetch(
    `https://api.pwnedpasswords.com/range/${prefix}?mode=sha1`,
    { headers: { "Add-Padding": "true" }, cache: "no-store" }
  )
  if (!response.ok) {
    throw new Error(`Breach service returned ${response.status}.`)
  }
  for (const line of (await response.text()).split("\n")) {
    const [candidate, count] = line.trim().split(":")
    if (candidate === suffix) return Number(count) || 0
  }
  return 0
}
