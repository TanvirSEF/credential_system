"use client";

import { useEffect, useState } from "react";
import { encryptPayload } from "@/lib/crypto";
import { createCredentialAction, updateCredentialAction } from "@/lib/actions/credentials";
import { useVaultSessionStore } from "@/stores/vault-session-store";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { DecryptedCredentialType, FieldType } from "@/lib/types/credential-template";
import { CredentialField, DecryptedCredential, DecryptedCredentialPayload } from "@/lib/types/credential";

export function CreateCredentialDialog({
  existingTypes,
  editCredential,
  onSaved,
}: {
  existingTypes: DecryptedCredentialType[];
  editCredential?: DecryptedCredential | null;
  onSaved: () => void;
}) {
  const { vaultKey, vaultId } = useVaultSessionStore();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState<string>("none");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [fields, setFields] = useState<CredentialField[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editCredential) {
      setTitle(editCredential.payload.title || "");
      setSubtitle(editCredential.payload.subtitle || "");
      setSelectedTypeId(editCredential.typeId || "none");
      setWebsiteUrl(editCredential.payload.websiteUrls?.[0] || "");
      setNotes(editCredential.payload.notes || "");
      setTagsInput(editCredential.payload.tags?.join(", ") || "");
      setFavorite(editCredential.payload.favorite || false);
      setFields(editCredential.payload.fields || []);
      setOpen(true);
    }
  }, [editCredential]);

  function handleTypeChange(typeId: string) {
    setSelectedTypeId(typeId);
    if (!editCredential && typeId !== "none") {
      const typeObj = existingTypes.find((t) => t.id === typeId);
      if (typeObj && typeObj.payload.fields) {
        const templateFields: CredentialField[] = typeObj.payload.fields.map((tf) => ({
          id: crypto.randomUUID(),
          label: tf.label,
          type: tf.type,
          value: "",
          secret: tf.secret,
          required: tf.required,
          copyable: tf.copyable,
        }));
        setFields(templateFields);
      }
    }
  }

  function addCustomField() {
    const newField: CredentialField = {
      id: crypto.randomUUID(),
      label: "",
      type: "text",
      value: "",
      secret: false,
      copyable: true,
    };
    setFields([...fields, newField]);
  }

  function removeField(id: string) {
    setFields(fields.filter((f) => f.id !== id));
  }

  function updateField(id: string, updates: Partial<CredentialField>) {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vaultKey || !vaultId) return;

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: DecryptedCredentialPayload = {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        typeId: selectedTypeId === "none" ? undefined : selectedTypeId,
        fields,
        websiteUrls: websiteUrl.trim() ? [websiteUrl.trim()] : undefined,
        notes: notes.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        favorite,
      };

      const encrypted = await encryptPayload(payload, vaultKey);

      if (editCredential) {
        const res = await updateCredentialAction({
          id: editCredential.id,
          typeId: selectedTypeId === "none" ? undefined : selectedTypeId,
          payloadCiphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          version: editCredential.version,
        });

        if (res.error) throw new Error(res.error);
      } else {
        const res = await createCredentialAction({
          vaultId,
          typeId: selectedTypeId === "none" ? undefined : selectedTypeId,
          payloadCiphertext: encrypted.ciphertext,
          iv: encrypted.iv,
        });

        if (res.error) throw new Error(res.error);
      }

      resetForm();
      setOpen(false);
      onSaved();
    } catch (err: any) {
      setError(err.message || "Failed to save credential.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle("");
    setSubtitle("");
    setSelectedTypeId("none");
    setWebsiteUrl("");
    setNotes("");
    setTagsInput("");
    setFavorite(false);
    setFields([]);
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) resetForm();
    }}>
      <DialogTrigger>
        <Button>+ Add New Credential</Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editCredential ? "Edit Credential" : "New Credential Entry"}</DialogTitle>
          <DialogDescription>
            {editCredential
              ? "Update item fields. Payload will be re-encrypted with a fresh IV."
              : "Store a new credential encrypted zero-knowledge before upload."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. GitHub Account, Personal Wi-Fi"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category Type</Label>
            <Select value={selectedTypeId} onValueChange={(val) => handleTypeChange(val || "none")}>
              <SelectTrigger>
                <SelectValue placeholder="Select Category Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">General / Uncategorized</SelectItem>
                {existingTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.payload.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle / Username</Label>
              <Input
                id="subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. user@gmail.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>

          {/* Dynamic Fields */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Credential Fields</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                + Add Custom Field
              </Button>
            </div>

            {fields.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 border rounded-md border-dashed">
                Select a category above or add custom fields below.
              </p>
            ) : (
              <div className="space-y-3">
                {fields.map((field) => (
                  <div key={field.id} className="rounded-lg border p-3 bg-muted/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Label (e.g. Password)"
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        className="w-1/3"
                      />
                      <Input
                        type={field.secret ? "password" : "text"}
                        placeholder="Value"
                        value={field.value}
                        onChange={(e) => updateField(field.id, { value: e.target.value })}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(field.id)}
                        className="text-destructive p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.secret}
                          onChange={(e) => updateField(field.id, { secret: e.target.checked })}
                        />
                        Mask secret
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="notes">Private Notes</Label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional encrypted notes..."
              className="w-full rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="dev, work, personal"
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={favorite}
                  onChange={(e) => setFavorite(e.target.checked)}
                />
                Mark as Favorite
              </label>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving Encrypted Item..." : "Save Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
