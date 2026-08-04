import type { CachedProjectRow } from "@/lib/types/project"
import type { CachedNoteRow } from "@/lib/types/note"

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

export async function clearVaultCache(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(
      [
        "credentials_cache",
        "types_cache",
        "projects_cache",
        "notes_cache",
        "vault_meta",
      ],
      "readwrite"
    )
    tx.objectStore("credentials_cache").clear()
    tx.objectStore("types_cache").clear()
    tx.objectStore("projects_cache").clear()
    tx.objectStore("notes_cache").clear()
    tx.objectStore("vault_meta").clear()
  } catch (err) {
    console.warn("IndexedDB cache clear warning:", err)
  }
}

// -- Sync Queue --
export interface SyncJob {
  id: string
  action: "CREATE_NOTE" | "UPDATE_NOTE" | "DELETE_NOTE" | "CREATE_CREDENTIAL" | "UPDATE_CREDENTIAL" | "DELETE_CREDENTIAL" | "CREATE_TYPE" | "ARCHIVE_TYPE"
  payload: any
  timestamp: number
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

