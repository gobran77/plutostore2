import { getCustomerAccounts } from '@/lib/customerAccountsStorage';
import { hydrateLocalFinanceFromCloud, syncCustomerFinanceRecords } from '@/lib/customerFinanceStorage';
import { loadInvoices, loadPayments, saveInvoices, savePayments } from '@/utils/invoicePaymentUtils';

export const autoSetupFinanceDb = async (): Promise<void> => {
  // 1) Mirror customer account + balances snapshots into dedicated finance collections.
  const accounts = await getCustomerAccounts();
  await syncCustomerFinanceRecords(accounts as any);
  await hydrateLocalFinanceFromCloud();

  // 2) Force-write local invoices/payments snapshot through cloud-backed utils.
  // save* functions mirror to Firestore collections automatically.
  saveInvoices(loadInvoices());
  savePayments(loadPayments());
};

