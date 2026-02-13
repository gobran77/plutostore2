import { db, isFirebaseConfigured } from '@/integrations/firebase/client';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';

const CLOUD_STORAGE_COLLECTION = 'app_state';
const CLOUD_SYNC_META_KEY = '__cloud_sync_meta__';
const CLOUD_HEALTHCHECK_DOC = 'healthcheck_probe';

let syncInitialized = false;
let patchInstalled = false;
let isHydrating = false;
let writeQueue: Promise<void> = Promise.resolve();
let readQueue: Promise<void> = Promise.resolve();
let pollingStarted = false;
let pollingTimer: number | null = null;

const shouldSyncKey = (key: string): boolean => key.startsWith('app_');

type SyncMetaRecord = {
  updatedAt: number;
  deleted?: boolean;
};

type SyncMetaState = Record<string, SyncMetaRecord>;

type CloudStateEntry = {
  value: string;
  updatedAt: number;
};

const parseUpdatedAt = (value: unknown): number => {
  if (typeof value !== 'string') return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const loadSyncMeta = (): SyncMetaState => {
  try {
    const raw = localStorage.getItem(CLOUD_SYNC_META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as SyncMetaState;
  } catch {
    return {};
  }
};

const saveSyncMeta = (meta: SyncMetaState) => {
  localStorage.setItem(CLOUD_SYNC_META_KEY, JSON.stringify(meta));
};

const markSyncMeta = (key: string, updatedAt: number, deleted: boolean) => {
  const meta = loadSyncMeta();
  meta[key] = { updatedAt, deleted };
  saveSyncMeta(meta);
};

const enqueueWrite = (task: () => Promise<void>) => {
  writeQueue = writeQueue.then(task).catch((error) => {
    console.error('Cloud storage sync write failed:', error);
  });
};

const upsertCloudKey = (key: string, value: string, updatedAtMs?: number) => {
  if (!db) return;
  const updatedAtIso = new Date(updatedAtMs || Date.now()).toISOString();
  enqueueWrite(async () => {
    await setDoc(
      doc(db, CLOUD_STORAGE_COLLECTION, key),
      {
        value,
        updated_at: updatedAtIso,
      },
      { merge: true }
    );
  });
};

const deleteCloudKey = (key: string) => {
  if (!db) return;
  enqueueWrite(async () => {
    await deleteDoc(doc(db, CLOUD_STORAGE_COLLECTION, key));
  });
};

const getLocalSyncableSnapshot = (): Map<string, string> => {
  const snapshot = new Map<string, string>();
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !shouldSyncKey(key)) continue;
    const value = localStorage.getItem(key);
    if (value != null) snapshot.set(key, value);
  }
  return snapshot;
};

const installLocalStoragePatch = () => {
  if (patchInstalled) return;
  patchInstalled = true;

  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;
  const nativeClear = Storage.prototype.clear;

  Storage.prototype.setItem = function patchedSetItem(key: string, value: string) {
    nativeSetItem.call(this, key, value);
    if (this !== localStorage || isHydrating || !shouldSyncKey(key)) return;
    const now = Date.now();
    markSyncMeta(key, now, false);
    upsertCloudKey(key, value, now);
  };

  Storage.prototype.removeItem = function patchedRemoveItem(key: string) {
    nativeRemoveItem.call(this, key);
    if (this !== localStorage || isHydrating || !shouldSyncKey(key)) return;
    markSyncMeta(key, Date.now(), true);
    deleteCloudKey(key);
  };

  Storage.prototype.clear = function patchedClear() {
    if (this !== localStorage) {
      nativeClear.call(this);
      return;
    }

    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && shouldSyncKey(key)) keysToDelete.push(key);
    }

    nativeClear.call(this);

    if (isHydrating) return;
    const now = Date.now();
    keysToDelete.forEach((key) => {
      markSyncMeta(key, now, true);
      deleteCloudKey(key);
    });
  };
};

const readCloudState = async (): Promise<Map<string, CloudStateEntry>> => {
  const cloudState = new Map<string, CloudStateEntry>();
  if (!db) return cloudState;

  const snapshot = await getDocs(collection(db, CLOUD_STORAGE_COLLECTION));
  snapshot.forEach((item) => {
    const value = item.data()?.value;
    if (typeof value !== 'string') return;
    cloudState.set(item.id, {
      value,
      updatedAt: parseUpdatedAt(item.data()?.updated_at),
    });
  });

  return cloudState;
};

