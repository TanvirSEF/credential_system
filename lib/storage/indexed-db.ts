import type { CachedProjectRow } from "@/lib/types/project"
import type { CachedNoteRow } from "@/lib/types/note"
import type { CachedTaskRow, CachedTaskListRow } from "@/lib/types/task"

const DB_NAME = "spv_vault_cache"

export interface CachedCredentialRow {
  id: string
  vaultId: string
  typeId: string | null
  payloadCiphertext: string
  iv: string
  cryptoVersion: number
  version: number
  deletedAt: Date | null
  updatedAt: Date
}

export interface CachedTypeRow {
  id: string
  vaultId: string
  parentId: string | null
  payloadCiphertext: string
  iv: string
  cryptoVersion: number
  sortOrder: number
  archivedAt: Date | null
}

const REQUIRED_STORES = [
  "credentials_cache",
  "types_cache",
  "vault_meta",
  "projects_cache",
  "notes_cache",
  "tasks_cache",
  "task_lists_cache",
  "offline_sync_queue",
]

function createStores(db: IDBDatabase) {
  if (!db.objectStoreNames.contains("credentials_cache")) {
    db.createObjectStore("credentials_cache", { keyPath: "id" })
  }
  if (!db.objectStoreNames.contains("types_cache")) {
    db.createObjectStore("types_cache", { keyPath: "id" })
  }
  if (!db.objectStoreNames.contains("vault_meta")) {
    db.createObjectStore("vault_meta", { keyPath: "key" })
  }
  if (!db.objectStoreNames.contains("projects_cache")) {
    db.createObjectStore("projects_cache", { keyPath: "id" })
  }
  if (!db.objectStoreNames.contains("notes_cache")) {
    db.createObjectStore("notes_cache", { keyPath: "id" })
  }
  if (!db.objectStoreNames.contains("tasks_cache")) {
    db.createObjectStore("tasks_cache", { keyPath: "id" })
  }
  if (!db.objectStoreNames.contains("task_lists_cache")) {
    db.createObjectStore("task_lists_cache", { keyPath: "id" })
  }
  if (!db.objectStoreNames.contains("offline_sync_queue")) {
    db.createObjectStore("offline_sync_queue", { keyPath: "id" })
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB unavailable"))
    }

    const request = indexedDB.open(DB_NAME)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      createStores(db)
    }

    request.onsuccess = () => {
      const db = request.result
      const hasAll = REQUIRED_STORES.every((name) =>
        db.objectStoreNames.contains(name)
      )
      if (hasAll) {
        resolve(db)
        return
      }
      db.close()
      const upgrade = indexedDB.open(DB_NAME, db.version + 1)
      upgrade.onupgradeneeded = (event) => {
        createStores((event.target as IDBOpenDBRequest).result)
      }
      upgrade.onsuccess = () => resolve(upgrade.result)
      upgrade.onerror = () => reject(upgrade.error)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function setCachedCredentials(
  vaultId: string,
  rows: CachedCredentialRow[]
): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["credentials_cache"], "readwrite")
      const store = tx.objectStore("credentials_cache")
      const req = store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          if (cursor.value.vaultId === vaultId) cursor.delete()
          cursor.continue()
        } else {
          for (const row of rows) store.put(row)
        }
      }
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn("IndexedDB cache save warning:", err)
  }
}

export async function getCachedCredentials(
  vaultId: string
): Promise<CachedCredentialRow[]> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(["credentials_cache"], "readonly")
      const store = tx.objectStore("credentials_cache")
      const req = store.getAll()

      req.onsuccess = () => {
        const rows = (req.result as CachedCredentialRow[]) || []
        resolve(rows.filter((r) => r.vaultId === vaultId))
      }
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function setCachedTypes(
  vaultId: string,
  rows: CachedTypeRow[]
): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["types_cache"], "readwrite")
      const store = tx.objectStore("types_cache")
      const req = store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          if (cursor.value.vaultId === vaultId) cursor.delete()
          cursor.continue()
        } else {
          for (const row of rows) store.put(row)
        }
      }
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn("IndexedDB cache save warning:", err)
  }
}

