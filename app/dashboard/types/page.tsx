"use client";

import { useEffect, useState, useCallback } from "react";
import { VaultGuard } from "@/components/vault-guard";
import { useVaultSessionStore } from "@/stores/vault-session-store";
import { decryptPayload } from "@/lib/crypto";
import { archiveCredentialTypeAction, fetchCredentialTypesAction } from "@/lib/actions/credential-types";
import { CreateTypeDialog } from "@/components/create-type-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Folder, Lock } from "lucide-react";
import { DecryptedCredentialType, CredentialTypePayload } from "@/lib/types/credential-template";

function TypesDashboardContent() {
  const { vaultKey, vaultId } = useVaultSessionStore();

  const [types, setTypes] = useState<DecryptedCredentialType[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTypes = useCallback(async () => {
    if (!vaultId || !vaultKey) return;
    setLoading(true);

    const res = await fetchCredentialTypesAction(vaultId);
    if (res.types && res.types.length > 0) {
      const decryptedList = await Promise.all(
        res.types.map(async (row) => {
          const payload = await decryptPayload<CredentialTypePayload>(
            {
              ciphertext: row.payloadCiphertext,
              iv: row.iv,
              cryptoVersion: row.cryptoVersion,
              schemaVersion: row.schemaVersion,
            },
            vaultKey
          );

          return {
            id: row.id,
            vaultId: row.vaultId,
            ownerId: row.ownerId,
            parentId: row.parentId,
            sortOrder: row.sortOrder,
            archivedAt: row.archivedAt,
            payload,
          };
        })
      );

      setTypes(decryptedList);
    } else {
      setTypes([]);
    }
    setLoading(false);
  }, [vaultId, vaultKey]);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  async function handleArchive(id: string) {
    if (!confirm("Are you sure you want to archive this category?")) return;
    await archiveCredentialTypeAction(id);
    loadTypes();
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1200px]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight font-heading">Categories & Templates</h1>
          <p className="text-sm text-muted-foreground">Hierarchical credential categories · {types.length} categories</p>
        </div>
        <CreateTypeDialog existingTypes={types} onTypeCreated={loadTypes} />
      </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Decrypting category templates...
          </div>
        ) : types.length === 0 ? (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle>No Categories Found</CardTitle>
              <CardDescription>
                Create your first custom credential category template to organize your data.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {types.map((type) => (
              <Card key={type.id} className="shadow-sm relative">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Folder className="h-5 w-5 text-primary" />
                      <span>{type.payload.name}</span>
                    </CardTitle>
                    {type.parentId && (
                      <Badge variant="secondary" className="text-[10px]">
                        Nested Sub-category
                      </Badge>
                    )}
                    {type.payload.description && (
                      <CardDescription>{type.payload.description}</CardDescription>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArchive(type.id)}
                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Archive
                  </Button>
                </CardHeader>

                <CardContent className="space-y-3 pt-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Template Fields ({type.payload.fields?.length || 0})
                  </div>

                  {type.payload.fields && type.payload.fields.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {type.payload.fields.map((f) => (
                        <Badge key={f.id} variant="outline" className="text-xs flex items-center gap-1">
                          {f.secret && <Lock className="h-3 w-3 text-muted-foreground" />}
                          <span>{f.label}</span>
                          <span className="text-[10px] text-muted-foreground">({f.type})</span>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Standard fields</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}

export default function TypesDashboardPage() {
  return (
    <VaultGuard>
      <TypesDashboardContent />
    </VaultGuard>
  );
}
