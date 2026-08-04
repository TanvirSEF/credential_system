"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { VaultGuard } from "@/components/vault-guard"
import { useVaultSessionStore } from "@/stores/vault-session-store"
import { decryptPayload, encryptPayload } from "@/lib/crypto"
import {
  createTaskAction,
  fetchTasksAction,
  softDeleteTaskAction,
  updateTaskAction,
} from "@/lib/actions/tasks"
import {
  createTaskListAction,
  fetchTaskListsAction,
  softDeleteTaskListAction,
  updateTaskListAction,
} from "@/lib/actions/task-lists"
import {
  enqueueSyncJob,
  getCachedTaskLists,
  getCachedTasks,
  setCachedTaskLists,
  setCachedTasks,
} from "@/lib/storage/indexed-db"
import { flushSyncQueue } from "@/lib/sync-engine"
import {
  broadcastMessage,
  subscribeBroadcast,
} from "@/lib/storage/broadcast-channel"
import {
  orderForInsert,
  rebalanceOrders,
  nextOrderInList,
  sortBySortOrder,
  sortTasksByOrder,
} from "@/lib/tasks/ordering"
import { useTaskReminders } from "@/lib/tasks/use-task-reminders"
import type {
  DecryptedTask,
  DecryptedTaskList,
  DecryptedTaskListPayload,
  DecryptedTaskPayload,
} from "@/lib/types/task"
import { KanbanBoard } from "@/components/tasks/kanban-board"
import type { ColumnData } from "@/components/tasks/kanban-column"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog"
import { TaskListView } from "@/components/tasks/task-list-view"
import { TaskCalendarView } from "@/components/tasks/task-calendar-view"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, LayoutGrid, List as ListIcon, ListTodo, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const UNCATEGORIZED_ID = "__uncategorized"

const DEFAULT_LISTS: Array<{
  name: string
  sortOrder: number
  color: string
}> = [
  { name: "To Do", sortOrder: 1, color: "#64748b" },
  { name: "In Progress", sortOrder: 2, color: "#f59e0b" },
  { name: "Done", sortOrder: 3, color: "#10b981" },
]

const VIEW_OPTIONS = [
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "list", label: "List", icon: ListIcon },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
] as const

