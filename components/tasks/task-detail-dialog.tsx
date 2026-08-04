"use client"

import { useState } from "react"
import {
  CalendarClock,
  CalendarDays,
  Check,
  Circle,
  Flag,
  Pencil,
  Plus,
  Repeat,
  Star,
  Trash2,
} from "lucide-react"
import type { DecryptedTask, TaskPriority } from "@/lib/types/task"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: "text-red-400",
  high: "text-orange-400",
  medium: "text-amber-400",
  low: "text-sky-400",
  none: "text-muted-foreground",
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function recurrenceSummary(recurrence: {
  freq: string
  interval: number
}): string {
  const unit =
    recurrence.freq +
    (recurrence.interval > 1 ? "s" : "")
  return `Repeats every ${recurrence.interval} ${unit}`
}

export function TaskDetailDialog({
  task,
  now,
  open,
  onOpenChange,
  listName,
  subtasks,
  onAddSubtask,
  onToggleSubtask,
  onToggleComplete,
  onEdit,
  onDelete,
}: {
  task: DecryptedTask | null
  now: number
  open: boolean
  onOpenChange: (open: boolean) => void
  listName: string | null
  subtasks: DecryptedTask[]
  onAddSubtask: (title: string) => void
  onToggleSubtask: (task: DecryptedTask) => void
  onToggleComplete: (task: DecryptedTask) => void
  onEdit: (task: DecryptedTask) => void
  onDelete: (id: string) => void
}) {
  const [subtaskTitle, setSubtaskTitle] = useState("")

  if (!task) return null
  const priority = task.payload.priority ?? "none"
  const due = task.payload.dueDate ? new Date(task.payload.dueDate) : null
  const overdue =
    now > 0 &&
    due !== null &&
    due.getTime() < now &&
    !task.payload.completedAt
  const completed = Boolean(task.payload.completedAt)

  function submitSubtask(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = subtaskTitle.trim()
    if (!trimmed) return
    onAddSubtask(trimmed)
    setSubtaskTitle("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-2">
            <DialogTitle
              className={cn(
                "flex-1 text-lg leading-snug",
                completed && "text-muted-foreground line-through"
              )}
            >
              {task.payload.title}
            </DialogTitle>
            {task.payload.favorite && (
              <Star className="mt-1 size-4 shrink-0 fill-amber-400 text-amber-400" />
            )}
          </div>
          <DialogDescription>{listName || "Uncategorized"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {priority !== "none" && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-medium",
                  PRIORITY_COLORS[priority]
                )}
              >
                <Flag className="size-3" />
                {PRIORITY_LABELS[priority]}
              </span>
            )}
            {task.payload.startDate && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <CalendarDays className="size-3" />
                Start {formatDateTime(task.payload.startDate)}
              </span>
            )}
            {task.payload.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  overdue
                    ? "font-medium text-red-400"
                    : "text-muted-foreground"
                )}
              >
                <CalendarClock className="size-3" />
                Due {formatDateTime(task.payload.dueDate)}
              </span>
            )}
            {task.payload.recurrence && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Repeat className="size-3" />
                {recurrenceSummary(task.payload.recurrence)}
              </span>
            )}
          </div>

          {task.payload.tags && task.payload.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.payload.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {task.payload.description ? (
            <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/20 p-3 text-sm leading-relaxed">
              {task.payload.description}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No description.</p>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Subtasks
            </p>
            <div className="flex flex-col gap-1.5">
              {subtasks.length === 0 && (
                <p className="text-xs text-muted-foreground">No subtasks.</p>
              )}
              {subtasks.map((subtask) => {
                const subCompleted = Boolean(subtask.payload.completedAt)
                return (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5"
                  >
                    <button
                      type="button"
                      aria-label={
                        subCompleted ? "Mark incomplete" : "Mark complete"
                      }
                      onClick={() => onToggleSubtask(subtask)}
                      className="shrink-0 cursor-pointer rounded-full p-0.5 text-muted-foreground hover:text-emerald-500"
                    >
                      {subCompleted ? (
                        <div className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <Check className="size-3" />
                        </div>
                      ) : (
                        <Circle className="size-4" />
                      )}
                    </button>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        subCompleted &&
                          "text-muted-foreground line-through"
                      )}
                    >
                      {subtask.payload.title}
                    </span>
                  </div>
                )
              })}
            </div>
            <form onSubmit={submitSubtask} className="flex items-center gap-1">
              <div className="flex flex-1 items-center gap-1 rounded-lg border px-2.5 py-1.5 focus-within:border-primary/40">
                <Plus className="size-3.5 text-muted-foreground" />
                <input
                  value={subtaskTitle}
                  onChange={(event) => setSubtaskTitle(event.target.value)}
                  placeholder="Add a subtask..."
                  className="h-5 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={!subtaskTitle.trim()}
              >
                Add
              </Button>
            </form>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant={completed ? "outline" : "secondary"}
            onClick={() => {
              onToggleComplete(task)
            }}
          >
            <Check className="size-4" />
            {completed ? "Completed" : "Mark complete"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              onEdit(task)
            }}
          >
            <Pencil className="size-4" /> Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onOpenChange(false)
              onDelete(task.id)
            }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
