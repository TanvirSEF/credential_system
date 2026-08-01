"use client";

import { useState } from "react";
import { createDocumentRecordAction, createDocumentUploadUrlAction } from "@/lib/actions/documents";
import { encryptFile } from "@/lib/crypto/file-crypto";
import { useVaultSessionStore } from "@/stores/vault-session-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface UploadDocumentDialogProps {
  onUploaded: () => void;
}

export function UploadDocumentDialog({ onUploaded }: UploadDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { vaultKey, vaultId } = useVaultSessionStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    if (!vaultKey || !vaultId) {
      setError("Vault is locked. Please unlock your vault first.");
      return;
    }

    setUploading(true);

    try {
      const encryptedData = await encryptFile(file, vaultKey, description);

      const urlRes = await createDocumentUploadUrlAction(vaultId);
      if (urlRes.error || !urlRes.uploadUrl || !urlRes.storagePath) {
        setError(urlRes.error || "Failed to prepare upload.");
        return;
      }

      const putRes = await fetch(urlRes.uploadUrl, {
        method: "PUT",
        body: encryptedData.ciphertextBuffer,
        headers: { "Content-Type": "application/octet-stream" },
      });

      if (!putRes.ok) {
        setError(`Storage Upload Error: ${putRes.status} ${putRes.statusText}`);
        return;
      }

      const res = await createDocumentRecordAction({
        vaultId,
        storagePath: urlRes.storagePath,
        metadataCiphertext: encryptedData.metadataCiphertext,
        metadataIv: encryptedData.metadataIv,
        ciphertextSha256: encryptedData.ciphertextSha256,
        ciphertextSize: encryptedData.ciphertextSize,
      });

      if (res.error) {
        setError(res.error);
        return;
      }

      setFile(null);
      setDescription("");
      setOpen(false);
      onUploaded();
    } catch (err: any) {
      setError(err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>+ Upload Encrypted Document</Button>} />

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Encrypted Document</DialogTitle>
          <DialogDescription>
            Files are encrypted in your browser before being transmitted to private storage.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive font-sans">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="doc-file">Select File</Label>
            <Input
              id="doc-file"
              type="file"
              required
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) {
                  setFile(selected);
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-desc">Description (Optional)</Label>
            <Input
              id="doc-desc"
              placeholder="e.g. Passport Scan, Tax Return 2025"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={uploading}>
              {uploading ? "Encrypting & Uploading..." : "Upload File"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
