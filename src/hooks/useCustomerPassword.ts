import { toast } from 'sonner';

// Supabase removed: store customer accounts locally.

export const CUSTOMER_ACCOUNTS_KEY = 'app_customer_accounts';

export type LocalCustomerAccount = {
  id: string;
  name: string;
  whatsapp_number: string;
  password_hash: string;
  activation_code: string;
  is_activated: boolean;
  is_admin?: boolean;
  account_type?: string;
  balance?: number;
  currency?: string;
  balance_sar?: number;
  balance_yer?: number;
  balance_usd?: number;
};

const loadAccounts = (): LocalCustomerAccount[] => {
  try {
    const raw = localStorage.getItem(CUSTOMER_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveAccounts = (accounts: LocalCustomerAccount[]) => {
  localStorage.setItem(CUSTOMER_ACCOUNTS_KEY, JSON.stringify(accounts));
};

// Generate a random short password
export const generateRandomPassword = (length: number = 6): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Create a customer account with generated password
export const createCustomerAccount = async (
  name: string,
  whatsappNumber: string,
  currency: string = 'SAR'
): Promise<{ success: boolean; password?: string; error?: string }> => {
  try {
    const accounts = loadAccounts();
    const exists = accounts.some((a) => String(a.whatsapp_number).trim() === String(whatsappNumber).trim());
    if (exists) return { success: false, error: 'رقم الواتساب مسجل مسبقاً' };

    const password = generateRandomPassword();
    const nowId = `cust_${Date.now()}`;

    accounts.unshift({
      id: nowId,
      name,
      whatsapp_number: whatsappNumber,
      password_hash: password,
      activation_code: '',
      is_activated: false,
      balance: 0,
      currency,
      balance_sar: 0,
      balance_yer: 0,
      balance_usd: 0,
    });
    saveAccounts(accounts);
    return { success: true, password };
  } catch (err) {
    console.error('Error creating customer account:', err);
    return { success: false, error: 'حدث خطأ أثناء إنشاء الحساب' };
  }
};

// Regenerate password for existing customer
export const regenerateCustomerPassword = async (
  customerId: string
): Promise<{ success: boolean; password?: string; error?: string }> => {
  try {
    const accounts = loadAccounts();
    const idx = accounts.findIndex((a) => a.id === customerId);
    if (idx === -1) return { success: false, error: 'الحساب غير موجود' };

    const password = generateRandomPassword();
    accounts[idx] = { ...accounts[idx], password_hash: password };
    saveAccounts(accounts);
    return { success: true, password };
  } catch (err) {
    console.error('Error regenerating password:', err);
    return { success: false, error: 'حدث خطأ أثناء تحديث كلمة المرور' };
  }
};

// Update customer balance (single legacy balance field)
export const updateCustomerBalance = async (
  customerId: string,
  newBalance: number
): Promise<boolean> => {
  try {
    const accounts = loadAccounts();
    const idx = accounts.findIndex((a) => a.id === customerId);
    if (idx === -1) return false;
    accounts[idx] = { ...accounts[idx], balance: newBalance };
    saveAccounts(accounts);
    return true;
  } catch (err) {
    console.error('Error updating balance:', err);
    toast.error('حدث خطأ أثناء تحديث الرصيد');
    return false;
  }
};

// Create customer subscription (no-op; subscriptions are managed in app_subscriptions)
export const createCustomerSubscription = async (): Promise<boolean> => {
  return true;
};

