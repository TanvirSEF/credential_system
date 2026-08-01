"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { unlockVaultWithMasterPassword, unlockVaultWithRecoveryKey } from "@/lib/crypto";
import { getUserVaultStatus } from "@/lib/actions/vault";
import { useVaultSessionStore } from "@/stores/vault-session-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KeyEnvelope } from "@/lib/crypto/types";

export default function UnlockVaultPage() {
  const router = useRouter();
  const { setUnlockedSession, isUnlocked } = useVaultSessionStore();

  const [checking, setChecking] = useState(true);
  const [vaultId, setVaultId] = useState<string | null>(null);
  const [masterEnvelope, setMasterEnvelope] = useState<KeyEnvelope | null>(null);
  const [recoveryEnvelope, setRecoveryEnvelope] = useState<KeyEnvelope | null>(null);

  const [masterPassword, setMasterPassword] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);

  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initStatus() {
      const status = await getUserVaultStatus();
      if (!status.authenticated) {
        router.push("/login");
      } else if (!status.hasVault) {
        router.push("/setup");
      } else if (isUnlocked) {
        router.push("/dashboard");
      } else {
        setVaultId(status.vaultId || null);
        setMasterEnvelope(status.masterEnvelope || null);
        setRecoveryEnvelope(status.recoveryEnvelope || null);
        setChecking(false);
      }
    }
    initStatus();
  }, [router, isUnlocked]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnlocking(true);

    try {
      if (!vaultId) throw new Error("Vault not found.");

      let unlockedVaultKey: CryptoKey;

      if (useRecovery) {
        if (!recoveryEnvelope) throw new Error("Recovery envelope missing.");
        unlockedVaultKey = await unlockVaultWithRecoveryKey(recoveryKey, recoveryEnvelope);
      } else {
        if (!masterEnvelope) throw new Error("Master envelope missing.");
        unlockedVaultKey = await unlockVaultWithMasterPassword(masterPassword, masterEnvelope);
      }

      setUnlockedSession(unlockedVaultKey, vaultId);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to unlock vault.");
      setUnlocking(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Checking vault status...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-xl">
            🔒
          </div>
          <CardTitle className="text-2xl font-bold">Vault Locked</CardTitle>
          <CardDescription>
            Enter your {useRecovery ? "Recovery Key" : "Master Password"} to unlock your encrypted data
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleUnlock}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {!useRecovery ? (
              <div className="space-y-2">
                <Label htmlFor="masterPassword">Master Password</Label>
                <Input
                  id="masterPassword"
                  type="password"
                  required
                  autoFocus
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="••••••••••••"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="recoveryKey">Recovery Key</Label>
                <Input
                  id="recoveryKey"
                  type="text"
                  required
                  autoFocus
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  placeholder="SPV-XXXXX-XXXXX-..."
                  className="font-mono"
                />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button type="submit" disabled={unlocking} className="w-full">
              {unlocking ? "Unlocking Vault..." : "Unlock Vault"}
            </Button>
            <div className="text-center text-xs text-muted-foreground">
              {!useRecovery ? (
                <button
                  type="button"
                  onClick={() => {
                    setUseRecovery(true);
                    setError(null);
                  }}
                  className="text-primary hover:underline"
                >
                  Forgot Master Password? Unlock with Recovery Key
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setUseRecovery(false);
                    setError(null);
                  }}
                  className="text-primary hover:underline"
                >
                  Back to Master Password Unlock
                </button>
              )}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
