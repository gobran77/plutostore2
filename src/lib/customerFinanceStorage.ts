export const CUSTOMER_FINANCE_ACCOUNTS_KEY = 'app_customer_finance_accounts';
export const CUSTOMER_FINANCE_BALANCES_KEY = 'app_customer_finance_balances';

type CustomerStatus = 'active' | 'inactive' | 'blocked';

type FinanceSourceAccount = {
  id: string;
  name: string;
  email?: string;
  whatsapp_number: string;
  currency?: string;
  account_type?: string;
  status?: CustomerStatus;
  is_activated?: boolean;
  is_admin?: boolean;
  created_at?: string;
  balance?: number;
  balance_sar?: number;
  balance_yer?: number;
  balance_usd?: number;
};

type FinanceAccountDoc = {
  id: string;
  customer_id: string;
  name: string;
  email: string;
  whatsapp_number: string;
  account_type: string;
  currency: string;
  status: CustomerStatus;
  is_activated: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

type FinanceBalanceDoc = {
  id: string;
  customer_id: string;
  currency: string;
  balance: number;
  balance_sar: number;
  balance_yer: number;
  balance_usd: number;
  updated_at: string;
};

const loadLocalList = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalList = (key: string, value: unknown[]) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const normalizeStatus = (value: FinanceSourceAccount): CustomerStatus =>
  (value.status as CustomerStatus) || (Boolean(value.is_activated) ? 'active' : 'inactive');

const toFinanceAccountDoc = (source: FinanceSourceAccount): FinanceAccountDoc => {
  const now = new Date().toISOString();
  return {
    id: String(source.id),
    customer_id: String(source.id),
    name: String(source.name || ''),
    email: String(source.email || ''),
    whatsapp_number: String(source.whatsapp_number || ''),
    account_type: String(source.account_type || 'customer'),
    currency: String(source.currency || 'SAR'),
    status: normalizeStatus(source),
    is_activated: Boolean(source.is_activated),
    is_admin: Boolean(source.is_admin),
    created_at: String(source.created_at || now),
    updated_at: now,
  };
};

const toFinanceBalanceDoc = (source: FinanceSourceAccount): FinanceBalanceDoc => ({
  id: String(source.id),
  customer_id: String(source.id),
  currency: String(source.currency || 'SAR'),
  balance: Number(source.balance || 0),
  balance_sar: Number(source.balance_sar || 0),
  balance_yer: Number(source.balance_yer || 0),
  balance_usd: Number(source.balance_usd || 0),
  updated_at: new Date().toISOString(),
});

const upsertLocalDoc = <T extends { id: string }>(key: string, docValue: T) => {
  const current = loadLocalList<T>(key);
  const index = current.findIndex((x) => String(x.id) === String(docValue.id));
  if (index >= 0) current[index] = docValue;
  else current.unshift(docValue);
  saveLocalList(key, current);
};

export const syncCustomerFinanceRecord = async (source: FinanceSourceAccount): Promise<void> => {
  upsertLocalDoc(CUSTOMER_FINANCE_ACCOUNTS_KEY, toFinanceAccountDoc(source));
  upsertLocalDoc(CUSTOMER_FINANCE_BALANCES_KEY, toFinanceBalanceDoc(source));
};

export const syncCustomerFinanceRecords = async (sources: FinanceSourceAccount[]): Promise<void> => {
  if (!Array.isArray(sources) || sources.length === 0) return;
  for (const source of sources) {
    await syncCustomerFinanceRecord(source);
  }
};

export const deleteCustomerFinanceRecord = async (customerId: string): Promise<void> => {
  const localDelete = (key: string) => {
    const current = loadLocalList<{ id: string }>(key);
    const next = current.filter((x) => String(x.id) !== String(customerId));
    saveLocalList(key, next);
  };

  localDelete(CUSTOMER_FINANCE_ACCOUNTS_KEY);
  localDelete(CUSTOMER_FINANCE_BALANCES_KEY);
};

export const hydrateLocalFinanceFromCloud = async (): Promise<void> => {
  return Promise.resolve();
};
