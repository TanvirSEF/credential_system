"use client"

import { fetchCredentialsAction } from "@/lib/actions/credentials"
import { fetchCredentialTypesAction } from "@/lib/actions/credential-types"
import { fetchDocumentsAction } from "@/lib/actions/documents"
import { fetchNotesAction } from "@/lib/actions/notes"
import { fetchProjectsAction } from "@/lib/actions/projects"
import { fetchTasksAction } from "@/lib/actions/tasks"
import { fetchTaskListsAction } from "@/lib/actions/task-lists"
import { decryptPayload } from "@/lib/crypto"
import type {
  DecryptedCredential,
  DecryptedCredentialPayload,
} from "@/lib/types/credential"
import type {
  CredentialTypePayload,
  DecryptedCredentialType,
} from "@/lib/types/credential-template"
import type {
  DecryptedDocument,
  DecryptedDocumentMetadata,
} from "@/lib/types/document"
import type { DecryptedNote, DecryptedNotePayload } from "@/lib/types/note"
import type {
  DecryptedProject,
  DecryptedProjectPayload,
} from "@/lib/types/project"
import type {
  DecryptedTask,
  DecryptedTaskList,
  DecryptedTaskListPayload,
  DecryptedTaskPayload,
} from "@/lib/types/task"

export interface DecryptedVaultIndex {
  credentials: DecryptedCredential[]
  types: DecryptedCredentialType[]
  projects: DecryptedProject[]
  notes: DecryptedNote[]
  documents: DecryptedDocument[]
  tasks: DecryptedTask[]
  taskLists: DecryptedTaskList[]
}

export async function loadDecryptedVaultIndex(
  vaultId: string,
  vaultKey: CryptoKey
): Promise<DecryptedVaultIndex> {
  const [
    credentialsResult,
    typesResult,
    projectsResult,
    notesResult,
    documentsResult,
    tasksResult,
    taskListsResult,
  ] = await Promise.all([
    fetchCredentialsAction(vaultId),
    fetchCredentialTypesAction(vaultId),
    fetchProjectsAction(vaultId),
    fetchNotesAction(vaultId),
    fetchDocumentsAction(vaultId),
    fetchTasksAction(vaultId),
    fetchTaskListsAction(vaultId),
  ])

  const firstError = [
    credentialsResult.error,
    typesResult.error,
    projectsResult.error,
    notesResult.error,
    documentsResult.error,
    tasksResult.error,
    taskListsResult.error,
  ].find(Boolean)
  if (firstError) throw new Error(firstError)

  const [credentials, types, projects, notes, documents, tasks, taskLists] =
    await Promise.all([
      Promise.all(
        credentialsResult.credentials.map(async (row) => ({
          id: row.id,
          vaultId: row.vaultId,
          ownerId: row.ownerId,
          typeId: row.typeId,
          deletedAt: row.deletedAt,
          version: row.version,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          payload: await decryptPayload<DecryptedCredentialPayload>(
            {
              ciphertext: row.payloadCiphertext,
              iv: row.iv,
              cryptoVersion: row.cryptoVersion,
              schemaVersion: row.schemaVersion,
            },
            vaultKey
          ),
        }))
      ),
      Promise.all(
        typesResult.types.map(async (row) => ({
          id: row.id,
          vaultId: row.vaultId,
          ownerId: row.ownerId,
          parentId: row.parentId,
          sortOrder: row.sortOrder,
          archivedAt: row.archivedAt,
          payload: await decryptPayload<CredentialTypePayload>(
            {
              ciphertext: row.payloadCiphertext,
              iv: row.iv,
              cryptoVersion: row.cryptoVersion,
              schemaVersion: row.schemaVersion,
            },
            vaultKey
          ),
        }))
      ),
      Promise.all(
        projectsResult.projects.map(async (row) => ({
          id: row.id,
          vaultId: row.vaultId,
          ownerId: row.ownerId,
          deletedAt: row.deletedAt,
          version: row.version,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          payload: await decryptPayload<DecryptedProjectPayload>(
            {
              ciphertext: row.payloadCiphertext,
              iv: row.iv,
              cryptoVersion: row.cryptoVersion,
              schemaVersion: row.schemaVersion,
            },
            vaultKey
          ),
        }))
      ),
      Promise.all(
        notesResult.notes.map(async (row) => ({
          id: row.id,
          vaultId: row.vaultId,
          ownerId: row.ownerId,
          deletedAt: row.deletedAt,
          version: row.version,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          payload: await decryptPayload<DecryptedNotePayload>(
            {
              ciphertext: row.payloadCiphertext,
              iv: row.iv,
              cryptoVersion: row.cryptoVersion,
              schemaVersion: row.schemaVersion,
            },
            vaultKey
          ),
        }))
      ),
      Promise.all(
        documentsResult.documents.map(async (row) => ({
          id: row.id,
          vaultId: row.vaultId,
          ownerId: row.ownerId,
          credentialId: row.credentialId,
          storagePath: row.storagePath,
          ciphertextSha256: row.ciphertextSha256,
          ciphertextSize: row.ciphertextSize,
          uploadStatus: row.uploadStatus,
          deletedAt: row.deletedAt,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          metadata: await decryptPayload<DecryptedDocumentMetadata>(
            {
              ciphertext: row.metadataCiphertext,
              iv: row.metadataIv,
              cryptoVersion: row.cryptoVersion,
              schemaVersion: 1,
            },
            vaultKey
          ),
        }))
      ),
      Promise.all(
        tasksResult.tasks.map(async (row) => ({
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
      ),
      Promise.all(
        taskListsResult.taskLists.map(async (row) => ({
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
      ),
    ])

  return { credentials, types, projects, notes, documents, tasks, taskLists }
}
