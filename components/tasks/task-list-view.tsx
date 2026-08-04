"use client"

import { CalendarClock, Circle, Flag, Star } from "lucide-react"
import type { DecryptedTask } from "@/lib/types/task"
import type { ColumnData } from "@/components/tasks/kanban-column"
import { cn } from "@/lib/utils"

export function TaskListView({
  columns,
  now,
  onOpenTask,
  onToggleComplete,
}: {
  columns: ColumnData[]
  now: number
  onOpenTask: (task: DecryptedTask) => void
  onToggleComplete: (task: DecryptedTask) => void
}) {
  if (columns.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No tasks to show.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {columns.map((column) => {
        if (column.tasks.length === 0) return null
        return (
          <section key={column.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: column.color || "currentColor" }}
              />
              <h3 className="text-sm font-semibold">{column.name}</h3>
              <span className="text-xs text-muted-foreground">
                {column.tasks.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {column.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  now={now}
                  onOpen={() => onOpenTask(task)}
                  onToggleComplete={() => onToggleComplete(task)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function TaskRow({
  task,
  now,
  onOpen,
  onToggleComplete,
}: {
  task: DecryptedTask
  now: number
  onOpen: () => void
  onToggleComplete: () => void
}) {
  const completed = Boolean(task.payload.completedAt)
  const priority = task.payload.priority ?? "none"
  const due = task.payload.dueDate ? new Date(task.payload.dueDate) : null
  const overdue =
    now > 0 &&
    due !== null &&
    due.getTime() < now &&
    !completed

  return (
    <div className="group flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-muted/40">
      <button
        type="button"
        aria-label={completed ? "Mark incomplete" : "Mark complete"}
        onClick={(event) => {
          event.stopPropagation()
          onToggleComplete()
        }}
        className="shrink-0 cursor-pointer rounded-full p-0.5 text-muted-foreground transition-colors hover:text-emerald-500"
      >
        {completed ? (
          <div className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
            <svg viewBox="0 0 12 12" className="size-3" fill="none">
              <path
                d="M2.5 6.5L5 9L9.5 3.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : (
          <Circle className="size-4" />
        )}
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-2">
          {priority !== "none" && (
            <Flag
              className={cn(
                "size-3 shrink-0",
                priority === "urgent" && "text-red-400",
                priority === "high" && "text-orange-400",
                priority === "medium" && "text-amber-400",
                priority === "low" && "text-sky-400"
              )}
            />
          )}
          <span
            className={cn(
              "truncate text-sm font-medium",
              completed && "text-muted-foreground line-through"
            )}
          >
            {task.payload.title}
          </span>
          {task.payload.favorite && (
            <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />
          )}
        </div>
      </button>

      {task.payload.tags && task.payload.tags.length > 0 && (
        <div className="hidden shrink-0 items-center gap-1 sm:flex">
          {task.payload.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {due && (
        <span
          className={cn(
            "hidden w-24 shrink-0 text-right text-[11px] sm:block",
            overdue ? "font-medium text-red-400" : "text-muted-foreground"
          )}
        >
          <CalendarClock className="mr-1 inline size-3" />
          {due.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
      )}
    </div>
  )
}
