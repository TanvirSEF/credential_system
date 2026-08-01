"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { VaultGuard } from "@/components/vault-guard";
import { useVaultSessionStore } from "@/stores/vault-session-store";
import { decryptPayload } from "@/lib/crypto";
import { fetchCredentialsAction } from "@/lib/actions/credentials";
import { fetchCredentialTypesAction } from "@/lib/actions/credential-types";
import { setCachedCredentials, getCachedCredentials } from "@/lib/storage/indexed-db";
import { subscribeBroadcast, broadcastMessage } from "@/lib/storage/broadcast-channel";
import { CreateCredentialDialog } from "@/components/credentials/create-credential-dialog";
import { CredentialDetailDialog } from "@/components/credentials/credential-detail-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Star, ExternalLink, Search } from "lucide-react";
import { DecryptedCredential, DecryptedCredentialPayload } from "@/lib/types/credential";
import { DecryptedCredentialType, CredentialTypePayload } from "@/lib/types/credential-template";

function CredentialsContent() {
  const router = useRouter();
  const { vaultKey, vaultId } = useVaultSessionStore();

  const [credentialsList, setCredentialsList] = useState<DecryptedCredential[]>([]);
  const [types, setTypes] = useState<DecryptedCredentialType[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState<string>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Modals
  const [selectedCredential, setSelectedCredential] = useState<DecryptedCredential | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<DecryptedCredential | null>(null);

  const loadData = useCallback(async () => {
    if (!vaultId || !vaultKey) return;

    // 1. Instant Cold Start from IndexedDB Cache
    const cachedRows = await getCachedCredentials(vaultId);
    if (cachedRows.length > 0) {
      const decryptedCached = await Promise.all(
        cachedRows.map(async (c) => ({
          id: c.id,
          vaultId: c.vaultId,
          ownerId: "",
          typeId: c.typeId,
          deletedAt: c.deletedAt,
          version: c.version,
          createdAt: new Date(),
          updatedAt: c.updatedAt,
          payload: await decryptPayload<DecryptedCredentialPayload>(
            {
              ciphertext: c.payloadCiphertext,
              iv: c.iv,
              cryptoVersion: c.cryptoVersion,
              schemaVersion: 1,
            },
            vaultKey
          ),
        }))
      );
      setCredentialsList(decryptedCached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // 2. Fetch Fresh Data from Supabase
    const typesRes = await fetchCredentialTypesAction(vaultId);
    if (typesRes.types && typesRes.types.length > 0) {
      const decryptedTypes = await Promise.all(
        typesRes.types.map(async (t) => ({
          id: t.id,
          vaultId: t.vaultId,
          ownerId: t.ownerId,
          parentId: t.parentId,
          sortOrder: t.sortOrder,
          archivedAt: t.archivedAt,
          payload: await decryptPayload<CredentialTypePayload>(
            {
              ciphertext: t.payloadCiphertext,
              iv: t.iv,
              cryptoVersion: t.cryptoVersion,
              schemaVersion: t.schemaVersion,
            },
            vaultKey
          ),
        }))
      );
      setTypes(decryptedTypes);
    }

    const credsRes = await fetchCredentialsAction(vaultId);
    if (credsRes.credentials && credsRes.credentials.length > 0) {
      const decryptedCreds = await Promise.all(
        credsRes.credentials.map(async (c) => ({
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
      setCredentialsList(decryptedCreds);

      // Save encrypted rows to IndexedDB cache
      setCachedCredentials(
        vaultId,
        credsRes.credentials.map((r) => ({
          id: r.id,
          vaultId: r.vaultId,
          typeId: r.typeId,
          payloadCiphertext: r.payloadCiphertext,
          iv: r.iv,
          cryptoVersion: r.cryptoVersion,
          version: r.version,
          deletedAt: r.deletedAt,
          updatedAt: r.updatedAt,
        }))
      );
    } else {
      setCredentialsList([]);
      setCachedCredentials(vaultId, []);
    }

    setLoading(false);
  }, [vaultId, vaultKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for broadcast cache invalidation events from other tabs
  useEffect(() => {
    return subscribeBroadcast((msg) => {
      if (msg.type === "CACHE_INVALIDATED") {
        loadData();
      }
    });
  }, [loadData]);

  const filteredCredentials = useMemo(() => {
    return credentialsList.filter((item) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = item.payload.title?.toLowerCase().includes(query);
        const subtitleMatch = item.payload.subtitle?.toLowerCase().includes(query);
        const websiteMatch = item.payload.websiteUrls?.some((u) => u.toLowerCase().includes(query));
        const tagMatch = item.payload.tags?.some((t) => t.toLowerCase().includes(query));

        if (!titleMatch && !subtitleMatch && !websiteMatch && !tagMatch) {
          return false;
        }
      }

      if (selectedTypeId !== "all" && item.typeId !== selectedTypeId) {
        return false;
      }

      if (favoritesOnly && !item.payload.favorite) {
        return false;
      }

      return true;
    });
  }, [credentialsList, searchQuery, selectedTypeId, favoritesOnly]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1200px]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight font-heading">Encrypted Credentials</h1>
          <p className="text-sm text-muted-foreground">Manage your passwords, API keys, and secrets</p>
        </div>
        <div className="flex items-center gap-3">
          <CreateCredentialDialog
            existingTypes={types}
            editCredential={editingCredential}
            onSaved={() => {
              setEditingCredential(null);
              broadcastMessage({ type: "CACHE_INVALIDATED" });
              loadData();
            }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Search Bar & Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
          <div className="relative w-full md:w-1/2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search titles, usernames, websites, or tags in memory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Categories</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.payload.name}
                </option>
              ))}
            </select>

            <Button
              variant={favoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setFavoritesOnly(!favoritesOnly)}
            >
              <Star className="h-4 w-4 mr-1.5 fill-current" /> Favorites
            </Button>
          </div>
        </div>

        {/* Credentials Grid */}
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Decrypting credentials in secure memory...
          </div>
        ) : filteredCredentials.length === 0 ? (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle>No Credentials Found</CardTitle>
              <CardDescription>
                {searchQuery || selectedTypeId !== "all" || favoritesOnly
                  ? "No items match your active search filters."
                  : "Click '+ Add New Credential' above to store your first encrypted entry."}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCredentials.map((item) => (
              <Card
                key={item.id}
                className="shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
                onClick={() => {
                  setSelectedCredential(item);
                  setDetailOpen(true);
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-bold truncate">
                      {item.payload.title}
                    </CardTitle>
                    {item.payload.favorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                  </div>
                  {item.payload.subtitle && (
                    <CardDescription className="truncate text-xs font-mono">
                      {item.payload.subtitle}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {item.payload.websiteUrls && item.payload.websiteUrls.length > 0 && (
                    <div className="text-xs text-primary truncate flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> {item.payload.websiteUrls[0]}
                    </div>
                  )}

                  {item.payload.tags && item.payload.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.payload.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-[10px]">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail View Modal */}
      <CredentialDetailDialog
        credential={selectedCredential}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDeleted={() => {
          broadcastMessage({ type: "CACHE_INVALIDATED" });
          loadData();
        }}
        onEdit={(cred) => {
          setEditingCredential(cred);
        }}
      />
    </div>
  );
}

export default function CredentialsDashboardPage() {
  return (
    <VaultGuard>
      <CredentialsContent />
    </VaultGuard>
  );
}
