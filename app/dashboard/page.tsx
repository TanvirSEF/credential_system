"use client";

import { VaultGuard } from "@/components/vault/vault-guard";
import { useVaultSessionStore } from "@/stores/vault-session-store";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

function DashboardContent() {
  const router = useRouter();
  const lockVault = useVaultSessionStore((s) => s.lockVault);

  function handleLock() {
    lockVault();
    router.push("/unlock");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
            🛡️
          </div>
          <div>
            <h1 className="text-lg font-bold">Secure Personal Vault</h1>
            <p className="text-xs text-muted-foreground">Zero-Knowledge Encrypted Session Active</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleLock}>
            🔒 Lock Vault
          </Button>
          <form action={signOutAction}>
            <Button variant="ghost" size="sm" type="submit">
              Sign Out
            </Button>
          </form>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-2xl font-bold">Vault Initialized</CardTitle>
              <CardDescription className="mt-1">
                Your 256-bit AES-GCM Vault Key is loaded in secure memory.
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-green-500/15 text-green-500 border-green-500/30 px-3 py-1 font-semibold">
              Encrypted & Ready
            </Badge>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Credentials</CardDescription>
              <CardTitle className="text-3xl font-extrabold">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Phase 4 will add dynamic types & entries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Documents</CardDescription>
              <CardTitle className="text-3xl font-extrabold">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Encrypted file storage</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Auto-Lock Timer</CardDescription>
              <CardTitle className="text-3xl font-extrabold">15 min</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Inactivity protection active</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <VaultGuard>
      <DashboardContent />
    </VaultGuard>
  );
}
