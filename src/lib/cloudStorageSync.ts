import { db, isFirebaseConfigured } from '@/integrations/firebase/client';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';

const CLOUD_STORAGE_COLLECTION = 'app_state';
const CLOUD_SYNC_META_KEY = '__cloud_sync_meta__';

let syncInitialized = false;
let patchInstalled = false;
let isHydrating = false;
let writeQueue: Promise<void> = Promise.resolve();

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

export const initializeCloudStorageSync = async (): Promise<void> => {
  if (syncInitialized) return;
  syncInitialized = true;
  installLocalStoragePatch();

  if (!isFirebaseConfigured || !db) {
    console.warn('Firebase is not configured. App data remains local.');
    return;
  }

  try {
    isHydrating = true;

    const localSnapshot = getLocalSyncableSnapshot();
    const meta = loadSyncMeta();
    const cloudSnapshot = await readCloudState();
    const allKeys = new Set<string>([
      ...localSnapshot.keys(),
      ...cloudSnapshot.keys(),
      ...Object.keys(meta).filter((k) => shouldSyncKey(k)),
    ]);

    for (const key of allKeys) {
      const localValue = localSnapshot.get(key);
      const localMeta = meta[key];
      const localUpdatedAt = localMeta?.updatedAt || 0;

      const cloud = cloudSnapshot.get(key);
      const cloudUpdatedAt = cloud?.updatedAt || 0;

      if (localMeta?.deleted) {
        if (localUpdatedAt >= cloudUpdatedAt) {
          localStorage.removeItem(key);
          if (cloud) deleteCloudKey(key);
          continue;
        }

        if (cloud) {
          localStorage.setItem(key, cloud.value);
          meta[key] = { updatedAt: cloudUpdatedAt, deleted: false };
        }
        continue;
      }

      if (cloud && cloudUpdatedAt >= localUpdatedAt) {
        localStorage.setItem(key, cloud.value);
        meta[key] = { updatedAt: cloudUpdatedAt, deleted: false };
        continue;
      }

      if (localValue != null) {
        const now = localUpdatedAt || Date.now();
        meta[key] = { updatedAt: now, deleted: false };
        upsertCloudKey(key, localValue, now);
      }
    }

    saveSyncMeta(meta);
  } catch (error) {
    console.error('Failed to initialize cloud storage sync:', error);
  } finally {
    isHydrating = false;
  }
};
