"use client"

import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { Plus } from "lucide-react"
import type { DecryptedTask } from "@/lib/types/task"
import { KanbanColumn, type ColumnData } from "./kanban-column"
import { TaskCard } from "./task-card"

export function KanbanBoard({
  columns,
  now,
  subtaskCounts,
  onOpenTask,
  onQuickAdd,
  onRename,
  onDelete,
  onMoveTask,
  onAddListClick,
}: {
  columns: ColumnData[]
  now: number
  subtaskCounts: Map<string, number>
  onOpenTask: (task: DecryptedTask) => void
  onQuickAdd: (title: string, listId: string) => void
  onRename: (listId: string, name: string) => void
  onDelete: (listId: string) => void
  onMoveTask: (
    activeTaskId: string,
    targetListId: string,
    beforeTaskId: string | null
  ) => void
  onAddListClick: () => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function findTask(id: string): DecryptedTask | undefined {
    for (const column of columns) {
      const task = column.tasks.find((item) => item.id === id)
      if (task) return task
    }
    return undefined
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const activeTaskId = String(active.id)
    const overId = String(over.id)
    if (activeTaskId === overId) return

    const directColumn = columns.find((column) => column.id === overId)
    if (directColumn) {
      onMoveTask(activeTaskId, directColumn.id, null)
      return
    }
    const containerColumn = columns.find((column) =>
      column.tasks.some((task) => task.id === overId)
    )
    if (!containerColumn) return
    onMoveTask(activeTaskId, containerColumn.id, overId)
  }

  const activeTask = activeId ? findTask(activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex items-start gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            now={now}
            subtaskCounts={subtaskCounts}
            onOpenTask={onOpenTask}
            onQuickAdd={onQuickAdd}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
        <button
          type="button"
          onClick={onAddListClick}
          className="flex h-12 w-72 shrink-0 items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <Plus className="size-4" /> Add list
        </button>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-72">
            <TaskCard
              task={activeTask}
              now={now}
              isOverlay
              onOpen={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
