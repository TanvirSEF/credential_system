import { create } from "zustand";
import { broadcastMessage } from "@/lib/storage/broadcast-channel";

interface VaultSessionState {
  vaultKey: CryptoKey | null;
  vaultId: string | null;
  isUnlocked: boolean;
  lastActivityTimestamp: number;
  autoLockMinutes: number;
  setUnlockedSession: (vaultKey: CryptoKey, vaultId: string) => void;
  updateActivity: () => void;
  lockVault: () => void;
}

export const useVaultSessionStore = create<VaultSessionState>((set, get) => ({
  vaultKey: null,
  vaultId: null,
  isUnlocked: false,
  lastActivityTimestamp: Date.now(),
  autoLockMinutes: 15,

  setUnlockedSession: (vaultKey, vaultId) =>
    set({
      vaultKey,
      vaultId,
      isUnlocked: true,
      lastActivityTimestamp: Date.now(),
    }),

  updateActivity: () => set({ lastActivityTimestamp: Date.now() }),

  lockVault: () => {
    if (!get().isUnlocked) return;
    broadcastMessage({ type: "VAULT_LOCKED" });
    set({
      vaultKey: null,
      vaultId: null,
      isUnlocked: false,
    });
  },
}));
