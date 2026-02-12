export type CustomerActivityType =
  | 'payment'
  | 'balance_add'
  | 'balance_subtract'
  | 'balance_set'
  | 'subscription_add'
  | 'subscription_delete'
  | 'admin_update'
  | 'reset';

export interface CustomerActivityItem {
  id: string;
  customerId: string;
  type: CustomerActivityType;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  createdAt: string;
  meta?: Record<string, any>;
}

const CUSTOMER_ACTIVITY_KEY = 'app_customer_activity';

const loadAll = (): CustomerActivityItem[] => {
  try {
    const raw = localStorage.getItem(CUSTOMER_ACTIVITY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveAll = (items: CustomerActivityItem[]) => {
  localStorage.setItem(CUSTOMER_ACTIVITY_KEY, JSON.stringify(items));
};

export const addCustomerActivity = (payload: Omit<CustomerActivityItem, 'id' | 'createdAt'>) => {
  const all = loadAll();
  const next: CustomerActivityItem = {
    ...payload,
    id: `act_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    createdAt: new Date().toISOString(),
  };
  all.unshift(next);
  saveAll(all.slice(0, 2000));
  return next;
};

export const getCustomerActivity = (customerId: string, limit = 100): CustomerActivityItem[] => {
  return loadAll()
    .filter((x) => String(x.customerId) === String(customerId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
};

