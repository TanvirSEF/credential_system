"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { getUserVaultStatus } from "@/lib/actions/vault";
import {
  unlockVaultWithMasterPassword,
  unlockVaultWithRecoveryKey,
} from "@/lib/crypto";
import type { KeyEnvelope } from "@/lib/crypto/types";
import { useVaultSessionStore } from "@/stores/vault-session-store";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UnlockVaultPage() {
  const router = useRouter();
  const { setUnlockedSession, isUnlocked } = useVaultSessionStore();
  const [checking, setChecking] = useState(true);
  const [statusUnavailable, setStatusUnavailable] = useState(false);
  const [vaultId, setVaultId] = useState<string | null>(null);
  const [masterEnvelope, setMasterEnvelope] = useState<KeyEnvelope | null>(null);
  const [recoveryEnvelope, setRecoveryEnvelope] = useState<KeyEnvelope | null>(null);
  const [masterPassword, setMasterPassword] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initStatus() {
      const status = await getUserVaultStatus();
      if (status.error) {
        setError(status.error);
        setStatusUnavailable(true);
        setChecking(false);
      } else if (!status.authenticated) {
        router.replace("/login");
      } else if (!status.hasVault) {
        router.replace("/setup");
      } else if (isUnlocked) {
        router.replace("/dashboard");
      } else {
        setVaultId(status.vaultId || null);
        setMasterEnvelope(status.masterEnvelope || null);
        setRecoveryEnvelope(status.recoveryEnvelope || null);
        setChecking(false);
      }
    }
    initStatus();
  }, [router, isUnlocked]);

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUnlocking(true);

    try {
      if (!vaultId) throw new Error("Vault not found.");
      const inputValue = useRecovery ? recoveryKey.trim() : masterPassword.trim();
      const isRecoveryInput =
        useRecovery || inputValue.toUpperCase().startsWith("SPV-");
      let unlockedVaultKey: CryptoKey;

      if (isRecoveryInput) {
        if (!recoveryEnvelope) throw new Error("Recovery envelope missing.");
        unlockedVaultKey = await unlockVaultWithRecoveryKey(
          inputValue,
          recoveryEnvelope
        );
      } else {
        if (!masterEnvelope) throw new Error("Master envelope missing.");
        unlockedVaultKey = await unlockVaultWithMasterPassword(
          masterPassword,
          masterEnvelope
        );
      }

      setUnlockedSession(unlockedVaultKey, vaultId);
      router.replace("/dashboard");
    } catch {
      setError(
        useRecovery || masterPassword.toUpperCase().startsWith("SPV-")
          ? "That recovery key is invalid. Check every group and try again."
          : "That master password did not unlock this vault. Check it and try again."
      );
      setUnlocking(false);
    }
  }

  function switchUnlockMethod() {
    setUseRecovery((current) => !current);
    setShowSecret(false);
    setCapsLockOn(false);
    setError(null);
  }

  if (checking) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
        <BackgroundDecoration />
        <div className="relative flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-6 animate-spin text-primary" />
          Securing your vault session...
        </div>
      </main>
    );
  }

  if (statusUnavailable) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
        <BackgroundDecoration />
        <Card className="relative w-full max-w-md border-destructive/20 shadow-xl">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" />
            </div>
            <CardTitle>Vault service unavailable</CardTitle>
            <CardDescription className="max-w-sm leading-relaxed">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const currentValue = useRecovery ? recoveryKey : masterPassword;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 font-sans sm:px-6">
      <BackgroundDecoration />

      <div className="relative z-10 w-full max-w-[480px]">
        <div className="mb-6 flex justify-center">
          <BrandLogo preload className="w-[235px]" />
        </div>

        <Card className="overflow-hidden border-border/70 bg-card/90 py-0 shadow-2xl shadow-primary/[0.08] backdrop-blur-xl">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-primary to-violet-500" />
          <CardHeader className="items-center space-y-3 px-5 pt-7 pb-4 text-center sm:px-8">
            <div className="relative flex size-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-inner">
              {useRecovery ? (
                <KeyRound className="size-6" />
              ) : (
                <LockKeyhole className="size-6" />
              )}
              <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border-2 border-card bg-emerald-500 text-white">
                <ShieldCheck className="size-3" />
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="mx-auto w-fit rounded-full border border-primary/15 bg-primary/[0.06] px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] text-primary uppercase">
                Zero-knowledge vault
              </div>
              <CardTitle className="font-heading text-2xl font-extrabold tracking-tight sm:text-[1.7rem]">
                {useRecovery ? "Recover vault access" : "Welcome back"}
              </CardTitle>
              <CardDescription className="mx-auto max-w-sm text-sm leading-relaxed">
                {useRecovery
                  ? "Enter the recovery key you saved when this vault was created."
                  : "Enter the vault master password you created during setup."}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-5 pt-1 pb-6 sm:px-8 sm:pb-8">
            <form onSubmit={handleUnlock} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="vault-secret">
                    {useRecovery ? "Recovery key" : "Vault master password"}
                  </Label>
                  {!useRecovery && (
                    <span className="text-[10px] text-muted-foreground">Not your sign-in password</span>
                  )}
                </div>

                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 flex -translate-y-1/2 text-muted-foreground">
                    {useRecovery ? <KeyRound className="size-4" /> : <LockKeyhole className="size-4" />}
                  </span>
                  <Input
                    id="vault-secret"
                    type={showSecret ? "text" : "password"}
                    required
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder={useRecovery ? "SPV-XXXX-XXXX-XXXX-..." : "Enter your vault master password"}
                    value={currentValue}
                    disabled={unlocking}
                    onChange={(event) =>
                      useRecovery
                        ? setRecoveryKey(event.target.value.toUpperCase())
                        : setMasterPassword(event.target.value)
                    }
                    onKeyUp={(event) => setCapsLockOn(event.getModifierState("CapsLock"))}
                    onKeyDown={(event) => setCapsLockOn(event.getModifierState("CapsLock"))}
                    className={`h-12 pr-11 pl-10 text-sm ${useRecovery ? "font-mono tracking-wider" : ""}`}
                  />
                  <button
                    type="button"
                    aria-label={showSecret ? "Hide secret" : "Show secret"}
                    onClick={() => setShowSecret((current) => !current)}
                    className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {capsLockOn && !useRecovery && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-500">
                    <TriangleAlert className="size-3.5" /> Caps Lock is on
                  </p>
                )}
              </div>

              {useRecovery && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs leading-relaxed text-muted-foreground">
                  Recovery keys start with <span className="font-mono font-semibold text-foreground">SPV-</span>.
                  Spaces and letter case are normalized automatically.
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={unlocking || !currentValue.trim()}
                className="w-full shadow-lg shadow-primary/20"
              >
                {unlocking ? (
                  <LoaderCircle className="animate-spin" />
                ) : useRecovery ? (
                  <KeyRound />
                ) : (
                  <LockKeyhole />
                )}
                {unlocking
                  ? "Unlocking encrypted vault..."
                  : useRecovery
                    ? "Recover and unlock"
                    : "Unlock vault"}
              </Button>

              <div className="flex items-center gap-3 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                <span className="h-px flex-1 bg-border" />
                Alternative access
                <span className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                disabled={unlocking}
                onClick={switchUnlockMethod}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-muted/20 p-3 text-left transition-colors hover:border-primary/25 hover:bg-primary/[0.04] disabled:pointer-events-none disabled:opacity-50"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors group-hover:text-primary">
                  <ArrowLeftRight className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-foreground">
                    {useRecovery ? "Use master password" : "Use recovery key"}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {useRecovery
                      ? "Return to the normal unlock method"
                      : "Use the backup key saved during setup"}
                  </span>
                </span>
              </button>

              <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                Your secret never leaves this device
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function BackgroundDecoration() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,color-mix(in_oklch,var(--foreground)_7%,transparent)_1px,transparent_0)] bg-[size:28px_28px] opacity-30" />
      <div className="absolute -top-40 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-primary/[0.09] blur-[120px]" />
      <div className="absolute -right-40 -bottom-48 size-[28rem] rounded-full bg-violet-500/[0.07] blur-[110px]" />
    </div>
  );
}
