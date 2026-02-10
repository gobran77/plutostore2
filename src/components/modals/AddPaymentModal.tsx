import { useState, useEffect } from 'react';
import { X, FileText, User } from 'lucide-react';
import { PaymentMethodType } from './PaymentMethodsModal';
import { toast } from 'sonner';
import { CUSTOMER_ACCOUNTS_KEY } from '@/hooks/useCustomerPassword';

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

const mockInvoices = [
  { id: '1', number: 'INV-2024-001', customer: 'أحمد محمد الصالح', amount: 1500, currency: 'SAR' },
  { id: '2', number: 'INV-2024-002', customer: 'سارة أحمد العلي', amount: 800, currency: 'SAR' },
  { id: '3', number: 'INV-2024-003', customer: 'خالد عبدالله النمر', amount: 1500, currency: 'SAR' },
];

type PaymentType = 'invoice' | 'customer_balance';

const currencies = [
  { value: 'SAR', label: 'ريال سعودي (SAR)' },
  { value: 'YER', label: 'ريال يمني (YER)' },
  { value: 'USD', label: 'دولار أمريكي (USD)' },
];

export const AddPaymentModal = ({ 
  isOpen, 
  onClose, 
  onAdd,
  paymentMethods 
}: AddPaymentModalProps) => {
  const [paymentType, setPaymentType] = useState<PaymentType>('invoice');
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
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

  // Load customers for balance payment
  useEffect(() => {
    if (isOpen && paymentType === 'customer_balance') {
      loadCustomers();
    }
  }, [isOpen, paymentType]);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const raw = localStorage.getItem(CUSTOMER_ACCOUNTS_KEY);
      const accounts = raw ? JSON.parse(raw) : [];
      const list = (Array.isArray(accounts) ? accounts : [])
        .filter((a: any) => !a?.is_admin && a?.account_type !== 'admin')
        .filter((a: any) => a?.is_activated === true)
        .filter((a: any) => (a?.status || 'active') !== 'blocked')
        .map((a: any) => ({
          id: String(a.id),
          name: String(a.name || ''),
          whatsapp_number: String(a.whatsapp_number || ''),
          balance_sar: Number(a.balance_sar || 0),
          balance_yer: Number(a.balance_yer || 0),
          balance_usd: Number(a.balance_usd || 0),
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

  if (!isOpen) return null;

  const selectedInvoice = mockInvoices.find(i => i.id === formData.invoiceId);
  const selectedCustomer = customers.find(c => c.id === formData.customerId);
  const selectedMethod = paymentMethods.find(m => m.id === formData.methodId);
  const activeMethods = paymentMethods.filter(m => m.active);

  const getCustomerBalance = (customer: CustomerAccount, currency: string) => {
    switch (currency) {
      case 'SAR': return customer.balance_sar || 0;
      case 'YER': return customer.balance_yer || 0;
      case 'USD': return customer.balance_usd || 0;
      default: return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMethod) return;

    if (paymentType === 'invoice') {
      // Invoice payment
      if (!selectedInvoice) return;

      onAdd({
        invoiceId: formData.invoiceId,
        invoiceNumber: selectedInvoice.number,
        customerName: selectedInvoice.customer,
        amount: parseFloat(formData.amount),
        currency: selectedInvoice.currency,
        method: selectedMethod.type,
        methodName: selectedMethod.name,
        reference: formData.reference,
        paidAt: new Date(formData.paidAt),
      });
    } else {
      // Customer balance payment
      if (!selectedCustomer) return;

      setSubmitting(true);
      try {
        const amount = parseFloat(formData.amount);
        const currency = formData.currency;
        const currentBalance = getCustomerBalance(selectedCustomer, currency);
        const newBalance = currentBalance + amount;

        // Update customer balance locally in app_customer_accounts
        const updateField = `balance_${currency.toLowerCase()}`;
        const raw = localStorage.getItem(CUSTOMER_ACCOUNTS_KEY);
        const accounts = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(accounts)) throw new Error('invalid_accounts');
        const idx = accounts.findIndex((a: any) => String(a?.id || '') === String(selectedCustomer.id));
        if (idx === -1) throw new Error('account_not_found');
        accounts[idx] = { ...accounts[idx], [updateField]: newBalance };
        localStorage.setItem(CUSTOMER_ACCOUNTS_KEY, JSON.stringify(accounts));

        // Add to payments list
        onAdd({
          invoiceId: `balance_${selectedCustomer.id}_${Date.now()}`,
          invoiceNumber: `شحن رصيد - ${selectedCustomer.name}`,
          customerName: selectedCustomer.name,
          amount: amount,
          currency: currency,
          method: selectedMethod.type,
          methodName: selectedMethod.name,
          reference: formData.reference || formData.notes,
          paidAt: new Date(formData.paidAt),
          isBalancePayment: true,
        });

        toast.success(`تم إضافة ${amount.toLocaleString()} ${currency} لرصيد ${selectedCustomer.name}`);
      } catch (error) {
        console.error('Error updating balance:', error);
        toast.error('فشل في تحديث رصيد العميل');
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    }

    // Reset form
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">تسجيل دفعة جديدة</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Payment Type Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              نوع الدفعة
            </label>
            <div className="grid grid-cols-2 gap-2">
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
            </div>
          </div>

          {paymentType === 'invoice' ? (
            /* Invoice Payment Form */
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                الفاتورة <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={formData.invoiceId}
                onChange={(e) => {
                  const invoice = mockInvoices.find(i => i.id === e.target.value);
                  setFormData({ 
                    ...formData, 
                    invoiceId: e.target.value,
                    amount: invoice ? invoice.amount.toString() : '',
                    currency: invoice?.currency || 'SAR',
                  });
                }}
                className="input-field"
              >
                <option value="">اختر الفاتورة</option>
                {mockInvoices.map(invoice => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.number} - {invoice.customer} ({invoice.amount} {invoice.currency})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            /* Customer Balance Payment Form */
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  العميل <span className="text-destructive">*</span>
                </label>
                {loadingCustomers ? (
                  <div className="input-field flex items-center justify-center text-muted-foreground">
                    جاري التحميل...
                  </div>
                ) : (
                  <select
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">اختر العميل</option>
                    {customers.map(customer => (
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
                  {currencies.map(curr => (
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
              {activeMethods.map(method => (
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
            <label className="block text-sm font-medium text-foreground mb-2">
              رقم المرجع / العملية
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="مثال: TXN-123456"
              className="input-field"
              dir="ltr"
            />
          </div>

          {paymentType === 'customer_balance' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                ملاحظات
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
                className="input-field min-h-[80px] resize-none"
              />
            </div>
          )}

          {paymentType === 'invoice' && selectedInvoice && (
            <div className="p-4 rounded-xl bg-success/5 border border-success/10">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">مبلغ الفاتورة:</span>
                <span className="font-medium text-foreground">{selectedInvoice.amount} {selectedInvoice.currency}</span>
              </div>
            </div>
          )}

          {paymentType === 'customer_balance' && selectedCustomer && formData.amount && (
            <div className="p-4 rounded-xl bg-success/5 border border-success/10">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">الرصيد الحالي ({formData.currency}):</span>
                <span className="font-medium text-foreground">
                  {getCustomerBalance(selectedCustomer, formData.currency).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">الرصيد بعد الإضافة:</span>
                <span className="font-bold text-success">
                  {(getCustomerBalance(selectedCustomer, formData.currency) + parseFloat(formData.amount || '0')).toLocaleString()} {formData.currency}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            <button 
              type="submit" 
              className="btn-primary flex-1"
              disabled={submitting}
            >
              {submitting ? 'جاري الحفظ...' : paymentType === 'invoice' ? 'تسجيل الدفعة' : 'شحن الرصيد'}
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
