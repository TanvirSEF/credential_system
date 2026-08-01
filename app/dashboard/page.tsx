"use client";

import { useEffect, useState } from "react";
import { VaultGuard } from "@/components/vault-guard";
import { useVaultSessionStore } from "@/stores/vault-session-store";
import { signOutAction, getUserProfileAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Shield, Key, FileText, Folder, Lock, LogOut, Trash2 } from "lucide-react";

function DashboardContent() {
  const router = useRouter();
  const lockVault = useVaultSessionStore((s) => s.lockVault);
  const [profile, setProfile] = useState<{ email: string; fullName: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const userProf = await getUserProfileAction();
      if (userProf) setProfile(userProf);
    }
    loadProfile();
  }, []);

  function handleLock() {
    lockVault();
    router.push("/unlock");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Secure Personal Vault</h1>
            <p className="text-xs text-muted-foreground">Zero-Knowledge Encrypted Session Active</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/credentials")}>
            <Key className="h-4 w-4 mr-1.5" /> Credentials
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/documents")}>
            <FileText className="h-4 w-4 mr-1.5" /> Documents
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/types")}>
            <Folder className="h-4 w-4 mr-1.5" /> Categories
          </Button>
          <Button variant="outline" size="sm" onClick={handleLock}>
            <Lock className="h-4 w-4 mr-1.5" /> Lock Vault
          </Button>
          <form action={signOutAction}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="h-4 w-4 mr-1.5" /> Sign Out
            </Button>
          </form>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-2xl font-bold">
                Welcome back{profile?.fullName ? `, ${profile.fullName}` : profile?.email ? `, ${profile.email}` : ""}
              </CardTitle>
              <CardDescription className="mt-1">
                Your 256-bit AES-GCM Vault Key is loaded in secure memory.
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-green-500/15 text-green-500 border-green-500/30 px-3 py-1 font-semibold">
              Encrypted & Ready
            </Badge>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/dashboard/credentials")}>
            <CardHeader className="pb-2">
              <CardDescription>Encrypted Credentials</CardDescription>
              <CardTitle className="text-2xl font-extrabold flex items-center justify-between">
                <span>Credentials</span>
                <Key className="h-6 w-6 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <Button size="sm" className="w-full">
                Open Vault →
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/dashboard/documents")}>
            <CardHeader className="pb-2">
              <CardDescription>Document Vault</CardDescription>
              <CardTitle className="text-2xl font-extrabold flex items-center justify-between">
                <span>Documents</span>
                <FileText className="h-6 w-6 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <Button size="sm" variant="secondary" className="w-full">
                Open Documents →
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/dashboard/types")}>
            <CardHeader className="pb-2">
              <CardDescription>Categories & Templates</CardDescription>
              <CardTitle className="text-2xl font-extrabold flex items-center justify-between">
                <span>Categories</span>
                <Folder className="h-6 w-6 text-primary" />
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
              <CardTitle className="text-2xl font-extrabold flex items-center justify-between">
                <span>Trash Bin</span>
                <Trash2 className="h-6 w-6 text-primary" />
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
