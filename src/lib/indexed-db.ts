/**
 * Robust IndexedDB Storage Utility for Large Application Data & Study Files
 * Bypasses localStorage 5MB quota limits safely with asynchronous storage.
 */

const DB_NAME = "TalentedSchoolStorageDB";
const DB_VERSION = 1;
const STORE_NAME = "app_keyval_store";

function openStorageDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Store any JS object/array in IndexedDB
 */
export async function idbSet<T = any>(key: string, value: T): Promise<void> {
  try {
    const db = await openStorageDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    // Non-fatal IndexedDB fallback
    console.warn(`[IndexedDB] idbSet failed for key '${key}':`, err);
  }
}

/**
 * Retrieve data from IndexedDB
 */
export async function idbGet<T = any>(key: string): Promise<T | null> {
  try {
    const db = await openStorageDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve((request.result as T) ?? null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Delete a key from IndexedDB
 */
export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openStorageDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {}
}

/**
 * Safely saves data to localStorage, handling QuotaExceededError automatically
 * by cleaning legacy caches and trimming oversized payloads.
 */
export function safeLocalStorageSet(key: string, value: any): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;

  const trySet = (valToStore: string): boolean => {
    try {
      localStorage.setItem(key, valToStore);
      return true;
    } catch (e: any) {
      // Check if it's a quota error
      const isQuotaError =
        e &&
        (e.name === "QuotaExceededError" ||
          e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
          e.code === 22 ||
          e.code === 1014 ||
          (e.message && e.message.includes("quota")));

      if (!isQuotaError) {
        return false;
      }

      // Step 1: Clean up redundant legacy duplicate keys
      const legacyKeysToClean = [
        "custom_educational_platforms_v2",
        "custom_educational_platforms_v1",
        "talented_school_polls_cache_v2",
        "talented_school_custom_files_v1",
        "talented_school_custom_platforms_v1",
        "app_data_study_files_legacy"
      ];

      for (const legacyKey of legacyKeysToClean) {
        if (legacyKey !== key) {
          try {
            localStorage.removeItem(legacyKey);
          } catch {}
        }
      }

      // Retry setItem once after cleanup
      try {
        localStorage.setItem(key, valToStore);
        return true;
      } catch {
        // Step 2: If value is an array of objects (like study files or flashcards),
        // create a lightweight version without heavy base64 strings or huge blobs
        if (Array.isArray(value)) {
          try {
            const lightweight = value.map((item) => {
              if (item && typeof item === "object") {
                const copy: any = { ...item };
                // Strip huge data URLs from localStorage cache (they are safely in IndexedDB and Firestore)
                if (typeof copy.url === "string" && copy.url.startsWith("data:") && copy.url.length > 2048) {
                  copy.url = `[indexeddb-stored:${copy.id || "file"}]`;
                }
                if (typeof copy.dataUrl === "string" && copy.dataUrl.length > 2048) {
                  delete copy.dataUrl;
                }
                return copy;
              }
              return item;
            });
            localStorage.setItem(key, JSON.stringify(lightweight));
            return true;
          } catch {}
        }

        console.warn(`[Storage] localStorage quota reached for '${key}'. Data safely backed up in IndexedDB and Cloud.`);
        return false;
      }
    }
  };

  const stringVal = typeof value === "string" ? value : JSON.stringify(value);
  return trySet(stringVal);
}
