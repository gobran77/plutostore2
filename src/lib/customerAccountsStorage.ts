import { CUSTOMER_ACCOUNTS_KEY, type LocalCustomerAccount } from '@/hooks/useCustomerPassword';
import { db, isFirebaseConfigured } from '@/integrations/firebase/client';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';

type CustomerStatus = 'active' | 'inactive' | 'blocked';

export type CustomerAccountRecord = LocalCustomerAccount & {
  status?: CustomerStatus;
  created_at?: string;
};

const loadLocalAccounts = (): CustomerAccountRecord[] => {
  try {
    const raw = localStorage.getItem(CUSTOMER_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalAccounts = (accounts: CustomerAccountRecord[]) => {
  localStorage.setItem(CUSTOMER_ACCOUNTS_KEY, JSON.stringify(accounts));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('customer-accounts-updated'));
  }
};

const normalizeAccount = (value: any): CustomerAccountRecord => ({
  id: String(value?.id || ''),
  name: String(value?.name || ''),
  email: value?.email ? String(value.email) : '',
  whatsapp_number: String(value?.whatsapp_number || ''),
  password_hash: String(value?.password_hash || ''),
  activation_code: String(value?.activation_code || ''),
  is_activated: Boolean(value?.is_activated),
  is_admin: Boolean(value?.is_admin),
  account_type: String(value?.account_type || 'customer'),
  balance: Number(value?.balance || 0),
  currency: String(value?.currency || 'SAR'),
  balance_sar: Number(value?.balance_sar || 0),
  balance_yer: Number(value?.balance_yer || 0),
  balance_usd: Number(value?.balance_usd || 0),
  biometric_face_enabled: Boolean(value?.biometric_face_enabled),
  status: (value?.status as CustomerStatus) || (Boolean(value?.is_activated) ? 'active' : 'inactive'),
  created_at:
    value?.created_at?.toDate && typeof value.created_at.toDate === 'function'
      ? value.created_at.toDate().toISOString()
      : value?.created_at
      ? String(value.created_at)
      : new Date().toISOString(),
});

const withLocalFallback = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    console.error('Cloud customer accounts operation failed, using local fallback:', error);
    return fallback;
  }
};

export const isCloudAccountsEnabled = (): boolean => isFirebaseConfigured && Boolean(db);

export const getCustomerAccounts = async (): Promise<CustomerAccountRecord[]> => {
  if (!isCloudAccountsEnabled()) return loadLocalAccounts();

  return withLocalFallback(async () => {
    const q = query(collection(db!, 'customer_accounts'), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    const accounts = snapshot.docs.map((d) => normalizeAccount(d.data()));
    saveLocalAccounts(accounts);
    return accounts;
  }, loadLocalAccounts());
};

export const createCustomerAccountRecord = async (
  payload: CustomerAccountRecord
): Promise<CustomerAccountRecord> => {
  const normalized = normalizeAccount(payload);

  if (!isCloudAccountsEnabled()) {
    const local = loadLocalAccounts();
    local.unshift(normalized);
    saveLocalAccounts(local);
    return normalized;
  }

  return withLocalFallback(async () => {
    await setDoc(doc(db!, 'customer_accounts', normalized.id), normalized);
    const created = normalized;
    const local = loadLocalAccounts().filter((a) => a.id !== created.id);
    local.unshift(created);
    saveLocalAccounts(local);
    return created;
  }, (() => {
    const local = loadLocalAccounts();
    local.unshift(normalized);
    saveLocalAccounts(local);
    return normalized;
  })());
};

export const updateCustomerAccountRecord = async (
  id: string,
  patch: Partial<CustomerAccountRecord>
): Promise<CustomerAccountRecord | null> => {
  const local = loadLocalAccounts();
  const localIndex = local.findIndex((a) => a.id === id);
  const localExisting = localIndex >= 0 ? local[localIndex] : null;
  const localPatched = localExisting ? normalizeAccount({ ...localExisting, ...patch, id }) : null;

  if (!isCloudAccountsEnabled()) {
    if (!localPatched) return null;
    local[localIndex] = localPatched;
    saveLocalAccounts(local);
    return localPatched;
  }

  return withLocalFallback(async () => {
    await setDoc(doc(db!, 'customer_accounts', id), patch, { merge: true });
    const snapshot = await getDoc(doc(db!, 'customer_accounts', id));
    if (!snapshot.exists()) return localPatched;

    const updated = normalizeAccount(snapshot.data());
    const next = loadLocalAccounts();
    const idx = next.findIndex((a) => a.id === id);
    if (idx >= 0) next[idx] = updated;
    else next.unshift(updated);
    saveLocalAccounts(next);
    return updated;
  }, (() => {
    if (!localPatched) return null;
    local[localIndex] = localPatched;
    saveLocalAccounts(local);
    return localPatched;
  })());
};

export const deleteCustomerAccountRecord = async (id: string): Promise<boolean> => {
  const localDelete = () => {
    const next = loadLocalAccounts().filter((a) => a.id !== id);
    saveLocalAccounts(next);
    return true;
  };

  if (!isCloudAccountsEnabled()) return localDelete();

  return withLocalFallback(async () => {
    await deleteDoc(doc(db!, 'customer_accounts', id));
    return localDelete();
  }, localDelete());
};
