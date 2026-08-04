"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { AlignLeft, CalendarClock, Flag, Star } from "lucide-react"
import type { DecryptedTask, TaskPriority } from "@/lib/types/task"
import { cn } from "@/lib/utils"

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  urgent: "border-red-500/30 bg-red-500/10 text-red-400",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  low: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  none: "border-border bg-muted/40 text-muted-foreground",
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
}

export function TaskCard({
  task,
  now,
  subtaskCount = 0,
  isOverlay = false,
  onOpen,
}: {
  task: DecryptedTask
  now: number
  subtaskCount?: number
  isOverlay?: boolean
  onOpen: (task: DecryptedTask) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isOverlay,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  const due = task.payload.dueDate ? new Date(task.payload.dueDate) : null
  const overdue =
    now > 0 &&
    due !== null &&
    due.getTime() < now &&
    !task.payload.completedAt
  const priority = task.payload.priority ?? "none"

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging) onOpen(task)
      }}
      className={cn(
        "group flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3 shadow-sm transition-colors",
        isOverlay && "rotate-2 cursor-grabbing shadow-lg",
        isDragging && !isOverlay && "opacity-40",
        "cursor-grab hover:border-primary/40"
      )}
    >
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
          {task.payload.title}
        </p>
        {task.payload.favorite && (
          <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
        )}
      </div>

      {task.payload.description && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <AlignLeft className="size-3" />
          <span className="truncate">
            {task.payload.description.replace(/[#*_`]/g, " ").trim()}
          </span>
        </div>
      )}

      {task.payload.tags && task.payload.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.payload.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px]">
        {priority !== "none" && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-medium",
              PRIORITY_STYLES[priority]
            )}
          >
            <Flag className="size-2.5" />
            {PRIORITY_LABELS[priority]}
          </span>
        )}
        {due && (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              overdue ? "text-red-400" : "text-muted-foreground"
            )}
          >
            <CalendarClock className="size-3" />
            {due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
        {subtaskCount > 0 && (
          <span className="ml-auto text-muted-foreground">
            {subtaskCount} subtask{subtaskCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </div>
  )
}