export async function getCachedTypes(
  vaultId: string
): Promise<CachedTypeRow[]> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(["types_cache"], "readonly")
      const store = tx.objectStore("types_cache")
      const req = store.getAll()

      req.onsuccess = () => {
        const rows = (req.result as CachedTypeRow[]) || []
        resolve(rows.filter((r) => r.vaultId === vaultId))
      }
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function setCachedProjects(
  vaultId: string,
  rows: CachedProjectRow[]
): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["projects_cache"], "readwrite")
      const store = tx.objectStore("projects_cache")
      const req = store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          if (cursor.value.vaultId === vaultId) cursor.delete()
          cursor.continue()
        } else {
          for (const row of rows) store.put(row)
        }
      }
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn("IndexedDB cache save warning:", err)
  }
}

export async function getCachedProjects(
  vaultId: string
): Promise<CachedProjectRow[]> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(["projects_cache"], "readonly")
      const store = tx.objectStore("projects_cache")
      const req = store.getAll()

      req.onsuccess = () => {
        const rows = (req.result as CachedProjectRow[]) || []
        resolve(rows.filter((r) => r.vaultId === vaultId))
      }
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function setCachedNotes(
  vaultId: string,
  rows: CachedNoteRow[]
): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["notes_cache"], "readwrite")
      const store = tx.objectStore("notes_cache")
      const req = store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          if (cursor.value.vaultId === vaultId) cursor.delete()
          cursor.continue()
        } else {
          for (const row of rows) store.put(row)
        }
      }
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn("IndexedDB cache save warning:", err)
  }
}

export async function getCachedNotes(
  vaultId: string
): Promise<CachedNoteRow[]> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(["notes_cache"], "readonly")
      const store = tx.objectStore("notes_cache")
      const req = store.getAll()

      req.onsuccess = () => {
        const rows = (req.result as CachedNoteRow[]) || []
        resolve(rows.filter((r) => r.vaultId === vaultId))
      }
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function setCachedTasks(
  vaultId: string,
  rows: CachedTaskRow[]
): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["tasks_cache"], "readwrite")
      const store = tx.objectStore("tasks_cache")
      const req = store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          if (cursor.value.vaultId === vaultId) cursor.delete()
          cursor.continue()
        } else {
          for (const row of rows) store.put(row)
        }
      }
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn("IndexedDB cache save warning:", err)
  }
}

export async function getCachedTasks(
  vaultId: string
): Promise<CachedTaskRow[]> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(["tasks_cache"], "readonly")
      const store = tx.objectStore("tasks_cache")
      const req = store.getAll()

      req.onsuccess = () => {
        const rows = (req.result as CachedTaskRow[]) || []
        resolve(rows.filter((r) => r.vaultId === vaultId))
      }
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function setCachedTaskLists(
  vaultId: string,
  rows: CachedTaskListRow[]
): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["task_lists_cache"], "readwrite")
      const store = tx.objectStore("task_lists_cache")
      const req = store.openCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          if (cursor.value.vaultId === vaultId) cursor.delete()
          cursor.continue()
        } else {
          for (const row of rows) store.put(row)
        }
      }
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn("IndexedDB cache save warning:", err)
  }
}

export async function getCachedTaskLists(
  vaultId: string
): Promise<CachedTaskListRow[]> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(["task_lists_cache"], "readonly")
      const store = tx.objectStore("task_lists_cache")
      const req = store.getAll()

      req.onsuccess = () => {
        const rows = (req.result as CachedTaskListRow[]) || []
        resolve(rows.filter((r) => r.vaultId === vaultId))
      }
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function clearVaultCache(): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        [
          "credentials_cache",
          "types_cache",
          "projects_cache",
          "notes_cache",
          "tasks_cache",
          "task_lists_cache",
          "vault_meta",
          "offline_sync_queue",
        ],
        "readwrite"
      )
      tx.objectStore("credentials_cache").clear()
      tx.objectStore("types_cache").clear()
      tx.objectStore("projects_cache").clear()
      tx.objectStore("notes_cache").clear()
      tx.objectStore("tasks_cache").clear()
      tx.objectStore("task_lists_cache").clear()
      tx.objectStore("vault_meta").clear()
      tx.objectStore("offline_sync_queue").clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } catch (err) {
    console.warn("IndexedDB cache clear warning:", err)
  }
}