function TasksContent() {
  const { vaultKey, vaultId, isUnlocked } = useVaultSessionStore()
  const [taskLists, setTaskLists] = useState<DecryptedTaskList[]>([])
  const [tasks, setTasks] = useState<DecryptedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<DecryptedTask | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<DecryptedTask | null>(null)
  const [view, setView] = useState<"board" | "list" | "calendar">("board")
  const seededRef = useRef<string | null>(null)
  const [now, setNow] = useState(0)

  const loadData = useCallback(async () => {
    if (!vaultId || !vaultKey) return

    const seedDefaults = async () => {
      if (seededRef.current === vaultId) return
      seededRef.current = vaultId
      for (const preset of DEFAULT_LISTS) {
        const listPayload: DecryptedTaskListPayload = {
          name: preset.name,
          color: preset.color,
          listType: "todo",
        }
        const encrypted = await encryptPayload(listPayload, vaultKey)
        if (navigator.onLine) {
          const result = await createTaskListAction({
            vaultId,
            sortOrder: preset.sortOrder,
            payloadCiphertext: encrypted.ciphertext,
            iv: encrypted.iv,
          })
          if ("newTaskList" in result && result.newTaskList) {
            const row = result.newTaskList
            setTaskLists((prev) => [
              ...prev,
              {
                id: row.id,
                vaultId: row.vaultId,
                ownerId: row.ownerId,
                sortOrder: row.sortOrder,
                deletedAt: row.deletedAt,
                version: row.version,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
                payload: listPayload,
              },
            ])
          }
        } else {
          const id = crypto.randomUUID()
          await enqueueSyncJob("CREATE_TASK_LIST", {
            id,
            vaultId,
            sortOrder: preset.sortOrder,
            payloadCiphertext: encrypted.ciphertext,
            iv: encrypted.iv,
          })
          setTaskLists((prev) => [
            ...prev,
            {
              id,
              vaultId,
              ownerId: "",
              sortOrder: preset.sortOrder,
              deletedAt: null,
              version: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
              payload: listPayload,
            },
          ])
        }
      }
      broadcastMessage({ type: "CACHE_INVALIDATED" })
    }

    const cachedTasks = await getCachedTasks(vaultId)
    const cachedLists = await getCachedTaskLists(vaultId)
    if (cachedTasks.length > 0 || cachedLists.length > 0) {
      const [decryptedTasks, decryptedLists] = await Promise.all([
        Promise.all(
          cachedTasks.map(async (row) => ({
            id: row.id,
            vaultId: row.vaultId,
            ownerId: "",
            listId: row.listId,
            parentId: row.parentId,
            deletedAt: row.deletedAt,
            version: row.version,
            createdAt: new Date(),
            updatedAt: row.updatedAt,
            payload: await decryptPayload<DecryptedTaskPayload>(
              {
                ciphertext: row.payloadCiphertext,
                iv: row.iv,
                cryptoVersion: row.cryptoVersion,
                schemaVersion: 1,
              },
              vaultKey
            ),
          }))
        ),
        Promise.all(
          cachedLists.map(async (row) => ({
            id: row.id,
            vaultId: row.vaultId,
            ownerId: "",
            sortOrder: row.sortOrder,
            deletedAt: row.deletedAt,
            version: row.version,
            createdAt: new Date(),
            updatedAt: row.updatedAt,
            payload: await decryptPayload<DecryptedTaskListPayload>(
              {
                ciphertext: row.payloadCiphertext,
                iv: row.iv,
                cryptoVersion: row.cryptoVersion,
                schemaVersion: 1,
              },
              vaultKey
            ),
          }))
        ),
      ])
      setTasks(decryptedTasks)
      setTaskLists(decryptedLists)
      setLoading(false)
    } else {
      setLoading(true)
    }

    if (!navigator.onLine) {
      setLoading(false)
      return
    }

    try {
      const [tasksRes, listsRes] = await Promise.all([
        fetchTasksAction(vaultId),
        fetchTaskListsAction(vaultId),
      ])

      if (listsRes.taskLists) {
        const decryptedLists = await Promise.all(
          listsRes.taskLists.map(async (row) => ({
            id: row.id,
            vaultId: row.vaultId,
            ownerId: row.ownerId,
            sortOrder: row.sortOrder,
            deletedAt: row.deletedAt,
            version: row.version,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            payload: await decryptPayload<DecryptedTaskListPayload>(
              {
                ciphertext: row.payloadCiphertext,
                iv: row.iv,
                cryptoVersion: row.cryptoVersion,
                schemaVersion: row.schemaVersion,
              },
              vaultKey
            ),
          }))
        )
        setTaskLists(decryptedLists)
        await setCachedTaskLists(
          vaultId,
          listsRes.taskLists.map((row) => ({
            id: row.id,
            vaultId: row.vaultId,
            payloadCiphertext: row.payloadCiphertext,
            iv: row.iv,
            cryptoVersion: row.cryptoVersion,
            sortOrder: row.sortOrder,
            version: row.version,
            deletedAt: row.deletedAt,
            updatedAt: row.updatedAt,
          }))
        )
        if (
          decryptedLists.length === 0 &&
          (tasksRes.tasks?.length ?? 0) === 0
        ) {
          void seedDefaults()
        }
      }

      if (tasksRes.tasks) {
        const decryptedTasks = await Promise.all(
          tasksRes.tasks.map(async (row) => ({
            id: row.id,
            vaultId: row.vaultId,
            ownerId: row.ownerId,
            listId: row.listId,
            parentId: row.parentId,
            deletedAt: row.deletedAt,
            version: row.version,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            payload: await decryptPayload<DecryptedTaskPayload>(
              {
                ciphertext: row.payloadCiphertext,
                iv: row.iv,
                cryptoVersion: row.cryptoVersion,
                schemaVersion: row.schemaVersion,
              },
              vaultKey
            ),
          }))
        )
        setTasks(decryptedTasks)
        await setCachedTasks(
          vaultId,
          tasksRes.tasks.map((row) => ({
            id: row.id,
            vaultId: row.vaultId,
            listId: row.listId,
            parentId: row.parentId,
            payloadCiphertext: row.payloadCiphertext,
            iv: row.iv,
            cryptoVersion: row.cryptoVersion,
            version: row.version,
            deletedAt: row.deletedAt,
            updatedAt: row.updatedAt,
          }))
        )
      }
    } catch (error) {
      console.warn("Using cached tasks while offline:", error)
    } finally {
      setLoading(false)
    }
  }, [vaultId, vaultKey])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadData(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadData])

  useEffect(() => {
    return subscribeBroadcast((message) => {
      if (message.type === "CACHE_INVALIDATED") loadData()
    })
  }, [loadData])

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const timeout = window.setTimeout(tick, 0)
    const interval = window.setInterval(tick, 60000)
    return () => {
      window.clearTimeout(timeout)
      window.clearInterval(interval)
    }
  }, [])

  useTaskReminders(tasks, now, Boolean(vaultKey && isUnlocked))

  const columns = useMemo<ColumnData[]>(() => {
    const listIds = new Set(taskLists.map((list) => list.id))
    const topLevel = tasks.filter((task) => task.parentId === null)
    const built = sortBySortOrder(taskLists).map((list) => ({
      id: list.id,
      name: list.payload.name,
      color: list.payload.color,
      canManage: true,
      tasks: sortTasksByOrder(
        topLevel.filter((task) => task.listId === list.id)
      ),
    }))
    const orphans = sortTasksByOrder(
      topLevel.filter(
        (task) => !task.listId || !listIds.has(task.listId)
      )
    )
    if (orphans.length > 0) {
      built.push({
        id: UNCATEGORIZED_ID,
        name: "Uncategorized",
        color: undefined,
        canManage: false,
        tasks: orphans,
      })
    }
    return built
  }, [taskLists, tasks])

  const subtaskCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const task of tasks) {
      if (task.parentId) {
        map.set(task.parentId, (map.get(task.parentId) ?? 0) + 1)
      }
    }
    return map
  }, [tasks])

  const selectedSubtasks = useMemo(
    () =>
      selectedTask
        ? sortTasksByOrder(
            tasks.filter((task) => task.parentId === selectedTask.id)
          )
        : [],
    [tasks, selectedTask]
  )

  function handleAddSubtask(title: string) {
    if (!selectedTask) return
    void createTask(
      title,
      selectedTask.listId ?? UNCATEGORIZED_ID,
      selectedTask.id
    )
  }

  function effectiveListId(task: DecryptedTask): string {
    const listIds = new Set(taskLists.map((list) => list.id))
    if (task.listId && listIds.has(task.listId)) return task.listId
    return UNCATEGORIZED_ID
  }

  async function persistTaskUpdate(task: DecryptedTask) {
    if (!vaultKey || !vaultId) return
    const encrypted = await encryptPayload(task.payload, vaultKey)
    if (navigator.onLine) {
      try {
        const result = await updateTaskAction({
          id: task.id,
          listId: task.listId,
          payloadCiphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          version: task.version,
        })
        if ("version" in result && typeof result.version === "number") {
          setTasks((prev) =>
            prev.map((item) =>
              item.id === task.id ? { ...item, version: result.version! } : item
            )
          )
        } else if (result.error) {
          console.warn(result.error)
        }
      } catch (error) {
        console.warn(error)
      }
    } else {
      await enqueueSyncJob("UPDATE_TASK", {
        id: task.id,
        listId: task.listId,
        payloadCiphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        version: task.version,
      })
      const existing = await getCachedTasks(vaultId)
      await setCachedTasks(
        vaultId,
        existing.map((row) =>
          row.id === task.id
            ? {
                ...row,
                listId: task.listId,
                payloadCiphertext: encrypted.ciphertext,
                iv: encrypted.iv,
                version: task.version + 1,
                updatedAt: new Date(),
              }
            : row
        )
      )
      void flushSyncQueue()
    }
  }

  async function moveTask(
    activeTaskId: string,
    targetColumnId: string,
    beforeTaskId: string | null
  ) {
    if (!vaultKey) return
    const resolvedListId =
      targetColumnId === UNCATEGORIZED_ID ? null : targetColumnId
    const active = tasks.find((task) => task.id === activeTaskId)
    if (!active) return
    const without = tasks.filter((task) => task.id !== activeTaskId)
    const column = sortTasksByOrder(
      without.filter(
        (task) =>
          effectiveListId(task) === targetColumnId &&
          task.parentId === null
      )
    )
    let insertAt = column.length
    if (beforeTaskId) {
      const index = column.findIndex((task) => task.id === beforeTaskId)
      insertAt = index < 0 ? column.length : index
    }
    const prevOrder = insertAt > 0 ? column[insertAt - 1].payload.order : null
    const nextOrder =
      insertAt < column.length ? column[insertAt].payload.order : null
    const updatedActive: DecryptedTask = {
      ...active,
      listId: resolvedListId,
      payload: { ...active.payload, order: orderForInsert(prevOrder, nextOrder) },
    }
    const newColumn = [
      ...column.slice(0, insertAt),
      updatedActive,
      ...column.slice(insertAt),
    ]
    const rebalanced = rebalanceOrders(
      newColumn.map((task) => ({ id: task.id, order: task.payload.order }))
    )
    const finalColumn = rebalanced
      ? newColumn.map((task) =>
          rebalanced.has(task.id)
            ? {
                ...task,
                payload: {
                  ...task.payload,
                  order: rebalanced.get(task.id) as number,
                },
              }
            : task
        )
      : newColumn

    const others = without.filter(
      (task) => effectiveListId(task) !== targetColumnId
    )
    setTasks([...others, ...finalColumn])

    const changed = finalColumn.filter(
      (task) => task.id === activeTaskId || (rebalanced?.has(task.id) ?? false)
    )
    for (const task of changed) {
      void persistTaskUpdate(task)
    }
    broadcastMessage({ type: "CACHE_INVALIDATED" })
  }

  async function createTask(
    title: string,
    listId: string,
    parentId?: string | null,
    override?: Partial<DecryptedTaskPayload>
  ) {
    if (!vaultKey || !vaultId) return
    const resolvedListId = listId === UNCATEGORIZED_ID ? null : listId
    const resolvedParentId = parentId ?? null
    const order = nextOrderInList(
      tasks.filter(
        (task) =>
          (task.listId ?? null) === resolvedListId && task.parentId === null
      )
    )
    const payload: DecryptedTaskPayload = {
      title,
      order,
      priority: "none",
      ...override,
    }
    const encrypted = await encryptPayload(payload, vaultKey)

    if (navigator.onLine) {
      const result = await createTaskAction({
        vaultId,
        listId: resolvedListId,
        parentId: resolvedParentId,
        payloadCiphertext: encrypted.ciphertext,
        iv: encrypted.iv,
      })
      if (result.error || !("newTask" in result) || !result.newTask) return
      const row = result.newTask
      setTasks((prev) => [
        ...prev,
        {
          id: row.id,
          vaultId: row.vaultId,
          ownerId: row.ownerId,
          listId: row.listId,
          parentId: row.parentId,
          deletedAt: row.deletedAt,
          version: row.version,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          payload,
        },
      ])
    } else {
      const id = crypto.randomUUID()
      await enqueueSyncJob("CREATE_TASK", {
        id,
        vaultId,
        listId: resolvedListId,
        parentId: resolvedParentId,
        payloadCiphertext: encrypted.ciphertext,
        iv: encrypted.iv,
      })
      setTasks((prev) => [
        ...prev,
        {
          id,
          vaultId,
          ownerId: "",
          listId: resolvedListId,
          parentId: resolvedParentId,
          deletedAt: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          payload,
        },
      ])
      const existing = await getCachedTasks(vaultId)
      await setCachedTasks(vaultId, [
        ...existing,
        {
          id,
          vaultId,
          listId: resolvedListId,
          parentId: resolvedParentId,
          payloadCiphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          cryptoVersion: 1,
          version: 1,
          deletedAt: null,
          updatedAt: new Date(),
        },
      ])
      void flushSyncQueue()
    }
    broadcastMessage({ type: "CACHE_INVALIDATED" })
  }

  function computeNextDueDate(
    dueDate: string,
    recurrence: { freq: "daily" | "weekly" | "monthly"; interval: number }
  ): string {
    const base = new Date(dueDate)
    const interval = Math.max(1, recurrence.interval)
    if (recurrence.freq === "daily") {
      base.setUTCDate(base.getUTCDate() + interval)
    } else if (recurrence.freq === "weekly") {
      base.setUTCDate(base.getUTCDate() + interval * 7)
    } else {
      base.setUTCMonth(base.getUTCMonth() + interval)
    }
    return base.toISOString()
  }

  async function completeTask(task: DecryptedTask) {
    if (!vaultKey) return
    const willComplete = !task.payload.completedAt
    const updated: DecryptedTask = {
      ...task,
      payload: {
        ...task.payload,
        completedAt: willComplete ? new Date().toISOString() : undefined,
      },
    }
    setTasks((prev) =>
      prev.map((item) => (item.id === task.id ? updated : item))
    )
    if (selectedTask?.id === task.id) setSelectedTask(updated)
    await persistTaskUpdate(updated)

    if (
      willComplete &&
      task.payload.recurrence &&
      task.payload.dueDate &&
      task.parentId === null
    ) {
      await createTask(
        task.payload.title,
        task.listId ?? UNCATEGORIZED_ID,
        null,
        {
          description: task.payload.description,
          priority: task.payload.priority,
          tags: task.payload.tags,
          recurrence: task.payload.recurrence,
          startDate: task.payload.startDate,
          dueDate: computeNextDueDate(
            task.payload.dueDate,
            task.payload.recurrence
          ),
        }
      )
    }
    broadcastMessage({ type: "CACHE_INVALIDATED" })
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((task) => task.id !== id))
    if (selectedTask?.id === id) setDetailOpen(false)
    if (navigator.onLine) {
      await softDeleteTaskAction(id)
    } else {
      await enqueueSyncJob("DELETE_TASK", { id })
      void flushSyncQueue()
    }
    broadcastMessage({ type: "CACHE_INVALIDATED" })
  }

  async function createList(name: string, sortOrder?: number, color?: string) {
    if (!vaultKey || !vaultId) return
    const payload: DecryptedTaskListPayload = { name, color, listType: "todo" }
    const encrypted = await encryptPayload(payload, vaultKey)
    const order =
      sortOrder ??
      (taskLists.length > 0
        ? Math.max(...taskLists.map((list) => list.sortOrder)) + 1
        : 1)

    if (navigator.onLine) {
      const result = await createTaskListAction({
        vaultId,
        sortOrder: order,
        payloadCiphertext: encrypted.ciphertext,
        iv: encrypted.iv,
      })
      if (result.error || !("newTaskList" in result) || !result.newTaskList)
        return
      const row = result.newTaskList
      setTaskLists((prev) => [
        ...prev,
        {
          id: row.id,
          vaultId: row.vaultId,
          ownerId: row.ownerId,
          sortOrder: row.sortOrder,
          deletedAt: row.deletedAt,
          version: row.version,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          payload,
        },
      ])
    } else {
      const id = crypto.randomUUID()
      await enqueueSyncJob("CREATE_TASK_LIST", {
        id,
        vaultId,
        sortOrder: order,
        payloadCiphertext: encrypted.ciphertext,
        iv: encrypted.iv,
      })
      setTaskLists((prev) => [
        ...prev,
        {
          id,
          vaultId,
          ownerId: "",
          sortOrder: order,
          deletedAt: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          payload,
        },
      ])
      const existing = await getCachedTaskLists(vaultId)
      await setCachedTaskLists(vaultId, [
        ...existing,
        {
          id,
          vaultId,
          payloadCiphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          cryptoVersion: 1,
          sortOrder: order,
          version: 1,
          deletedAt: null,
          updatedAt: new Date(),
        },
      ])
      void flushSyncQueue()
    }
    broadcastMessage({ type: "CACHE_INVALIDATED" })
  }

  async function renameList(listId: string, name: string) {
    if (!vaultKey) return
    const list = taskLists.find((item) => item.id === listId)
    if (!list) return
    const payload = { ...list.payload, name }
    const encrypted = await encryptPayload(payload, vaultKey)
    setTaskLists((prev) =>
      prev.map((item) => (item.id === listId ? { ...item, payload } : item))
    )
    if (navigator.onLine) {
      const result = await updateTaskListAction({
        id: listId,
        sortOrder: list.sortOrder,
        payloadCiphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        version: list.version,
      })
      if ("version" in result && typeof result.version === "number") {
        setTaskLists((prev) =>
          prev.map((item) =>
            item.id === listId ? { ...item, version: result.version! } : item
          )
        )
      } else if (result.error) {
        console.warn(result.error)
      }
    } else {
      await enqueueSyncJob("UPDATE_TASK_LIST", {
        id: listId,
        sortOrder: list.sortOrder,
        payloadCiphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        version: list.version,
      })
      const existing = await getCachedTaskLists(vaultId!)
      await setCachedTaskLists(
        vaultId!,
        existing.map((row) =>
          row.id === listId
            ? {
                ...row,
                payloadCiphertext: encrypted.ciphertext,
                iv: encrypted.iv,
                version: list.version + 1,
                updatedAt: new Date(),
              }
            : row
        )
      )
      void flushSyncQueue()
    }
    broadcastMessage({ type: "CACHE_INVALIDATED" })
  }

  async function deleteList(listId: string) {
    if (listId === UNCATEGORIZED_ID) return
    setTaskLists((prev) => prev.filter((item) => item.id !== listId))
    if (navigator.onLine) {
      await softDeleteTaskListAction(listId)
    } else {
      await enqueueSyncJob("DELETE_TASK_LIST", { id: listId })
      void flushSyncQueue()
    }
    broadcastMessage({ type: "CACHE_INVALIDATED" })
  }

  function handleOpenTask(task: DecryptedTask) {
    setSelectedTask(
      tasks.find((item) => item.id === task.id) ?? task
    )
    setDetailOpen(true)
  }

  const hasAny = tasks.length > 0 || taskLists.length > 0
  const selectedListName =
    selectedTask && selectedTask.listId
      ? taskLists.find((list) => list.id === selectedTask.listId)?.payload.name ??
        null
      : null

  return (
    <div className="flex h-full flex-col space-y-4 p-4 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            My Tasks
          </h1>
          <p className="text-sm text-muted-foreground">
            {hasAny ? (
              <>
                <span className="font-medium text-foreground">
                  {tasks.filter((t) => t.parentId === null).length}
                </span>{" "}
                tasks ·{" "}
                <span className="font-medium text-foreground">
                  {taskLists.length}
                </span>{" "}
                lists
              </>
            ) : (
              "Encrypted kanban board for your daily tasks"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasAny && (
            <div className="flex items-center rounded-lg border bg-card p-0.5">
              {VIEW_OPTIONS.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-label={option.label}
                    onClick={() => setView(option.id)}
                    className={cn(
                      "flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors",
                      view === option.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                )
              })}
            </div>
          )}
          <CreateTaskDialog
            editTask={editingTask}
            taskLists={taskLists}
            defaultListId={taskLists[0]?.id ?? null}
            tasks={tasks}
            onSaved={() => {
              setEditingTask(null)
              broadcastMessage({ type: "CACHE_INVALIDATED" })
              loadData()
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Decrypting tasks in secure memory...
        </div>
      ) : !hasAny ? (
        <Card className="border-dashed py-16 text-center">
          <CardHeader className="items-center gap-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ListTodo className="size-6" />
            </div>
            <CardTitle className="text-lg">No tasks yet</CardTitle>
            <CardDescription className="mx-auto max-w-sm">
              Your default lists are being prepared. Create your first task to
              get started, or add a new list.
            </CardDescription>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => void createList("New List")}
            >
              <Plus className="size-4" /> Add list
            </Button>
          </CardHeader>
        </Card>
      ) : view === "board" ? (
        <KanbanBoard
          columns={columns}
          now={now}
          subtaskCounts={subtaskCounts}
          onOpenTask={handleOpenTask}
          onQuickAdd={createTask}
          onRename={renameList}
          onDelete={deleteList}
          onMoveTask={moveTask}
          onAddListClick={() => void createList("New List")}
        />
      ) : view === "list" ? (
        <TaskListView
          columns={columns}
          now={now}
          onOpenTask={handleOpenTask}
          onToggleComplete={completeTask}
        />
      ) : (
        <TaskCalendarView
          tasks={tasks.filter((task) => task.parentId === null)}
          now={now}
          onOpenTask={handleOpenTask}
        />
      )}

      <TaskDetailDialog
        task={selectedTask}
        now={now}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        listName={selectedListName}
        subtasks={selectedSubtasks}
        onAddSubtask={handleAddSubtask}
        onToggleSubtask={completeTask}
        onToggleComplete={completeTask}
        onEdit={(task) => setEditingTask(task)}
        onDelete={deleteTask}
      />
    </div>
  )
}

export default function TasksDashboardPage() {
  return (
    <VaultGuard>
      <TasksContent />
    </VaultGuard>
  )
}
