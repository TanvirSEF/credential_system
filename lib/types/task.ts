export type TaskPriority = "urgent" | "high" | "medium" | "low" | "none"

export type TaskListType = "todo" | "in_progress" | "done" | "closed"

export interface TaskRecurrence {
  freq: "daily" | "weekly" | "monthly"
  interval: number
  until?: string
}

export interface DecryptedTaskListPayload {
  name: string
  color?: string
  listType?: TaskListType
  wipLimit?: number
  collapsed?: boolean
}

export interface DecryptedTaskPayload {
  title: string
  description?: string
  order: number
  priority?: TaskPriority
  startDate?: string
  scheduledAt?: string
  dueDate?: string
  timeEstimate?: number
  timeSpent?: number
  tags?: string[]
  favorite?: boolean
  completedAt?: string
  recurrence?: TaskRecurrence
  customFields?: Record<string, unknown>
}

export interface DecryptedTaskList {
  id: string
  vaultId: string
  ownerId: string
  sortOrder: number
  deletedAt: Date | null
  payload: DecryptedTaskListPayload
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface DecryptedTask {
  id: string
  vaultId: string
  ownerId: string
  listId: string | null
  parentId: string | null
  deletedAt: Date | null
  payload: DecryptedTaskPayload
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface CachedTaskListRow {
  id: string
  vaultId: string
  payloadCiphertext: string
  iv: string
  cryptoVersion: number
  sortOrder: number
  version: number
  deletedAt: Date | null
  updatedAt: Date
}

export interface CachedTaskRow {
  id: string
  vaultId: string
  listId: string | null
  parentId: string | null
  payloadCiphertext: string
  iv: string
  cryptoVersion: number
  version: number
  deletedAt: Date | null
  updatedAt: Date
}
