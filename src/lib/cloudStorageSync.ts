import { db, isFirebaseConfigured } from '@/integrations/firebase/client';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';

const CLOUD_STORAGE_COLLECTION = 'app_state';

let syncInitialized = false;
let patchInstalled = false;
let isHydrating = false;
let writeQueue: Promise<void> = Promise.resolve();

const shouldSyncKey = (key: string): boolean => key.startsWith('app_');

const enqueueWrite = (task: () => Promise<void>) => {
  writeQueue = writeQueue.then(task).catch((error) => {
    console.error('Cloud storage sync write failed:', error);
  });
};

const upsertCloudKey = (key: string, value: string) => {
  if (!db) return;
  enqueueWrite(async () => {
    await setDoc(
      doc(db, CLOUD_STORAGE_COLLECTION, key),
      {
        value,
        updated_at: new Date().toISOString(),
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
    upsertCloudKey(key, value);
  };

  Storage.prototype.removeItem = function patchedRemoveItem(key: string) {
    nativeRemoveItem.call(this, key);
    if (this !== localStorage || isHydrating || !shouldSyncKey(key)) return;
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
    keysToDelete.forEach((key) => deleteCloudKey(key));
  };
};

const readCloudState = async (): Promise<Map<string, string>> => {
  const cloudState = new Map<string, string>();
  if (!db) return cloudState;

  const snapshot = await getDocs(collection(db, CLOUD_STORAGE_COLLECTION));
  snapshot.forEach((item) => {
    const value = item.data()?.value;
    if (typeof value !== 'string') return;
    cloudState.set(item.id, value);
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
    const cloudSnapshot = await readCloudState();

    cloudSnapshot.forEach((value, key) => {
      localStorage.setItem(key, value);
    });

    localSnapshot.forEach((value, key) => {
      if (!cloudSnapshot.has(key)) {
        upsertCloudKey(key, value);
      }
    });
  } catch (error) {
    console.error('Failed to initialize cloud storage sync:', error);
  } finally {
    isHydrating = false;
  }
};
