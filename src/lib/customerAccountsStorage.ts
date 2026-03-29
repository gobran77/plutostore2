import { CUSTOMER_ACCOUNTS_KEY, type LocalCustomerAccount } from '@/hooks/useCustomerPassword';
import {
  deleteCustomerFinanceRecord,
  syncCustomerFinanceRecord,
  syncCustomerFinanceRecords,
} from '@/lib/customerFinanceStorage';

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
  created_at: value?.created_at ? String(value.created_at) : new Date().toISOString(),
});

export const isCloudAccountsEnabled = (): boolean => false;

export const getCustomerAccounts = async (): Promise<CustomerAccountRecord[]> => {
  const local = loadLocalAccounts();
  syncCustomerFinanceRecords(local).catch((syncError) => {
    console.error('Finance mirror sync failed on local getCustomerAccounts:', syncError);
  });
  return local;
};

export const createCustomerAccountRecord = async (
  payload: CustomerAccountRecord
): Promise<CustomerAccountRecord> => {
  const normalized = normalizeAccount(payload);
  const local = loadLocalAccounts().filter((account) => account.id !== normalized.id);
  local.unshift(normalized);
  saveLocalAccounts(local);
  await syncCustomerFinanceRecord(normalized);
  return normalized;
};

export const updateCustomerAccountRecord = async (
  id: string,
  patch: Partial<CustomerAccountRecord>
): Promise<CustomerAccountRecord | null> => {
  const local = loadLocalAccounts();
  const index = local.findIndex((account) => account.id === id);
  if (index < 0) return null;

  const updated = normalizeAccount({ ...local[index], ...patch, id });
  local[index] = updated;
  saveLocalAccounts(local);
  await syncCustomerFinanceRecord(updated);
  return updated;
};

export const deleteCustomerAccountRecord = async (id: string): Promise<boolean> => {
  const next = loadLocalAccounts().filter((account) => account.id !== id);
  saveLocalAccounts(next);
  await deleteCustomerFinanceRecord(id);
  return true;
};