const reconcileWithCloud = async (): Promise<void> => {
  if (!isFirebaseConfigured || !db) return;

  // Cloud-only source of truth: always pull from Firestore after flushing pending writes.
  await waitForCloudStorageSyncIdle();

  isHydrating = true;
  try {
    const cloudSnapshot = await readCloudState();

    // Remove any local app_* key that does not exist in cloud.
    const localSnapshot = getLocalSyncableSnapshot();
    localSnapshot.forEach((_, key) => {
      if (!cloudSnapshot.has(key)) {
        localStorage.removeItem(key);
      }
    });

    // Apply cloud snapshot to local cache.
    const meta: SyncMetaState = {};
    cloudSnapshot.forEach((cloud, key) => {
      localStorage.setItem(key, cloud.value);
      meta[key] = { updatedAt: cloud.updatedAt || Date.now(), deleted: false };
    });

    // Preserve non app_* meta keys if any.
    const existingMeta = loadSyncMeta();
    Object.keys(existingMeta).forEach((key) => {
      if (!shouldSyncKey(key)) {
        meta[key] = existingMeta[key];
      }
    });

    saveSyncMeta(meta);
  } finally {
    isHydrating = false;
  }
};

export const verifyCloudStorageAccess = async (): Promise<void> => {
  if (!isFirebaseConfigured || !db) {
    throw new Error('firebase_not_configured');
  }

  // Verify both read and write access to app_state.
  await getDocs(collection(db, CLOUD_STORAGE_COLLECTION));
  await setDoc(
    doc(db, CLOUD_STORAGE_COLLECTION, CLOUD_HEALTHCHECK_DOC),
    { value: 'ok', updated_at: new Date().toISOString() },
    { merge: true }
  );
  await deleteDoc(doc(db, CLOUD_STORAGE_COLLECTION, CLOUD_HEALTHCHECK_DOC));
};

export const initializeCloudStorageSync = async (
  options: { requireCloud?: boolean } = {}
): Promise<void> => {
  const requireCloud = options.requireCloud ?? false;
  if (syncInitialized) return;

  if (!isFirebaseConfigured || !db) {
    if (requireCloud) {
      throw new Error('firebase_not_configured');
    }
    syncInitialized = true;
    installLocalStoragePatch();
    console.warn('Firebase is not configured. App data remains local.');
    return;
  }

  try {
    // Ensure Firestore access before enabling app state sync.
    await verifyCloudStorageAccess();
    syncInitialized = true;
    installLocalStoragePatch();
    await reconcileWithCloud();
  } catch (error) {
    if (requireCloud) throw error;
    syncInitialized = true;
    installLocalStoragePatch();
    console.error('Failed to initialize cloud storage sync:', error);
  }
};

export const waitForCloudStorageSyncIdle = async (): Promise<void> => {
  await writeQueue;
};

export const syncCloudStorageNow = async (): Promise<void> => {
  // Serialize pull cycles.
  readQueue = readQueue
    .then(async () => {
      if (!syncInitialized) return;
      await reconcileWithCloud();
    })
    .catch((error) => {
      console.error('Cloud storage manual sync failed:', error);
    });
  await readQueue;
};

export const startCloudStoragePolling = (intervalMs: number = 4000): void => {
  if (pollingStarted) return;
  pollingStarted = true;

  const tick = () => {
    syncCloudStorageNow().catch((error) => {
      console.error('Cloud storage polling sync failed:', error);
    });
  };

  if (typeof window !== 'undefined') {
    pollingTimer = window.setInterval(tick, Math.max(2000, intervalMs));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) tick();
    });
    window.addEventListener('focus', tick);
  }
};

export const purgeCloudAppState = async (): Promise<void> => {
  // Ensure queued writes/removals finish first.
  await waitForCloudStorageSyncIdle();

  // Remove all local app_* keys and sync metadata.
  const keysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && shouldSyncKey(key)) keysToDelete.push(key);
  }
  keysToDelete.forEach((key) => localStorage.removeItem(key));

  const meta = loadSyncMeta();
  Object.keys(meta).forEach((key) => {
    if (shouldSyncKey(key)) delete meta[key];
  });
  saveSyncMeta(meta);

  if (!isFirebaseConfigured || !db) return;

  // Hard-delete app_state docs from Firestore so no stale restore happens on other devices.
  const snapshot = await getDocs(collection(db, CLOUD_STORAGE_COLLECTION));
  const tasks: Promise<void>[] = [];
  snapshot.forEach((item) => {
    if (!shouldSyncKey(item.id)) return;
    tasks.push(deleteDoc(doc(db, CLOUD_STORAGE_COLLECTION, item.id)));
  });
  await Promise.all(tasks);
};
