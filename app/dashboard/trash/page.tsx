"use client";

import { useEffect, useState, useCallback } from "react";
import { VaultGuard } from "@/components/vault-guard";
import { useVaultSessionStore } from "@/stores/vault-session-store";
import { decryptPayload } from "@/lib/crypto";
import {
  fetchTrashCredentialsAction,
  permanentDeleteCredentialAction,
  restoreCredentialAction,
} from "@/lib/actions/credentials";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { DecryptedCredential, DecryptedCredentialPayload } from "@/lib/types/credential";

function TrashDashboardContent() {
  const { vaultKey, vaultId } = useVaultSessionStore();

  const [trashList, setTrashList] = useState<DecryptedCredential[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrash = useCallback(async () => {
    if (!vaultId || !vaultKey) return;
    setLoading(true);

    const res = await fetchTrashCredentialsAction(vaultId);
    if (res.credentials && res.credentials.length > 0) {
      const decrypted = await Promise.all(
        res.credentials.map(async (c) => ({
          id: c.id,
          vaultId: c.vaultId,
          ownerId: c.ownerId,
          typeId: c.typeId,
          deletedAt: c.deletedAt,
          version: c.version,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          payload: await decryptPayload<DecryptedCredentialPayload>(
            {
              ciphertext: c.payloadCiphertext,
              iv: c.iv,
              cryptoVersion: c.cryptoVersion,
              schemaVersion: c.schemaVersion,
            },
            vaultKey
          ),
        }))
      );
      setTrashList(decrypted);
    } else {
      setTrashList([]);
    }
    setLoading(false);
  }, [vaultId, vaultKey]);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  async function handleRestore(id: string) {
    await restoreCredentialAction(id);
    loadTrash();
  }

  async function handlePermanentDelete(id: string) {
    if (!confirm("Permanently delete this item? This action cannot be undone.")) return;
    await permanentDeleteCredentialAction(id);
    loadTrash();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/credentials" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
            ← Credentials
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-lg font-bold">Trash & Recovery</h1>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Trash Bin</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Soft-deleted items are retained for 30 days before permanent purging.
            </p>
          </div>
          <Badge variant="outline" className="font-semibold">
            {trashList.length} Items in Trash
          </Badge>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Decrypting trash entries...
          </div>
        ) : trashList.length === 0 ? (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle>Trash is Empty</CardTitle>
              <CardDescription>No deleted credentials found in your trash bin.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trashList.map((item) => (
              <Card key={item.id} className="shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base font-bold">{item.payload.title}</CardTitle>
                    {item.payload.subtitle && (
                      <CardDescription className="font-mono text-xs">{item.payload.subtitle}</CardDescription>
                    )}
                  </div>
                  <Badge variant="destructive" className="text-[10px]">
                    Deleted
                  </Badge>
                </CardHeader>

                <CardContent className="flex items-center justify-between pt-4 border-t mt-3">
                  <div className="text-xs text-muted-foreground">
                    Deleted on: {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : "Recent"}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleRestore(item.id)}>
                      ↩ Restore
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handlePermanentDelete(item.id)}>
                      Purge
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function TrashDashboardPage() {
  return (
    <VaultGuard>
      <TrashDashboardContent />
    </VaultGuard>
  );
}