// -- Sync Queue --
export interface SyncJobPayloadMap {
  CREATE_NOTE: {
    id: string
    vaultId: string
    payloadCiphertext: string
    iv: string
  }
  UPDATE_NOTE: {
    id: string
    payloadCiphertext: string
    iv: string
    version: number
  }
  DELETE_NOTE: { id: string }
  CREATE_CREDENTIAL: {
    id: string
    vaultId: string
    typeId?: string
    payloadCiphertext: string
    iv: string
  }
  UPDATE_CREDENTIAL: {
    id: string
    typeId?: string
    payloadCiphertext: string
    iv: string
    version: number
  }
  DELETE_CREDENTIAL: { id: string }
  CREATE_TYPE: {
    id: string
    vaultId: string
    parentId?: string
    payloadCiphertext: string
    iv: string
    sortOrder: number
  }
  ARCHIVE_TYPE: { id: string }
  CREATE_PROJECT: {
    id: string
    vaultId: string
    payloadCiphertext: string
    iv: string
  }
  UPDATE_PROJECT: {
    id: string
    payloadCiphertext: string
    iv: string
    version: number
  }
  DELETE_PROJECT: { id: string }
  CREATE_TASK: {
    id: string
    vaultId: string
    listId?: string | null
    parentId?: string | null
    payloadCiphertext: string
    iv: string
  }
  UPDATE_TASK: {
    id: string
    listId?: string | null
    parentId?: string | null
    payloadCiphertext: string
    iv: string
    version: number
  }
  DELETE_TASK: { id: string }
  CREATE_TASK_LIST: {
    id: string
    vaultId: string
    sortOrder: number
    payloadCiphertext: string
    iv: string
  }
  UPDATE_TASK_LIST: {
    id: string
    sortOrder?: number
    payloadCiphertext: string
    iv: string
    version: number
  }
  DELETE_TASK_LIST: { id: string }
}

export type SyncJob = {
  [Action in keyof SyncJobPayloadMap]: {
    id: string
    action: Action
    payload: SyncJobPayloadMap[Action]
    timestamp: number
  }
}[keyof SyncJobPayloadMap]

let lastSyncTimestamp = 0

function nextSyncTimestamp(): number {
  lastSyncTimestamp = Math.max(Date.now(), lastSyncTimestamp + 1)
  return lastSyncTimestamp
}

export async function enqueueSyncJob<Action extends keyof SyncJobPayloadMap>(
  action: Action,
  payload: SyncJobPayloadMap[Action]
): Promise<void> {
  await addSyncJob({
    id: crypto.randomUUID(),
    action,
    payload,
    timestamp: nextSyncTimestamp(),
  } as Extract<SyncJob, { action: Action }>)
}

export async function addSyncJob(job: SyncJob): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["offline_sync_queue"], "readwrite")
      const store = tx.objectStore("offline_sync_queue")
      const req = store.put(job)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn("Failed to add sync job:", err)
  }
}

export async function getSyncJobs(): Promise<SyncJob[]> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(["offline_sync_queue"], "readonly")
      const store = tx.objectStore("offline_sync_queue")
      const req = store.getAll()
      req.onsuccess = () => {
        const jobs = (req.result as SyncJob[]) || []
        resolve(jobs.sort((a, b) => a.timestamp - b.timestamp))
      }
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function removeSyncJob(id: string): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["offline_sync_queue"], "readwrite")
      const store = tx.objectStore("offline_sync_queue")
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn("Failed to remove sync job:", err)
  }
}
