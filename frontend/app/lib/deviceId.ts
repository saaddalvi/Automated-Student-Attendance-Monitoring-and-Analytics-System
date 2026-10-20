/**
 * Redundant Device ID Storage & Restoration (Phase 3: FR-21, FR-22, FR-23)
 *
 * Implements triple-redundant storage across:
 * 1. localStorage
 * 2. first-party cookie
 * 3. IndexedDB
 *
 * If any one store has the ID and others do not, the client restores the missing ones.
 * If all three are missing, a new UUID is generated and written to all three stores.
 */

const DB_NAME = "attendease_device_db";
const STORE_NAME = "device_store";
const DEVICE_KEY = "deviceId";
const COOKIE_MAX_AGE = 31536000; // 1 year

// ─── Cookie Helpers ────────────────────────────────────────────────────────────

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]+)`));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

// ─── IndexedDB Helpers ────────────────────────────────────────────────────────

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getIndexedDBValue(key: string): Promise<string | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function setIndexedDBValue(key: string, value: string): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

// ─── Redundant ID Synchronization ─────────────────────────────────────────────

/**
 * Ensures deviceId is present and synchronized across localStorage, Cookie, and IndexedDB.
 */
export async function initAndSyncDeviceId(): Promise<string> {
  if (typeof window === "undefined") return "";

  // Read from all 3 stores
  const localId = localStorage.getItem(DEVICE_KEY);
  const cookieId = getCookie(DEVICE_KEY);
  const idbId = await getIndexedDBValue(DEVICE_KEY);

  // Pick first available valid ID
  const candidateId = localId || cookieId || idbId;
  const finalId = candidateId || crypto.randomUUID();

  // Restore/write to missing stores (FR-22, FR-23)
  if (localId !== finalId) {
    try {
      localStorage.setItem(DEVICE_KEY, finalId);
    } catch {}
  }
  if (cookieId !== finalId) {
    setCookie(DEVICE_KEY, finalId);
  }
  if (idbId !== finalId) {
    await setIndexedDBValue(DEVICE_KEY, finalId);
  }

  return finalId;
}

/**
 * Synchronous accessor for fast attendance calls and login.
 * Falls back to cookie or generates a fallback if localStorage empty.
 */
export const getDeviceId = (): string => {
  if (typeof window === "undefined") return "";

  let deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = getCookie(DEVICE_KEY);
    if (deviceId) {
      try {
        localStorage.setItem(DEVICE_KEY, deviceId);
      } catch {}
    }
  }

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    try {
      localStorage.setItem(DEVICE_KEY, deviceId);
      setCookie(DEVICE_KEY, deviceId);
      setIndexedDBValue(DEVICE_KEY, deviceId);
    } catch {}
  }

  return deviceId;
};

import { collectDeviceSignals, getBrowserFingerprintHash } from "./fingerprint";

/**
 * Collects non-identifying device signals (userAgent, platform, timezone).
 */
export const getDeviceSignals = () => {
  if (typeof window === "undefined") {
    return { userAgent: "", platform: "", timezone: "UTC" };
  }

  return {
    userAgent: navigator.userAgent || "",
    platform: navigator.platform || "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
};

/**
 * Convenience helper returning full payload for login & attendance verification.
 * Includes Layer 1 (UUID) + Layer 2 (Browser Fingerprint Hash + rich signals).
 */
export const getDevicePayload = async () => {
  const deviceId = getDeviceId();
  let fingerprintHash = "";
  let signals: Record<string, unknown> = getDeviceSignals();

  try {
    signals = await collectDeviceSignals();
    fingerprintHash = await getBrowserFingerprintHash();
  } catch {
    // Graceful fallback
  }

  return {
    deviceId,
    fingerprintHash,
    signals,
  };
};

