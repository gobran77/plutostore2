export const CLOUD_STATE_UPDATED_EVENT = 'cloud-state-updated';

export const verifyCloudStorageAccess = async (): Promise<void> => {
  return Promise.resolve();
};

export const initializeCloudStorageSync = async (): Promise<void> => {
  return Promise.resolve();
};

export const waitForCloudStorageSyncIdle = async (): Promise<void> => {
  return Promise.resolve();
};

export const syncCloudStorageNow = async (): Promise<void> => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CLOUD_STATE_UPDATED_EVENT, { detail: { keys: [] } }));
  }
  return Promise.resolve();
};

export const startCloudStoragePolling = (): void => {
  // Manual mode: no cloud polling.
};

export const purgeCloudAppState = async (): Promise<void> => {
  const keysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith('app_')) keysToDelete.push(key);
  }
  keysToDelete.forEach((key) => localStorage.removeItem(key));
  return Promise.resolve();
};
