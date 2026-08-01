"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserVaultStatus } from "@/lib/actions/vault";
import { useVaultSessionStore } from "@/stores/vault-session-store";
import { subscribeBroadcast } from "@/lib/storage/broadcast-channel";

export function VaultGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isUnlocked, updateActivity, autoLockMinutes, lastActivityTimestamp, lockVault } =
    useVaultSessionStore();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyGuard() {
      const status = await getUserVaultStatus();
      if (!status.authenticated) {
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

  // Multi-tab broadcast channel listener
  useEffect(() => {
    const unsubscribe = subscribeBroadcast((msg) => {
      if (msg.type === "VAULT_LOCKED") {
        lockVault();
        router.push("/unlock");
      }
    });
    return unsubscribe;
  }, [lockVault, router]);

  // Inactivity auto-lock listener
  useEffect(() => {
    if (!isUnlocked) return;

    const interval = setInterval(() => {
      const elapsedMinutes = (Date.now() - lastActivityTimestamp) / (1000 * 60);
      if (elapsedMinutes >= autoLockMinutes) {
        lockVault();
        router.push("/unlock");
      }
    }, 10000);

    const handleUserActivity = () => updateActivity();
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
    };
  }, [isUnlocked, lastActivityTimestamp, autoLockMinutes, lockVault, updateActivity, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Securing vault session...
      </div>
    );
  }

  return <>{children}</>;
}
