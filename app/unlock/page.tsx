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
import { Lock, KeyRound } from "lucide-react";
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

      const inputVal = useRecovery ? recoveryKey.trim() : masterPassword.trim();
      const isRecoveryInput = useRecovery || inputVal.toUpperCase().startsWith("SPV-");

      if (isRecoveryInput) {
        if (!recoveryEnvelope) throw new Error("Recovery envelope missing.");
        unlockedVaultKey = await unlockVaultWithRecoveryKey(inputVal, recoveryEnvelope);
      } else {
        if (!masterEnvelope) throw new Error("Master envelope missing.");
        unlockedVaultKey = await unlockVaultWithMasterPassword(masterPassword, masterEnvelope);
      }

      setUnlockedSession(unlockedVaultKey, vaultId);
      router.push("/dashboard");
    } catch {
      setError(
        useRecovery || masterPassword.toUpperCase().startsWith("SPV-")
          ? "Invalid Recovery Key format or incorrect recovery key."
          : "Incorrect Master Password. If you forgot your password, click 'Unlock with Recovery Key'."
      );
      setUnlocking(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground font-sans">
        Checking vault status...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 font-sans">
      <Card className="w-full max-w-md shadow-xl border-primary/20 bg-card/80 backdrop-blur-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {useRecovery ? <KeyRound className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
          <CardTitle className="text-2xl font-bold font-heading">
            {useRecovery ? "Restore Access with Recovery Key" : "Vault Locked"}
          </CardTitle>
          <CardDescription>
            {useRecovery
              ? "Enter your 256-bit recovery key (SPV-XXXX-XXXX-...)"
              : "Enter your Account Master Password to unlock your encrypted vault"}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleUnlock}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive font-sans">
                {error}
              </div>
            )}

            {!useRecovery ? (
              <div className="space-y-2">
                <Label htmlFor="master-password">Master Password</Label>
                <Input
                  id="master-password"
                  type="password"
                  required
                  placeholder="Enter your master password..."
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="recovery-key">256-bit Recovery Key</Label>
                <Input
                  id="recovery-key"
                  type="text"
                  required
                  placeholder="SPV-XXXX-XXXX-XXXX-XXXX-..."
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  className="font-mono text-sm tracking-wider"
                />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2">
            <Button type="submit" disabled={unlocking} className="w-full font-bold shadow-md">
              {unlocking ? "Unwrapping Vault Key..." : useRecovery ? "Restore & Unlock Vault" : "Unlock Vault"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setUseRecovery(!useRecovery);
              }}
              className="text-xs text-primary hover:underline font-medium focus:outline-none"
            >
              {useRecovery
                ? "← Switch back to Master Password unlock"
                : "Forgot Master Password? Unlock with Recovery Key"}
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
