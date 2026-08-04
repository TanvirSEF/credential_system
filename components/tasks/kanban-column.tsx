"use client"

import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Check, Pencil, Plus, Trash2, X } from "lucide-react"
import type { DecryptedTask } from "@/lib/types/task"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { TaskCard } from "./task-card"

export interface ColumnData {
  id: string
  name: string
  color?: string
  canManage: boolean
  tasks: DecryptedTask[]
}

export function KanbanColumn({
  column,
  now,
  subtaskCounts,
  onOpenTask,
  onQuickAdd,
  onRename,
  onDelete,
}: {
  column: ColumnData
  now: number
  subtaskCounts: Map<string, number>
  onOpenTask: (task: DecryptedTask) => void
  onQuickAdd: (title: string, listId: string) => void
  onRename: (listId: string, name: string) => void
  onDelete: (listId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const [quickTitle, setQuickTitle] = useState("")
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(column.name)

  function commitRename() {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== column.name) onRename(column.id, trimmed)
    setRenaming(false)
  }

  function submitQuickAdd(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = quickTitle.trim()
    if (!trimmed) return
    onQuickAdd(trimmed, column.id)
    setQuickTitle("")
  }

  return (
    <div className="group/column flex max-h-[calc(100dvh-16rem)] w-72 shrink-0 flex-col rounded-2xl border border-border/60 bg-muted/30">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: column.color || "currentColor" }}
        />
        {renaming ? (
          <div className="flex flex-1 items-center gap-1">
            <Input
              autoFocus
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRename()
                if (event.key === "Escape") setRenaming(false)
              }}
              className="h-7 py-0 text-sm"
            />
            <button
              type="button"
              onClick={commitRename}
              className="text-emerald-500 hover:text-emerald-400"
            >
              <Check className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setRenaming(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <h3 className="flex-1 truncate text-sm font-semibold">
            {column.name}
          </h3>
        )}
        {!renaming && (
          <>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {column.tasks.length}
            </span>
            {column.canManage && (
              <div className="flex items-center opacity-0 transition-opacity group-hover/column:opacity-100">
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(column.name)
                    setRenaming(true)
                  }}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Rename list"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(column.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete list"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-b-2xl px-2 pb-2",
          isOver && "ring-2 ring-primary/40 ring-inset"
        )}
      >
        <SortableContext
          items={column.tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              now={now}
              subtaskCount={subtaskCounts.get(task.id) ?? 0}
              onOpen={onOpenTask}
            />
          ))}
        </SortableContext>

        {column.tasks.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Drop tasks here
          </p>
        )}

        <form onSubmit={submitQuickAdd} className="mt-auto pt-1">
          <div className="flex items-center gap-1 rounded-lg border border-transparent bg-background/40 px-2 py-1 focus-within:border-border">
            <Plus className="size-3.5 text-muted-foreground" />
            <input
              value={quickTitle}
              onChange={(event) => setQuickTitle(event.target.value)}
              placeholder="Add task..."
              className="h-7 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </form>
      </div>
    </div>
  )
}
