"use client"

import { useEffect, useState } from "react"
import { AlertCircle, ListTodo, Plus, ShieldCheck, Star } from "lucide-react"
import { createTaskAction, updateTaskAction } from "@/lib/actions/tasks"
import { encryptPayload } from "@/lib/crypto"
import type {
  DecryptedTask,
  DecryptedTaskList,
  DecryptedTaskPayload,
  TaskPriority,
} from "@/lib/types/task"
import { nextOrderInList } from "@/lib/tasks/ordering"
import { useVaultSessionStore } from "@/stores/vault-session-store"
import {
  enqueueSyncJob,
  getCachedTasks,
  setCachedTasks,
} from "@/lib/storage/indexed-db"
import { flushSyncQueue } from "@/lib/sync-engine"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "none", label: "None" },
]

export function CreateTaskDialog({
  editTask,
  taskLists,
  defaultListId,
  tasks,
  trigger,
  onSaved,
}: {
  editTask?: DecryptedTask | null
  taskLists: DecryptedTaskList[]
  defaultListId?: string | null
  tasks: DecryptedTask[]
  trigger?: React.ReactElement
  onSaved: () => void
}) {
  const { vaultKey, vaultId } = useVaultSessionStore()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [listId, setListId] = useState<string>(defaultListId ?? "")
  const [priority, setPriority] = useState<TaskPriority>("none")
  const [dueDate, setDueDate] = useState("")
  const [startDate, setStartDate] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const [favorite, setFavorite] = useState(false)
  const [recurrenceFreq, setRecurrenceFreq] = useState<
    "none" | "daily" | "weekly" | "monthly"
  >("none")
  const [recurrenceInterval, setRecurrenceInterval] = useState("1")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editTask) return
    const source = editTask
    const timeoutId = window.setTimeout(() => {
      setTitle(source.payload.title || "")
      setDescription(source.payload.description || "")
      setListId(source.listId || "")
      setPriority(source.payload.priority || "none")
      setDueDate(toInputValue(source.payload.dueDate))
      setStartDate(toInputValue(source.payload.startDate))
      setTagsInput(source.payload.tags?.join(", ") || "")
      setFavorite(source.payload.favorite || false)
      setRecurrenceFreq(source.payload.recurrence?.freq ?? "none")
      setRecurrenceInterval(
        String(source.payload.recurrence?.interval ?? 1)
      )
      setOpen(true)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [editTask])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!vaultKey || !vaultId) return
    if (!title.trim()) {
      setError("Give this task a title before saving.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const parsedTags = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
      const resolvedListId = listId || taskLists[0]?.id || null
      const order =
        editTask?.payload.order ??
        nextOrderInList(
          tasks.filter(
            (task) => (task.listId ?? null) === resolvedListId
          )
        )
      const payload: DecryptedTaskPayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        order,
        priority,
        startDate: fromInputValue(startDate) || undefined,
        dueDate: fromInputValue(dueDate) || undefined,
        tags: parsedTags.length ? parsedTags : undefined,
        favorite,
        recurrence:
          recurrenceFreq !== "none"
            ? {
                freq: recurrenceFreq,
                interval: Math.max(1, parseInt(recurrenceInterval, 10) || 1),
              }
            : undefined,
        customFields: editTask?.payload.customFields,
      }
      const encrypted = await encryptPayload(payload, vaultKey)

      if (navigator.onLine) {
        if (editTask) {
          const result = await updateTaskAction({
            id: editTask.id,
            listId: resolvedListId,
            payloadCiphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            version: editTask.version,
          })
          if (result.error) throw new Error(result.error)
        } else {
          const result = await createTaskAction({
            vaultId,
            listId: resolvedListId,
            payloadCiphertext: encrypted.ciphertext,
            iv: encrypted.iv,
          })
          if (result.error) throw new Error(result.error)
        }
      } else {
        const id = editTask?.id ?? crypto.randomUUID()
        if (editTask) {
          await enqueueSyncJob("UPDATE_TASK", {
            id,
            listId: resolvedListId,
            payloadCiphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            version: editTask.version,
          })
        } else {
          await enqueueSyncJob("CREATE_TASK", {
            id,
            vaultId,
            listId: resolvedListId,
            payloadCiphertext: encrypted.ciphertext,
            iv: encrypted.iv,
          })
        }

        const existing = await getCachedTasks(vaultId)
        const cachedTask = {
          id,
          vaultId,
          listId: resolvedListId,
          parentId: editTask?.parentId ?? null,
          payloadCiphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          cryptoVersion: 1,
          version: editTask ? editTask.version + 1 : 1,
          deletedAt: null,
          updatedAt: new Date(),
        }
        await setCachedTasks(
          vaultId,
          editTask
            ? existing.map((task) => (task.id === id ? cachedTask : task))
            : [...existing, cachedTask]
        )
        void flushSyncQueue()
      }

      resetForm()
      setOpen(false)
      onSaved()
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save this task."
      )
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setTitle("")
    setDescription("")
    setListId("")
    setPriority("none")
    setDueDate("")
    setStartDate("")
    setTagsInput("")
    setFavorite(false)
    setRecurrenceFreq("none")
    setRecurrenceInterval("1")
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <Plus /> New Task
            </Button>
          )
        }
      />

      <DialogContent className="grid max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b bg-linear-to-r from-primary/8 via-primary/3 to-transparent px-5 py-5 pr-14 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
              <ListTodo className="size-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold">
                {editTask ? "Edit task" : "New task"}
              </DialogTitle>
              <DialogDescription className="max-w-lg text-xs leading-relaxed sm:text-sm">
                {editTask
                  ? "Update task details, status, and schedule."
                  : "Create an encrypted task with a status, priority, and due date."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What needs to be done?"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-desc">
                Description{" "}
                <span className="font-normal text-muted-foreground">
                  (optional, markdown)
                </span>
              </Label>
              <textarea
                id="task-desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add more detail..."
                rows={4}
                className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="task-list">List</Label>
                <Select
                  value={listId}
                  onValueChange={(value) => setListId(value ?? "")}
                >
                  <SelectTrigger id="task-list" className="h-10 w-full">
                    <SelectValue placeholder="Select a list" />
                  </SelectTrigger>
                  <SelectContent>
                    {taskLists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.payload.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(value) =>
                    setPriority((value ?? "none") as TaskPriority)
                  }
                >
                  <SelectTrigger id="task-priority" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="task-start">
                  Start date{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="task-start"
                  type="datetime-local"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">
                  Due date{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="task-due"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-tags">
                Tags{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="task-tags"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="work, urgent, backend"
                className="h-10"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="task-recurrence">Repeat</Label>
                <Select
                  value={recurrenceFreq}
                  onValueChange={(value) =>
                    setRecurrenceFreq(
                      (value ?? "none") as
                        | "none"
                        | "daily"
                        | "weekly"
                        | "monthly"
                    )
                  }
                >
                  <SelectTrigger id="task-recurrence" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Does not repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-interval">
                  Interval{" "}
                  <span className="font-normal text-muted-foreground">
                    (weeks/days)
                  </span>
                </Label>
                <Input
                  id="task-interval"
                  type="number"
                  min={1}
                  value={recurrenceInterval}
                  onChange={(event) => setRecurrenceInterval(event.target.value)}
                  disabled={recurrenceFreq === "none"}
                  className="h-10"
                />
              </div>
            </div>

            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted">
              <input
                type="checkbox"
                checked={favorite}
                onChange={(event) => setFavorite(event.target.checked)}
                className="size-4 cursor-pointer accent-primary"
              />
              <Star
                className={`size-4 ${favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
              />
              Favorite
            </label>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none border-t bg-background/95 px-5 py-4 backdrop-blur sm:px-6">
            <div className="mr-auto hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <ShieldCheck className="size-4 text-emerald-500" />
              Encrypted on this device
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="min-w-24"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-36">
              {loading
                ? "Encrypting & saving..."
                : editTask
                  ? "Save changes"
                  : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function toInputValue(iso?: string): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromInputValue(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}
