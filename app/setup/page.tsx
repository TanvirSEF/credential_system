"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createMasterEnvelope,
  createRecoveryEnvelope,
  encryptPayload,
  generateRecoveryKey,
} from "@/lib/crypto";
import { createVaultAndEnvelopesAction, getUserVaultStatus } from "@/lib/actions/vault";
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
import { Badge } from "@/components/ui/badge";

export default function SetupWizardPage() {
  const router = useRouter();
  const setUnlockedSession = useVaultSessionStore((s) => s.setUnlockedSession);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [checking, setChecking] = useState(true);

  // Master password state
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Recovery key state
  const [recoveryKey, setRecoveryKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [challengeInput, setChallengeInput] = useState("");
  const [challengeError, setChallengeError] = useState<string | null>(null);

  // Creation state
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    async function checkStatus() {
      const status = await getUserVaultStatus();
      if (!status.authenticated) {
        router.push("/login");
      } else if (status.hasVault) {
        router.push("/unlock");
      } else {
        setChecking(false);
      }
    }
    checkStatus();
  }, [router]);

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    if (masterPassword.length < 12) {
      setPasswordError("Master password must be at least 12 characters long.");
      return;
    }

    if (masterPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    const newRecoveryKey = generateRecoveryKey();
    setRecoveryKey(newRecoveryKey);
    setStep(3);
  }

  function handleCopyRecoveryKey() {
    navigator.clipboard.writeText(recoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  function handleDownloadRecoveryKey() {
    const blob = new Blob(
      [
        `SECURE PERSONAL VAULT — RECOVERY KEY\n\nRecovery Key: ${recoveryKey}\n\nWARNING: Keep this recovery key safe. If you forget your master password, this key is required to recover your vault.`,
      ],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spv-recovery-key.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFinalSetup(e: React.FormEvent) {
    e.preventDefault();
    setChallengeError(null);

    const prefix = recoveryKey.slice(0, 9);
    if (challengeInput.trim().toUpperCase() !== prefix) {
      setChallengeError(`Verification mismatch. Please type the first 2 groups (e.g. ${prefix}).`);
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const { envelope: masterEnvelope, vaultKey } = await createMasterEnvelope(masterPassword);
      const recoveryEnvelope = await createRecoveryEnvelope(recoveryKey, vaultKey);
      const nameEncrypted = await encryptPayload({ name: "Personal Vault" }, vaultKey);

      const defaultCategories = [
        { name: "Login", icon: "key", description: "Websites and applications" },
        { name: "Secure Note", icon: "file-text", description: "Private notes and text snippets" },
        { name: "API Key", icon: "code", description: "Developer and service API keys" },
        { name: "Wi-Fi", icon: "wifi", description: "Wireless network passwords" },
        { name: "Banking", icon: "credit-card", description: "Bank accounts and card references" },
      ];

      const encryptedTypes = await Promise.all(
        defaultCategories.map(async (cat, idx) => {
          const enc = await encryptPayload(cat, vaultKey);
          return {
            payloadCiphertext: enc.ciphertext,
            iv: enc.iv,
            sortOrder: idx,
          };
        })
      );

      const res = await createVaultAndEnvelopesAction({
        nameCiphertext: nameEncrypted.ciphertext,
        nameIv: nameEncrypted.iv,
        masterEnvelope,
        recoveryEnvelope,
        defaultTypes: encryptedTypes,
      });

      if (res.error || !res.vaultId) {
        throw new Error(res.error || "Failed to create vault.");
      }

      setUnlockedSession(vaultKey, res.vaultId);
      router.push("/dashboard");
    } catch (err: any) {
      setCreateError(err.message || "Vault initialization failed.");
      setCreating(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading vault setup...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-xl shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4">
          <div>
            <CardTitle className="text-xl font-bold">Vault Setup Wizard</CardTitle>
            <CardDescription className="mt-1">
              Initialize your zero-knowledge personal vault
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-semibold uppercase">
            Step {step} of 3
          </Badge>
        </CardHeader>

        {/* STEP 1: Overview */}
        {step === 1 && (
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Zero-Knowledge Architecture</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your personal vault is protected with zero-knowledge encryption. Your Master Password is used strictly on your device to decrypt your data and is <strong>never transmitted to our servers</strong>.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-xs leading-relaxed text-muted-foreground">
              <p>✔ All passwords, secrets, and files are encrypted before upload.</p>
              <p>✔ If you forget your master password, only your <strong>Recovery Key</strong> can unlock your vault.</p>
            </div>

            <Button onClick={() => setStep(2)} className="w-full">
              Get Started
            </Button>
          </div>
        )}

        {/* STEP 2: Master Password */}
        {step === 2 && (
          <form onSubmit={handlePasswordSubmit}>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Create Master Password</h3>
                <p className="text-sm text-muted-foreground">
                  This password unlocks your encrypted vault on this device.
                </p>
              </div>

              {passwordError && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {passwordError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="masterPassword">Master Password (min 12 characters)</Label>
                <Input
                  id="masterPassword"
                  type="password"
                  required
                  minLength={12}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="••••••••••••"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Master Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                />
              </div>
            </CardContent>

            <CardFooter className="flex gap-3 px-6 pb-6 pt-0">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-1/3">
                Back
              </Button>
              <Button type="submit" className="w-2/3">
                Continue to Recovery Key
              </Button>
            </CardFooter>
          </form>
        )}

        {/* STEP 3: Recovery Key & Finalize */}
        {step === 3 && (
          <form onSubmit={handleFinalSetup}>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Save Your Recovery Key</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Store this key in a safe place. If you forget your master password, you will need this key to restore access to your data.
                </p>
              </div>

              <div className="rounded-lg border bg-muted/60 p-4 text-center font-mono text-base font-bold tracking-widest text-primary break-all">
                {recoveryKey}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={handleCopyRecoveryKey} className="w-1/2 text-xs">
                  {copied ? "Copied to Clipboard!" : "Copy Recovery Key"}
                </Button>
                <Button type="button" variant="secondary" onClick={handleDownloadRecoveryKey} className="w-1/2 text-xs">
                  Download .txt Backup
                </Button>
              </div>

              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="challenge">
                  Backup Verification: Type the first 2 groups of your key ({recoveryKey.slice(0, 9)})
                </Label>
                <Input
                  id="challenge"
                  type="text"
                  required
                  value={challengeInput}
                  onChange={(e) => setChallengeInput(e.target.value)}
                  placeholder="SPV-XXXXX"
                  className="font-mono"
                />
                {challengeError && (
                  <p className="text-xs text-destructive">{challengeError}</p>
                )}
              </div>

              {createError && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {createError}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex gap-3 px-6 pb-6 pt-0">
              <Button type="button" variant="outline" onClick={() => setStep(2)} disabled={creating} className="w-1/3">
                Back
              </Button>
              <Button type="submit" disabled={creating} className="w-2/3">
                {creating ? "Creating Encrypted Vault..." : "Initialize Vault"}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
