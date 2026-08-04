import {
  getSyncJobs,
  removeSyncJob,
  type SyncJob,
} from "@/lib/storage/indexed-db"
import {
  createNoteAction,
  updateNoteAction,
  softDeleteNoteAction,
} from "@/lib/actions/notes"
import {
  createCredentialAction,
  updateCredentialAction,
  softDeleteCredentialAction,
} from "@/lib/actions/credentials"
import {
  createCredentialTypeAction,
  archiveCredentialTypeAction,
} from "@/lib/actions/credential-types"
import {
  createProjectAction,
  updateProjectAction,
  softDeleteProjectAction,
} from "@/lib/actions/projects"

let isSyncing = false

export async function flushSyncQueue() {
  if (isSyncing) return
  if (typeof navigator !== "undefined" && !navigator.onLine) return

  isSyncing = true
  try {
    const jobs = await getSyncJobs()
    if (jobs.length === 0) {
      isSyncing = false
      return
    }

    for (const job of jobs) {
      if (typeof navigator !== "undefined" && !navigator.onLine) break

      try {
        await processJob(job)
        await removeSyncJob(job.id)
      } catch (err) {
        console.error("Failed to process sync job:", job, err)
        break
      }
    }
  } finally {
    isSyncing = false
  }
}

async function processJob(job: SyncJob) {
  switch (job.action) {
    case "CREATE_NOTE": {
      const res = await createNoteAction({
        id: job.payload.id,
        vaultId: job.payload.vaultId,
        payloadCiphertext: job.payload.payloadCiphertext,
        iv: job.payload.iv,
      })
      if (res.error) throw new Error(res.error)
      break
    }
    case "UPDATE_NOTE": {
      const res = await updateNoteAction({
        id: job.payload.id,
        payloadCiphertext: job.payload.payloadCiphertext,
        iv: job.payload.iv,
        version: job.payload.version,
      })
      if (res.error) throw new Error(res.error)
      break
    }
    case "DELETE_NOTE": {
      const res = await softDeleteNoteAction(job.payload.id)
      if (res.error) throw new Error(res.error)
      break
    }
    case "CREATE_CREDENTIAL": {
      const res = await createCredentialAction({
        id: job.payload.id,
        vaultId: job.payload.vaultId,
        typeId: job.payload.typeId,
        payloadCiphertext: job.payload.payloadCiphertext,
        iv: job.payload.iv,
      })
      if (res.error) throw new Error(res.error)
      break
    }
    case "UPDATE_CREDENTIAL": {
      const res = await updateCredentialAction({
        id: job.payload.id,
        typeId: job.payload.typeId,
        payloadCiphertext: job.payload.payloadCiphertext,
        iv: job.payload.iv,
        version: job.payload.version,
      })
      if (res.error) throw new Error(res.error)
      break
    }
    case "DELETE_CREDENTIAL": {
      const res = await softDeleteCredentialAction(job.payload.id)
      if (res.error) throw new Error(res.error)
      break
    }
    case "CREATE_TYPE": {
      const res = await createCredentialTypeAction({
        id: job.payload.id,
        vaultId: job.payload.vaultId,
        parentId: job.payload.parentId,
        payloadCiphertext: job.payload.payloadCiphertext,
        iv: job.payload.iv,
        sortOrder: job.payload.sortOrder,
      })
      if (res.error) throw new Error(res.error)
      break
    }
    case "ARCHIVE_TYPE": {
      const res = await archiveCredentialTypeAction(job.payload.id)
      if (res.error) throw new Error(res.error)
      break
    }
    case "CREATE_PROJECT": {
      const res = await createProjectAction({
        id: job.payload.id,
        vaultId: job.payload.vaultId,
        payloadCiphertext: job.payload.payloadCiphertext,
        iv: job.payload.iv,
      })
      if (res.error) throw new Error(res.error)
      break
    }
    case "UPDATE_PROJECT": {
      const res = await updateProjectAction({
        id: job.payload.id,
        payloadCiphertext: job.payload.payloadCiphertext,
        iv: job.payload.iv,
        version: job.payload.version,
      })
      if (res.error) throw new Error(res.error)
      break
    }
    case "DELETE_PROJECT": {
      const res = await softDeleteProjectAction(job.payload.id)
      if (res.error) throw new Error(res.error)
      break
    }
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushSyncQueue()
  })
}
