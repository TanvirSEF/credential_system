import { create } from "zustand";

interface VaultSessionState {
  vaultKey: CryptoKey | null;
  vaultId: string | null;
  isUnlocked: boolean;
  autoLockMinutes: number;
  lastActivityTimestamp: number;
  setUnlockedSession: (vaultKey: CryptoKey, vaultId: string) => void;
  lockVault: () => void;
  updateActivity: () => void;
  setAutoLockMinutes: (minutes: number) => void;
}

export const useVaultSessionStore = create<VaultSessionState>((set) => ({
  vaultKey: null,
  vaultId: null,
  isUnlocked: false,
  autoLockMinutes: 15,
  lastActivityTimestamp: Date.now(),

  setUnlockedSession: (vaultKey: CryptoKey, vaultId: string) =>
    set({
      vaultKey,
      vaultId,
      isUnlocked: true,
      lastActivityTimestamp: Date.now(),
    }),

  lockVault: () =>
    set({
      vaultKey: null,
      vaultId: null,
      isUnlocked: false,
    }),

  updateActivity: () => set({ lastActivityTimestamp: Date.now() }),

  setAutoLockMinutes: (minutes: number) => set({ autoLockMinutes: minutes }),
}));
