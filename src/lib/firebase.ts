import { initializeApp, getApps, getApp, setLogLevel } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

import config from "../../firebase-applet-config.json";

// Silence unnecessary transient network connection warnings from Firestore SDK
try {
  setLogLevel("silent" as any);
} catch {
  // ignore
}

export const app = getApps().length === 0 ? initializeApp(config) : getApp();

const dbId = (config as any)?.firestoreDatabaseId && (config as any)?.firestoreDatabaseId !== "(default)"
  ? (config as any).firestoreDatabaseId
  : undefined;

export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
export const auth = getAuth(app);

let quotaExceeded = false;

export function isFirestoreQuotaExceeded() {
  return quotaExceeded;
}

export function handleQuotaExceeded() {
  quotaExceeded = true;
}

export async function safeFirestoreWrite<T>(writeFn: () => Promise<T>): Promise<T | null> {
  if (quotaExceeded) return null;
  try {
    return await writeFn();
  } catch (error: any) {
    if (
      error?.code === "resource-exhausted" ||
      error?.message?.includes("Quota exceeded") ||
      error?.message?.includes("Quota limit exceeded")
    ) {
      handleQuotaExceeded();
    }
    console.warn("Firestore safe write error:", error);
    return null;
  }
}
