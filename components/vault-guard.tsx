"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserVaultStatus } from "@/lib/actions/vault";
import { useVaultSessionStore } from "@/stores/vault-session-store";
import { subscribeBroadcast } from "@/lib/storage/broadcast-channel";

export function VaultGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isUnlocked = useVaultSessionStore((s) => s.isUnlocked);
  const autoLockMinutes = useVaultSessionStore((s) => s.autoLockMinutes);
  const lockVault = useVaultSessionStore((s) => s.lockVault);
  const lastActivityRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyGuard() {
      const status = await getUserVaultStatus();
      if (status.error) {
        setStatusError(status.error);
        setLoading(false);
      } else if (!status.authenticated) {
        router.push("/login");
      } else if (!status.hasVault) {
        router.push("/setup");
      } else if (!isUnlocked) {
        router.push("/unlock");
      } else {
        setLoading(false);
      }
    }
    verifyGuard();
  }, [router, isUnlocked]);

  useEffect(() => {
    const unsubscribe = subscribeBroadcast((msg) => {
      if (msg.type === "VAULT_LOCKED") {
        lockVault();
        router.push("/unlock");
      }
    });
    return unsubscribe;
  }, [lockVault, router]);

  useEffect(() => {
    if (!isUnlocked) return;

    lastActivityRef.current = Date.now();

    const interval = setInterval(() => {
      const elapsedMinutes = (Date.now() - lastActivityRef.current) / (1000 * 60);
      if (elapsedMinutes >= autoLockMinutes) {
        lockVault();
        router.push("/unlock");
      }
    }, 10000);

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
    };
  }, [isUnlocked, autoLockMinutes, lockVault, router]);

  if (statusError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-xl border border-destructive/25 bg-card p-6 text-center">
          <h1 className="text-lg font-bold">Vault service unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{statusError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (loading || !isUnlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Securing vault session...
      </div>
    );
  }

  return <>{children}</>;
}
