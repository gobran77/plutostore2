import { Invoice, Payment, Subscription } from '@/types';
import { addToBalance, subtractFromBalance } from '@/types/currency';

const INVOICES_STORAGE_KEY = 'app_invoices';
const PAYMENTS_STORAGE_KEY = 'app_payments';

// Generate invoice number
export const generateInvoiceNumber = (): string => {
  const invoices = loadInvoices();
  const maxSequence = invoices.reduce((max, invoice) => {
    const match = String(invoice.invoiceNumber || '').match(/(\d+)$/);
    const value = match ? Number(match[1]) : 0;
    return Math.max(max, value);
  }, 0);

  return String(maxSequence + 1).padStart(3, '0');
};

// Create invoice from subscription
export const createInvoiceFromSubscription = (subscription: Omit<Subscription, 'id' | 'status'> & { id: string }): Invoice => {
  const invoice: Invoice = {
    id: `inv_${Date.now()}`,
    customerId: subscription.customerId,
    customerName: subscription.customerName,
    subscriptionId: subscription.id,
    invoiceNumber: generateInvoiceNumber(),
    amount: subscription.totalPrice,
    currency: subscription.currency,
    tax: 0,
    discount: subscription.discount,
    status: subscription.paymentStatus === 'paid' ? 'paid' : 
            subscription.paymentStatus === 'partial' ? 'partially_paid' : 'unpaid',
    issuedAt: new Date(),
    dueAt: subscription.dueDate || new Date(),
  };
  return invoice;
};

// Create payment from subscription (if paid or partial)
export const createPaymentFromSubscription = (
  subscription: Omit<Subscription, 'id' | 'status'> & { id: string },
  invoiceNumber: string
): Payment | null => {
  if (subscription.paymentStatus === 'deferred') return null;
  
  const amount = subscription.paymentStatus === 'paid' 
    ? subscription.totalPrice 
    : subscription.paidAmount;
    
  if (amount <= 0) return null;

  const payment: Payment = {
    id: `pay_${Date.now()}`,
    invoiceId: subscription.id,
    invoiceNumber: invoiceNumber,
    customerName: subscription.customerName,
    amount: amount,
    currency: subscription.currency,
    method: (subscription.paymentMethod?.type as any) || 'cash',
    paidAt: new Date(),
    reference: subscription.paymentMethod?.name,
  };
  return payment;
};

// Load invoices from localStorage
export const loadInvoices = (): Invoice[] => {
  const saved = localStorage.getItem(INVOICES_STORAGE_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return parsed.map((inv: any) => ({
      ...inv,
      issuedAt: new Date(inv.issuedAt),
      dueAt: new Date(inv.dueAt),
    }));
  } catch (e) {
    console.error('Error loading invoices:', e);
    return [];
  }
};

// Save invoices to localStorage
export const saveInvoices = (invoices: Invoice[]): void => {
  localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(invoices));
};

// Load payments from localStorage
export const loadPayments = (): Payment[] => {
  const saved = localStorage.getItem(PAYMENTS_STORAGE_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return parsed.map((pay: any) => ({
      ...pay,
      paidAt: new Date(pay.paidAt),
    }));
  } catch (e) {
    console.error('Error loading payments:', e);
    return [];
  }
};

// Save payments to localStorage
export const savePayments = (payments: Payment[]): void => {
  localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
};

export const hydrateInvoicePaymentStorageFromCloud = async (): Promise<void> => {
  // Manual storage mode: no automatic cloud hydration.
  return Promise.resolve();
};

// Add new invoice
export const addInvoice = (invoice: Invoice): void => {
  const invoices = loadInvoices();
  invoices.unshift(invoice);
  saveInvoices(invoices);
};

// Add new payment and update balance
export const addPayment = (payment: Payment): void => {
  const payments = loadPayments();
  payments.unshift(payment);
  savePayments(payments);
  
  // Add to currency balance when receiving payment
  addToBalance(payment.currency, payment.amount);
};

// Update invoice
export const updateInvoice = (updatedInvoice: Invoice): void => {
  const invoices = loadInvoices();
  const index = invoices.findIndex(inv => inv.id === updatedInvoice.id);
  if (index !== -1) {
    invoices[index] = updatedInvoice;
    saveInvoices(invoices);
  }
};

// Delete invoice
export const deleteInvoice = (invoiceId: string): void => {
  const invoices = loadInvoices().filter(inv => inv.id !== invoiceId);
  if (invoices.length === 0) {
    localStorage.removeItem(INVOICES_STORAGE_KEY);
  } else {
    saveInvoices(invoices);
  }
};

// Update payment
export const updatePaymentInStorage = (updatedPayment: Payment): void => {
  const payments = loadPayments();
  const index = payments.findIndex(pay => pay.id === updatedPayment.id);
  if (index !== -1) {
    payments[index] = updatedPayment;
    savePayments(payments);
  }
};

// Delete payment
export const deletePaymentFromStorage = (paymentId: string): void => {
  const payments = loadPayments().filter(pay => pay.id !== paymentId);
  if (payments.length === 0) {
    localStorage.removeItem(PAYMENTS_STORAGE_KEY);
  } else {
    savePayments(payments);
  }
};
