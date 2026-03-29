import type { Invoice, Payment } from '@/types';

const INVOICES_KEY = 'app_invoices';
const PAYMENTS_KEY = 'app_payments';

const saveLocalList = (key: string, value: unknown[]) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const mirrorInvoicesToCloud = (invoices: Invoice[]): void => {
  saveLocalList(INVOICES_KEY, invoices);
};

export const mirrorPaymentsToCloud = (payments: Payment[]): void => {
  saveLocalList(PAYMENTS_KEY, payments);
};

export const hydrateBillingFromCloud = async (): Promise<void> => {
  return Promise.resolve();
};

export const waitForBillingCloudWrites = async (): Promise<void> => {
  return Promise.resolve();
};
