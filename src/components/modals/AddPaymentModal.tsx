import { useState, useEffect } from 'react';
import { X, FileText, User } from 'lucide-react';
import { PaymentMethodType } from './PaymentMethodsModal';
import { toast } from 'sonner';
import { getCustomerAccounts, updateCustomerAccountRecord } from '@/lib/customerAccountsStorage';
import { addCustomerActivity } from '@/lib/customerActivityLog';
import {
  hydrateInvoicePaymentStorageFromCloud,
  loadInvoices,
  loadPayments,
  saveInvoices,
} from '@/utils/invoicePaymentUtils';

type InvoiceStatus = 'paid' | 'unpaid' | 'partially_paid';
type PaymentType = 'invoice' | 'customer_balance' | 'customer_debt';

const SUBSCRIPTIONS_STORAGE_KEY = 'app_subscriptions';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (payment: any) => void;
  paymentMethods: PaymentMethodType[];
}

interface CustomerAccount {
  id: string;
  name: string;
  whatsapp_number: string;
  balance_sar: number;
  balance_yer: number;
  balance_usd: number;
}

interface OutstandingInvoice {
  id: string;
  invoiceNumber: string;
  subscriptionId: string;
  customerId: string;
  customerName: string;
  currency: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueAt?: string;
  status: InvoiceStatus;
}

const currencies = [
  { value: 'SAR', label: 'ريال سعودي (SAR)' },
  { value: 'YER', label: 'ريال يمني (YER)' },
  { value: 'USD', label: 'دولار أمريكي (USD)' },
];

const toNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const AddPaymentModal = ({
  isOpen,
  onClose,
  onAdd,
  paymentMethods,
}: AddPaymentModalProps) => {
  const [paymentType, setPaymentType] = useState<PaymentType>('invoice');
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    invoiceId: '',
    customerId: '',
    amount: '',
    currency: 'SAR',
    methodId: '',
    reference: '',
    paidAt: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    if (paymentType === 'customer_balance' || paymentType === 'customer_debt') {
      loadCustomers();
      return;
    }

    loadOutstandingInvoices();
  }, [isOpen, paymentType]);

  const loadOutstandingInvoices = async () => {
    setLoadingInvoices(true);
    try {
      await hydrateInvoicePaymentStorageFromCloud();
      const invoices = loadInvoices();
      const payments = loadPayments();

      if (!Array.isArray(invoices)) {
        setOutstandingInvoices([]);
        return;
      }

      const paymentList = Array.isArray(payments) ? payments : [];

      const list: OutstandingInvoice[] = invoices
        .map((inv: any) => {
          const amount = toNumber(inv?.amount);
          const subscriptionId = String(inv?.subscriptionId || '');
          const invoiceNumber = String(inv?.invoiceNumber || '');

          const paid = paymentList
            .filter((p: any) => {
              const bySub = String(p?.invoiceId || '') === subscriptionId;
              const byInvoiceNo = invoiceNumber && String(p?.invoiceNumber || '') === invoiceNumber;
              return bySub || byInvoiceNo;
            })
            .reduce((sum: number, p: any) => sum + toNumber(p?.amount), 0);

          const remaining = Math.max(0, amount - paid);

          return {
            id: String(inv?.id || ''),
            invoiceNumber,
            subscriptionId,
            customerId: String(inv?.customerId || ''),
            customerName: String(inv?.customerName || ''),
            currency: String(inv?.currency || 'SAR'),
            totalAmount: amount,
            paidAmount: paid,
            remainingAmount: remaining,
            dueAt: inv?.dueAt ? String(inv.dueAt) : undefined,
            status: (String(inv?.status || 'unpaid') as InvoiceStatus),
          } as OutstandingInvoice;
        })
        .filter((inv: OutstandingInvoice) => inv.id && inv.remainingAmount > 0)
        .sort((a, b) => {
          const ad = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
          const bd = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
          return ad - bd;
        });

      setOutstandingInvoices(list);
    } catch (error) {
      console.error('Error loading outstanding invoices:', error);
      setOutstandingInvoices([]);
      toast.error('تعذر تحميل الفواتير المستحقة');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const accounts = await getCustomerAccounts();
      const list = (Array.isArray(accounts) ? accounts : [])
        .filter((a: any) => !a?.is_admin && a?.account_type !== 'admin')
        .filter((a: any) => a?.is_activated === true)
        .filter((a: any) => (a?.status || 'active') !== 'blocked')
        .map((a: any) => ({
          id: String(a.id),
          name: String(a.name || ''),
          whatsapp_number: String(a.whatsapp_number || ''),
          balance_sar: toNumber(a.balance_sar),
          balance_yer: toNumber(a.balance_yer),
          balance_usd: toNumber(a.balance_usd),
        }))
        .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name), 'ar'));
      setCustomers(list);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('فشل في تحميل العملاء');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const updateCustomerDebtBalanceAfterPayment = async (customerId: string, currency: string, amount: number) => {
    if (!customerId || amount <= 0) return;

    const balanceField = `balance_${String(currency || '').toLowerCase()}`;
    if (!['balance_sar', 'balance_yer', 'balance_usd'].includes(balanceField)) return;

    try {
      const accounts = await getCustomerAccounts();
      const account = accounts.find((a: any) => String(a?.id || '') === String(customerId));
      if (!account) return;

      const current = toNumber((account as any)?.[balanceField]);
      const nextBalance = current + amount;
      await updateCustomerAccountRecord(String(account.id), { [balanceField]: nextBalance } as any);

      const rawSession = localStorage.getItem('customer_session');
      if (!rawSession) return;
      const session = JSON.parse(rawSession);
      if (String(session?.id || '') !== String(customerId)) return;

      const nextSession = {
        ...session,
        balances: {
          balance_sar: toNumber(session?.balances?.balance_sar),
          balance_yer: toNumber(session?.balances?.balance_yer),
          balance_usd: toNumber(session?.balances?.balance_usd),
          [balanceField]: nextBalance,
        },
      };
      localStorage.setItem('customer_session', JSON.stringify(nextSession));
    } catch (error) {
      console.error('Failed to update customer balance after payment:', error);
    }
  };

  const applyInvoicePayment = async (invoice: OutstandingInvoice, amount: number) => {
    const normalizedAmount = Math.max(0, amount);
    if (normalizedAmount <= 0) return;

    const nextPaid = Math.min(invoice.totalAmount, invoice.paidAmount + normalizedAmount);
    const nextStatus: InvoiceStatus =
      nextPaid >= invoice.totalAmount ? 'paid' : nextPaid > 0 ? 'partially_paid' : 'unpaid';

    try {
      const invoices = loadInvoices();
      const updatedInvoices = invoices.map((inv: any) => {
        if (String(inv?.id || '') !== invoice.id) return inv;
        return {
          ...inv,
          status: nextStatus,
        };
      });
      saveInvoices(updatedInvoices as any);
    } catch (error) {
      console.error('Failed to update invoice status:', error);
    }

    if (invoice.subscriptionId) {
      try {
        const rawSubs = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
        const subscriptions = rawSubs ? JSON.parse(rawSubs) : [];
        if (Array.isArray(subscriptions)) {
          const updatedSubs = subscriptions.map((sub: any) => {
            if (String(sub?.id || '') !== invoice.subscriptionId) return sub;

            const totalPrice = toNumber(sub?.totalPrice);
            const prevPaid = toNumber(sub?.paidAmount);
            const nextPaidAmount = Math.min(totalPrice, prevPaid + normalizedAmount);
            const nextPaymentStatus = nextPaidAmount >= totalPrice ? 'paid' : 'partial';

            return {
              ...sub,
              paidAmount: nextPaidAmount,
              paymentStatus: nextPaymentStatus,
            };
          });
          localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(updatedSubs));
        }
      } catch (error) {
        console.error('Failed to update subscription payment fields:', error);
      }
    }

    await updateCustomerDebtBalanceAfterPayment(invoice.customerId, invoice.currency, normalizedAmount);
  };

  if (!isOpen) return null;

  const selectedInvoice = outstandingInvoices.find((i) => i.id === formData.invoiceId);
  const selectedCustomer = customers.find((c) => c.id === formData.customerId);
  const selectedMethod = paymentMethods.find((m) => m.id === formData.methodId);
  const activeMethods = paymentMethods.filter((m) => m.active);

  const getCustomerBalance = (customer: CustomerAccount, currency: string) => {
    switch (currency) {
      case 'SAR':
        return customer.balance_sar || 0;
      case 'YER':
        return customer.balance_yer || 0;
      case 'USD':
        return customer.balance_usd || 0;
      default:
        return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMethod) return;

    setSubmitting(true);
    try {
      if (paymentType === 'invoice') {
        if (!selectedInvoice) {
          toast.error('يرجى اختيار فاتورة مستحقة');
          return;
        }

        const amount = toNumber(formData.amount);
        if (amount <= 0) {
          toast.error('يرجى إدخال مبلغ صحيح');
          return;
        }

        if (amount > selectedInvoice.remainingAmount) {
          toast.error('المبلغ أكبر من المتبقي في الفاتورة');
          return;
        }

        onAdd({
          customerId: selectedInvoice.customerId,
          invoiceId: selectedInvoice.subscriptionId || selectedInvoice.id,
          invoiceNumber: selectedInvoice.invoiceNumber,
          customerName: selectedInvoice.customerName,
          amount,
          currency: selectedInvoice.currency,
          method: selectedMethod.type,
          methodName: selectedMethod.name,
          reference: formData.reference,
          paidAt: new Date(formData.paidAt),
        });

        await applyInvoicePayment(selectedInvoice, amount);
        addCustomerActivity({
          customerId: selectedInvoice.customerId,
          type: 'payment',
          title: 'تم تسجيل سداد فاتورة',
          description: `${selectedInvoice.invoiceNumber} - ${selectedInvoice.customerName}`,
          amount,
          currency: selectedInvoice.currency,
          meta: {
            invoiceNumber: selectedInvoice.invoiceNumber,
            method: selectedMethod.name,
          },
        });
      } else if (paymentType === 'customer_balance') {
        if (!selectedCustomer) return;

        const amount = toNumber(formData.amount);
        const currency = formData.currency;
        const updateField = `balance_${currency.toLowerCase()}`;
        if (!['balance_sar', 'balance_yer', 'balance_usd'].includes(updateField)) {
          throw new Error('invalid_currency');
        }

        const accounts = await getCustomerAccounts();
        const account = accounts.find((a: any) => String(a?.id || '') === String(selectedCustomer.id));
        if (!account) throw new Error('account_not_found');
        const currentBalance = toNumber((account as any)?.[updateField]);
        const newBalance = currentBalance + amount;
        await updateCustomerAccountRecord(String(account.id), { [updateField]: newBalance } as any);

        const rawSession = localStorage.getItem('customer_session');
        if (rawSession) {
          const session = JSON.parse(rawSession);
          if (String(session?.id || '') === String(selectedCustomer.id)) {
            const nextSession = {
              ...session,
              balances: {
                balance_sar: toNumber(session?.balances?.balance_sar),
                balance_yer: toNumber(session?.balances?.balance_yer),
                balance_usd: toNumber(session?.balances?.balance_usd),
                [updateField]: newBalance,
              },
            };
            localStorage.setItem('customer_session', JSON.stringify(nextSession));
          }
        }

        onAdd({
          customerId: selectedCustomer.id,
          invoiceId: `balance_${selectedCustomer.id}_${Date.now()}`,
          invoiceNumber: `شحن رصيد - ${selectedCustomer.name}`,
          customerName: selectedCustomer.name,
          amount,
          currency,
          method: selectedMethod.type,
          methodName: selectedMethod.name,
          reference: formData.reference || formData.notes,
          paidAt: new Date(formData.paidAt),
          isBalancePayment: true,
        });

        addCustomerActivity({
          customerId: selectedCustomer.id,
          type: 'balance_add',
          title: 'تمت إضافة رصيد',
          description: `بواسطة ${selectedMethod.name}`,
          amount,
          currency,
        });

        toast.success(`تم إضافة ${amount.toLocaleString()} ${currency} لرصيد ${selectedCustomer.name}`);
      } else {
        if (!selectedCustomer) return;
        const amount = toNumber(formData.amount);
        if (amount <= 0) {
          toast.error('يرجى إدخال مبلغ صحيح');
          return;
        }

        const currency = formData.currency;
        const updateField = `balance_${currency.toLowerCase()}`;
        if (!['balance_sar', 'balance_yer', 'balance_usd'].includes(updateField)) {
          throw new Error('invalid_currency');
        }

        const accounts = await getCustomerAccounts();
        const account = accounts.find((a: any) => String(a?.id || '') === String(selectedCustomer.id));
        if (!account) throw new Error('account_not_found');
        const currentBalance = toNumber((account as any)?.[updateField]);
        const newBalance = currentBalance - amount;
        await updateCustomerAccountRecord(String(account.id), { [updateField]: newBalance } as any);

        const rawSession = localStorage.getItem('customer_session');
        if (rawSession) {
          const session = JSON.parse(rawSession);
          if (String(session?.id || '') === String(selectedCustomer.id)) {
            const nextSession = {
              ...session,
              balances: {
                balance_sar: toNumber(session?.balances?.balance_sar),
                balance_yer: toNumber(session?.balances?.balance_yer),
                balance_usd: toNumber(session?.balances?.balance_usd),
                [updateField]: newBalance,
              },
            };
            localStorage.setItem('customer_session', JSON.stringify(nextSession));
          }
        }

        onAdd({
          customerId: selectedCustomer.id,
          invoiceId: `debt_${selectedCustomer.id}_${Date.now()}`,
          invoiceNumber: `إضافة مديونية - ${selectedCustomer.name}`,
          customerName: selectedCustomer.name,
          amount: -amount,
          currency,
          method: selectedMethod.type,
          methodName: selectedMethod.name,
          reference: formData.reference || formData.notes,
          paidAt: new Date(formData.paidAt),
          isDebtAddition: true,
        });

        addCustomerActivity({
          customerId: selectedCustomer.id,
          type: 'balance_subtract',
          title: 'تمت إضافة مديونية',
          description: `بواسطة ${selectedMethod.name}`,
          amount,
          currency,
          meta: {
            note: formData.notes || '',
          },
        });

        toast.success(`تمت إضافة مديونية ${amount.toLocaleString()} ${currency} على ${selectedCustomer.name}`);
      }

      setFormData({
        invoiceId: '',
        customerId: '',
        amount: '',
        currency: 'SAR',
        methodId: '',
        reference: '',
        paidAt: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setPaymentType('invoice');
      onClose();
    } catch (error) {
      console.error('Payment submission failed:', error);
      toast.error('فشل في تسجيل الدفعة');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">تسجيل دفعة جديدة</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">نوع الدفعة</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentType('invoice')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  paymentType === 'invoice'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-muted-foreground text-muted-foreground'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">سداد فاتورة</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('customer_balance')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  paymentType === 'customer_balance'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-muted-foreground text-muted-foreground'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="font-medium">شحن رصيد عميل</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('customer_debt')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  paymentType === 'customer_debt'
                    ? 'border-destructive bg-destructive/10 text-destructive'
                    : 'border-border hover:border-muted-foreground text-muted-foreground'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="font-medium">إضافة مديونية</span>
              </button>
            </div>
          </div>

          {paymentType === 'invoice' ? (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                الفاتورة <span className="text-destructive">*</span>
              </label>
              {loadingInvoices ? (
                <div className="input-field flex items-center justify-center text-muted-foreground">جاري تحميل الفواتير...</div>
              ) : (
                <select
                  required
                  value={formData.invoiceId}
                  onChange={(e) => {
                    const invoice = outstandingInvoices.find((i) => i.id === e.target.value);
                    setFormData({
                      ...formData,
                      invoiceId: e.target.value,
                      amount: invoice ? String(invoice.remainingAmount) : '',
                      currency: invoice?.currency || 'SAR',
                    });
                  }}
                  className="input-field"
                >
                  <option value="">اختر الفاتورة</option>
                  {outstandingInvoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber} - {invoice.customerName} (متبقي {invoice.remainingAmount} {invoice.currency})
                    </option>
                  ))}
                </select>
              )}

              {!loadingInvoices && outstandingInvoices.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">لا توجد فواتير مستحقة حالياً.</p>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  العميل <span className="text-destructive">*</span>
                </label>
                {loadingCustomers ? (
                  <div className="input-field flex items-center justify-center text-muted-foreground">جاري التحميل...</div>
                ) : (
                  <select
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">اختر العميل</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.whatsapp_number}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  العملة <span className="text-destructive">*</span>
                </label>
                <select
                  required
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="input-field"
                >
                  {currencies.map((curr) => (
                    <option key={curr.value} value={curr.value}>
                      {curr.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="p-3 rounded-xl bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground mb-2">رصيد العميل الحالي:</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className={`p-2 rounded-lg ${formData.currency === 'SAR' ? 'bg-primary/10 ring-2 ring-primary' : 'bg-background'}`}>
                      <p className="text-xs text-muted-foreground">SAR</p>
                      <p className="font-bold text-foreground">{(selectedCustomer.balance_sar || 0).toLocaleString()}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${formData.currency === 'YER' ? 'bg-primary/10 ring-2 ring-primary' : 'bg-background'}`}>
                      <p className="text-xs text-muted-foreground">YER</p>
                      <p className="font-bold text-foreground">{(selectedCustomer.balance_yer || 0).toLocaleString()}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${formData.currency === 'USD' ? 'bg-primary/10 ring-2 ring-primary' : 'bg-background'}`}>
                      <p className="text-xs text-muted-foreground">USD</p>
                      <p className="font-bold text-foreground">{(selectedCustomer.balance_usd || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              طريقة الدفع <span className="text-destructive">*</span>
            </label>
            <select
              required
              value={formData.methodId}
              onChange={(e) => setFormData({ ...formData, methodId: e.target.value })}
              className="input-field"
            >
              <option value="">اختر طريقة الدفع</option>
              {activeMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                  {method.details && ` (${method.details})`}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                المبلغ <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                max={paymentType === 'invoice' && selectedInvoice ? selectedInvoice.remainingAmount : undefined}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                تاريخ الدفع <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.paidAt}
                onChange={(e) => setFormData({ ...formData, paidAt: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">رقم المرجع / العملية</label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="مثال: TXN-123456"
              className="input-field"
              dir="ltr"
            />
          </div>

          {(paymentType === 'customer_balance' || paymentType === 'customer_debt') && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">ملاحظات</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
                className="input-field min-h-[80px] resize-none"
              />
            </div>
          )}

          {paymentType === 'invoice' && selectedInvoice && (
            <div className="p-4 rounded-xl bg-success/5 border border-success/10 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">إجمالي الفاتورة:</span>
                <span className="font-medium text-foreground">{selectedInvoice.totalAmount} {selectedInvoice.currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">المسدّد سابقاً:</span>
                <span className="font-medium text-foreground">{selectedInvoice.paidAmount} {selectedInvoice.currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">المتبقي:</span>
                <span className="font-bold text-destructive">{selectedInvoice.remainingAmount} {selectedInvoice.currency}</span>
              </div>
            </div>
          )}

          {(paymentType === 'customer_balance' || paymentType === 'customer_debt') && selectedCustomer && formData.amount && (
            <div className={`p-4 rounded-xl border ${paymentType === 'customer_debt' ? 'bg-destructive/5 border-destructive/10' : 'bg-success/5 border-success/10'}`}>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">الرصيد الحالي ({formData.currency}):</span>
                <span className="font-medium text-foreground">{getCustomerBalance(selectedCustomer, formData.currency).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {paymentType === 'customer_debt' ? 'الرصيد بعد إضافة المديونية:' : 'الرصيد بعد الإضافة:'}
                </span>
                <span className={`font-bold ${paymentType === 'customer_debt' ? 'text-destructive' : 'text-success'}`}>
                  {(paymentType === 'customer_debt'
                    ? getCustomerBalance(selectedCustomer, formData.currency) - toNumber(formData.amount)
                    : getCustomerBalance(selectedCustomer, formData.currency) + toNumber(formData.amount)
                  ).toLocaleString()} {formData.currency}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting
                ? 'جاري الحفظ...'
                : paymentType === 'invoice'
                ? 'تسجيل الدفعة'
                : paymentType === 'customer_balance'
                ? 'شحن الرصيد'
                : 'إضافة المديونية'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
