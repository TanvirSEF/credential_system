"use client"

import { useEffect, useState, useCallback } from "react"
import { VaultGuard } from "@/components/vault-guard"
import { useVaultSessionStore } from "@/stores/vault-session-store"
import { decryptPayload, decryptFile } from "@/lib/crypto"
import {
  fetchDocumentsAction,
  softDeleteDocumentAction,
  getDocumentDownloadUrlAction,
} from "@/lib/actions/documents"
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, FileText, Download, Trash2 } from "lucide-react"
import {
  DecryptedDocument,
  DecryptedDocumentMetadata,
} from "@/lib/types/document"

function DocumentsContent() {
  const { vaultKey, vaultId } = useVaultSessionStore()

  const [documentsList, setDocumentsList] = useState<DecryptedDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    if (!vaultId || !vaultKey) return
    setLoading(true)

    const res = await fetchDocumentsAction(vaultId)
    if (res.documents && res.documents.length > 0) {
      const decrypted = await Promise.all(
        res.documents.map(async (doc) => {
          const metadata = await decryptPayload<DecryptedDocumentMetadata>(
            {
              ciphertext: doc.metadataCiphertext,
              iv: doc.metadataIv,
              cryptoVersion: doc.cryptoVersion,
              schemaVersion: 1,
            },
            vaultKey
          )

          return {
            id: doc.id,
            vaultId: doc.vaultId,
            ownerId: doc.ownerId,
            credentialId: doc.credentialId,
            storagePath: doc.storagePath,
            ciphertextSha256: doc.ciphertextSha256,
            ciphertextSize: doc.ciphertextSize,
            uploadStatus: doc.uploadStatus,
            deletedAt: doc.deletedAt,
            metadata,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          }
        })
      )
      setDocumentsList(decrypted)
    } else {
      setDocumentsList([])
    }
    setLoading(false)
  }, [vaultId, vaultKey])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  async function handleDownload(doc: DecryptedDocument) {
    if (!vaultKey) return
    setDownloadingId(doc.id)

    try {
      const dl = await getDocumentDownloadUrlAction(doc.id)
      if (dl.error || !dl.downloadUrl) {
        throw new Error(dl.error || "Failed to get download URL.")
      }

      const resp = await fetch(dl.downloadUrl)
      if (!resp.ok) {
        throw new Error(
          `Failed to download encrypted file blob (${resp.status}).`
        )
      }

      const ciphertextBuffer = await resp.arrayBuffer()
      const decryptedBlob = await decryptFile(
        ciphertextBuffer,
        doc.metadata,
        vaultKey
      )

      const objectUrl = URL.createObjectURL(decryptedBlob)
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = doc.metadata.originalName
      a.click()

      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000)
    } catch (err) {
      alert(
        "Download error: " +
          (err instanceof Error ? err.message : "Failed to decrypt document.")
      )
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Move this document to Trash?")) return
    await softDeleteDocumentAction(id)
    loadDocuments()
  }

  const totalSizeBytes = documentsList.reduce(
    (acc, d) => acc + d.ciphertextSize,
    0
  )
  const totalSizeMB = (totalSizeBytes / 1024 / 1024).toFixed(2)

  return (
    <div className="max-w-[1200px] space-y-6 p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            Encrypted Documents
          </h1>
          <p className="text-sm text-muted-foreground">
            Zero-knowledge encrypted files · {documentsList.length} files (
            {totalSizeMB} MB)
          </p>
        </div>
        <UploadDocumentDialog onUploaded={loadDocuments} />
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Decrypting document metadata...
        </div>
      ) : documentsList.length === 0 ? (
        <Card className="py-12 text-center">
          <CardHeader>
            <CardTitle>No Documents Uploaded</CardTitle>
            <CardDescription>
              Upload your first encrypted document (PDF, image, certificate,
              etc.).
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {documentsList.map((doc) => (
            <Card key={doc.id} className="shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1 truncate pr-2">
                  <CardTitle className="flex items-center gap-2 truncate text-base font-bold">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">
                      {doc.metadata.originalName}
                    </span>
                  </CardTitle>
                  {doc.metadata.description && (
                    <CardDescription>
                      {doc.metadata.description}
                    </CardDescription>
                  )}
                </div>
                <Badge
                  variant="secondary"
                  className="font-mono text-[10px] uppercase"
                >
                  {(doc.ciphertextSize / 1024 / 1024).toFixed(2)} MB
                </Badge>
              </CardHeader>

              <CardContent className="mt-3 flex items-center justify-between border-t pt-4">
                <div className="font-mono text-xs text-muted-foreground">
                  {doc.metadata.mimeType || "application/octet-stream"}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc.id}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    {downloadingId === doc.id
                      ? "Decrypting..."
                      : "Download & Decrypt"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(doc.id)}
                    className="text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DocumentsDashboardPage() {
  return (
    <VaultGuard>
      <DocumentsContent />
    </VaultGuard>
  )
}
