"use client"

import { useState } from "react"
import { encryptPayload } from "@/lib/crypto"
import { createCredentialTypeAction } from "@/lib/actions/credential-types"
import { useVaultSessionStore } from "@/stores/vault-session-store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2 } from "lucide-react"
import {
  DecryptedCredentialType,
  FieldType,
  TemplateField,
} from "@/lib/types/credential-template"

export function CreateTypeDialog({
  existingTypes,
  onTypeCreated,
}: {
  existingTypes: DecryptedCredentialType[]
  onTypeCreated: () => void
}) {
  const { vaultKey, vaultId } = useVaultSessionStore()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [parentId, setParentId] = useState<string>("none")
  const [fields, setFields] = useState<TemplateField[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addField() {
    const newField: TemplateField = {
      id: crypto.randomUUID(),
      label: "",
      type: "text",
      secret: false,
      required: false,
      copyable: true,
      sortOrder: fields.length,
    }
    setFields([...fields, newField])
  }

  function removeField(id: string) {
    setFields(fields.filter((f) => f.id !== id))
  }

  function updateField(id: string, updates: Partial<TemplateField>) {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!vaultKey || !vaultId) return

    if (!name.trim()) {
      setError("Category name is required.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const payload = {
        name: name.trim(),
        icon: "folder",
        description: description.trim() || undefined,
        fields,
      }

      const encrypted = await encryptPayload(payload, vaultKey)

      const res = await createCredentialTypeAction({
        vaultId,
        parentId: parentId === "none" ? undefined : parentId,
        payloadCiphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        sortOrder: existingTypes.length,
      })

      if (res.error) {
        throw new Error(res.error)
      }

      setName("")
      setDescription("")
      setParentId("none")
      setFields([])
      setOpen(false)
      onTypeCreated()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create category."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>+ New Category Type</Button>} />
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Category</DialogTitle>
          <DialogDescription>
            Define a custom hierarchical category and dynamic field template for
            your credentials.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="typeName">Category Name</Label>
            <Input
              id="typeName"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hosting Credentials"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentCategory">Parent Category (Optional)</Label>
            <Select
              value={parentId}
              onValueChange={(val) => setParentId(val || "none")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Parent Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Root Category)</SelectItem>
                {existingTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.payload.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Cloud servers and client hosting details"
            />
          </div>

          {/* Dynamic Fields Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Custom Template Fields
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addField}
              >
                + Add Field
              </Button>
            </div>

            {fields.length === 0 ? (
              <p className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
                No custom fields added yet.
              </p>
            ) : (
              <div className="space-y-3">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="space-y-3 rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Field Label (e.g. Server IP)"
                        value={field.label}
                        onChange={(e) =>
                          updateField(field.id, { label: e.target.value })
                        }
                        className="flex-1"
                      />
                      <Select
                        value={field.type}
                        onValueChange={(val) =>
                          updateField(field.id, {
                            type: (val || "text") as FieldType,
                          })
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="password">
                            Password/Secret
                          </SelectItem>
                          <SelectItem value="multiline">
                            Multiline Text
                          </SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="url">URL</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="boolean">Boolean Check</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(field.id)}
                        className="p-2 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex cursor-pointer items-center gap-1">
                        <input
                          type="checkbox"
                          checked={field.secret}
                          onChange={(e) =>
                            updateField(field.id, { secret: e.target.checked })
                          }
                        />
                        Mask as secret
                      </label>
                      <label className="flex cursor-pointer items-center gap-1">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            updateField(field.id, {
                              required: e.target.checked,
                            })
                          }
                        />
                        Required field
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving Category..." : "Save Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
