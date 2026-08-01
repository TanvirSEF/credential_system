const DB_NAME = "spv_vault_cache";
const DB_VERSION = 1;

export interface CachedCredentialRow {
  id: string;
  vaultId: string;
  typeId: string | null;
  payloadCiphertext: string;
  iv: string;
  cryptoVersion: number;
  version: number;
  deletedAt: Date | null;
  updatedAt: Date;
}

export interface CachedTypeRow {
  id: string;
  vaultId: string;
  parentId: string | null;
  payloadCiphertext: string;
  iv: string;
  cryptoVersion: number;
  sortOrder: number;
  archivedAt: Date | null;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB unavailable"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("credentials_cache")) {
        db.createObjectStore("credentials_cache", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("types_cache")) {
        db.createObjectStore("types_cache", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("vault_meta")) {
        db.createObjectStore("vault_meta", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function setCachedCredentials(vaultId: string, rows: CachedCredentialRow[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(["credentials_cache"], "readwrite");
    const store = tx.objectStore("credentials_cache");

    store.clear();
    for (const row of rows) {
      store.put(row);
    }
  } catch (err) {
    console.warn("IndexedDB cache save warning:", err);
  }
}

export async function getCachedCredentials(vaultId: string): Promise<CachedCredentialRow[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(["credentials_cache"], "readonly");
      const store = tx.objectStore("credentials_cache");
      const req = store.getAll();

      req.onsuccess = () => {
        const rows = (req.result as CachedCredentialRow[]) || [];
        resolve(rows.filter((r) => r.vaultId === vaultId));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function setCachedTypes(vaultId: string, rows: CachedTypeRow[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(["types_cache"], "readwrite");
    const store = tx.objectStore("types_cache");

    store.clear();
    for (const row of rows) {
      store.put(row);
    }
  } catch (err) {
    console.warn("IndexedDB cache save warning:", err);
  }
}

export async function getCachedTypes(vaultId: string): Promise<CachedTypeRow[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(["types_cache"], "readonly");
      const store = tx.objectStore("types_cache");
      const req = store.getAll();

      req.onsuccess = () => {
        const rows = (req.result as CachedTypeRow[]) || [];
        resolve(rows.filter((r) => r.vaultId === vaultId));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function clearVaultCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(["credentials_cache", "types_cache", "vault_meta"], "readwrite");
    tx.objectStore("credentials_cache").clear();
    tx.objectStore("types_cache").clear();
    tx.objectStore("vault_meta").clear();
  } catch (err) {
    console.warn("IndexedDB cache clear warning:", err);
  }
}
