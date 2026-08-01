"use client";

import { VaultGuard } from "@/components/vault-guard";
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
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/credentials")}>
            🔑 Credentials
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/types")}>
            📁 Categories
          </Button>
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
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/dashboard/credentials")}>
            <CardHeader className="pb-2">
              <CardDescription>Encrypted Credentials</CardDescription>
              <CardTitle className="text-3xl font-extrabold flex items-center justify-between">
                <span>View All</span>
                <span className="text-xl">🔑</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <Button size="sm" className="w-full">
                Open Credentials Vault →
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/dashboard/types")}>
            <CardHeader className="pb-2">
              <CardDescription>Categories & Templates</CardDescription>
              <CardTitle className="text-3xl font-extrabold flex items-center justify-between">
                <span>Categories</span>
                <span className="text-xl">📁</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <Button size="sm" variant="secondary" className="w-full">
                Manage Categories →
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/dashboard/trash")}>
            <CardHeader className="pb-2">
              <CardDescription>Trash & Recovery</CardDescription>
              <CardTitle className="text-3xl font-extrabold flex items-center justify-between">
                <span>Trash Bin</span>
                <span className="text-xl">🗑️</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <Button size="sm" variant="outline" className="w-full">
                View Trash Bin →
              </Button>
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
