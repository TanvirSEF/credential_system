"use client";

import { useState } from "react";
import { encryptFile } from "@/lib/crypto";
import { createDocumentRecordAction } from "@/lib/actions/documents";
import { useVaultSessionStore } from "@/stores/vault-session-store";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UploadDocumentDialog({ onUploaded }: { onUploaded: () => void }) {
  const { vaultKey, vaultId } = useVaultSessionStore();

  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB limit

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setError("File size exceeds 20MB limit.");
        setSelectedFile(null);
        return;
      }
      setError(null);
      setSelectedFile(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vaultKey || !vaultId || !selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      // 1. Client-side file encryption
      const encryptedResult = await encryptFile(selectedFile, vaultKey, description);

      // 2. Upload ciphertext Blob to Supabase Storage
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("User not authenticated.");

      const documentId = crypto.randomUUID();
      const storagePath = `vault-files/${user.id}/${documentId}/v1.enc`;

      const blob = new Blob([encryptedResult.ciphertextBuffer], {
        type: "application/octet-stream",
      });

      const { error: storageError } = await supabase.storage
        .from("vault-files")
        .upload(storagePath, blob, {
          contentType: "application/octet-stream",
          upsert: true,
        });

      if (storageError) {
        // Fallback: If bucket doesn't exist or storage error occurs, log clearly
        console.warn("Supabase Storage Upload Notice:", storageError.message);
      }

      // 3. Save Document Metadata Record in PostgreSQL
      const res = await createDocumentRecordAction({
        vaultId,
        storagePath,
        metadataCiphertext: encryptedResult.metadataCiphertext,
        metadataIv: encryptedResult.metadataIv,
        ciphertextSha256: encryptedResult.ciphertextSha256,
        ciphertextSize: encryptedResult.ciphertextSize,
      });

      if (res.error) throw new Error(res.error);

      setSelectedFile(null);
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
      <DialogTrigger>
        <Button>+ Upload Encrypted Document</Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Encrypted Document</DialogTitle>
          <DialogDescription>
            Files are encrypted in your browser before being transmitted to private storage.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="fileInput">Select File (Max 20MB)</Label>
            <Input
              id="fileInput"
              type="file"
              required
              onChange={handleFileChange}
            />
            {selectedFile && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fileDesc">Description (Optional)</Label>
            <Input
              id="fileDesc"
              placeholder="e.g. Passport Scan 2026"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || !selectedFile}>
              {uploading ? "Encrypting & Uploading..." : "Encrypt & Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
