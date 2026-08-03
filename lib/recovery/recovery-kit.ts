import { normalizeRecoveryKey } from "@/lib/crypto/recovery-envelope"

export interface RecoveryChallenge {
  positions: number[]
  groups: string[]
}

export function getRecoveryKeyGroups(recoveryKey: string): string[] {
  const normalized = normalizeRecoveryKey(recoveryKey)
  if (!normalized.startsWith("SPV") || normalized.length <= 3) return []
  return normalized.slice(3).match(/.{1,4}/g) || []
}

export function createRecoveryChallenge(
  recoveryKey: string,
  count = 3
): RecoveryChallenge {
  const groups = getRecoveryKeyGroups(recoveryKey)
  if (groups.length < count) throw new Error("Recovery key is malformed.")

  const selected = new Set<number>()
  while (selected.size < count) {
    const random = new Uint32Array(1)
    crypto.getRandomValues(random)
    selected.add(random[0] % groups.length)
  }

  return {
    positions: [...selected].sort((a, b) => a - b),
    groups,
  }
}

export function verifyRecoveryChallenge(
  challenge: RecoveryChallenge,
  answers: Record<number, string>
): boolean {
  return challenge.positions.every(
    (position) =>
      answers[position]?.trim().toUpperCase() === challenge.groups[position]
  )
}

export function createRecoveryKitText(input: {
  recoveryKey: string
  vaultId: string
  generatedAt?: Date
}) {
  const generatedAt = input.generatedAt || new Date()
  return [
    "SECURE PERSONAL VAULT — EMERGENCY RECOVERY KIT",
    "",
    `Recovery key: ${input.recoveryKey}`,
    `Vault ID: ${input.vaultId}`,
    `Generated: ${generatedAt.toISOString()}`,
    "",
    "IMPORTANT",
    "• Store this kit separately from your device and master password.",
    "• Anyone with your account access and this key may recover the vault.",
    "• Only the newest recovery key works after a rotation.",
    "• If both the master password and this key are lost, the encrypted vault cannot be recovered.",
  ].join("\n")
}

export function downloadRecoveryKit(recoveryKey: string, vaultId: string) {
  const blob = new Blob([createRecoveryKitText({ recoveryKey, vaultId })], {
    type: "text/plain;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `spv-recovery-kit-${new Date().toISOString().slice(0, 10)}.txt`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
