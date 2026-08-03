import { create } from "zustand"
import { broadcastMessage } from "@/lib/storage/broadcast-channel"

interface VaultSessionState {
  vaultKey: CryptoKey | null
  vaultId: string | null
  isUnlocked: boolean
  lastActivityTimestamp: number
  autoLockMinutes: number
  lockWhenHidden: boolean
  setUnlockedSession: (vaultKey: CryptoKey, vaultId: string) => void
  updateActivity: () => void
  setAutoLockPreferences: (minutes: number, lockWhenHidden: boolean) => void
  lockVault: () => void
}

export const useVaultSessionStore = create<VaultSessionState>((set, get) => ({
  vaultKey: null,
  vaultId: null,
  isUnlocked: false,
  lastActivityTimestamp: Date.now(),
  autoLockMinutes: 15,
  lockWhenHidden: false,

  setUnlockedSession: (vaultKey, vaultId) =>
    set({
      vaultKey,
      vaultId,
      isUnlocked: true,
      lastActivityTimestamp: Date.now(),
    }),

  updateActivity: () => set({ lastActivityTimestamp: Date.now() }),

  setAutoLockPreferences: (autoLockMinutes, lockWhenHidden) =>
    set({ autoLockMinutes, lockWhenHidden }),

  lockVault: () => {
    if (!get().isUnlocked) return
    set({
      vaultKey: null,
      vaultId: null,
      isUnlocked: false,
    })
    broadcastMessage({ type: "VAULT_LOCKED" })
  },
}))
