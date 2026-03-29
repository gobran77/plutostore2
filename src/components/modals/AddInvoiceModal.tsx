import { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { Invoice, Customer, InvoiceStatus } from '@/types';
import { supportedCurrencies } from '@/types/currency';
import { generateInvoiceNumber } from '@/utils/invoicePaymentUtils';

interface AddInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (invoice: Omit<Invoice, 'id'>) => void;
  customers: Customer[];
}

export const AddInvoiceModal = ({ isOpen, onClose, onAdd, customers }: AddInvoiceModalProps) => {
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    subscriptionId: '',
    invoiceNumber: '',
    amount: '',
    currency: 'SAR',
    tax: '0',
    discount: '0',
    status: 'unpaid' as InvoiceStatus,
    dueAt: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        customerId: '',
        customerName: '',
        subscriptionId: '',
        invoiceNumber: generateInvoiceNumber(),
        amount: '',
        currency: 'SAR',
        tax: '0',
        discount: '0',
        status: 'unpaid',
        dueAt: new Date().toISOString().split('T')[0],
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customerId: customer.id,
        customerName: customer.name,
        currency: customer.currency,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.amount) return;

    onAdd({
      customerId: formData.customerId,
      customerName: formData.customerName,
      subscriptionId: formData.subscriptionId || `sub_${Date.now()}`,
      invoiceNumber: formData.invoiceNumber,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      tax: parseFloat(formData.tax) || 0,
      discount: parseFloat(formData.discount) || 0,
      status: formData.status,
      issuedAt: new Date(),
      dueAt: new Date(formData.dueAt),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">إنشاء فاتورة</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              العميل <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="input-field"
              required
            >
              <option value="">اختر العميل</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              رقم الفاتورة
            </label>
            <input
              type="text"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              className="input-field font-mono"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                المبلغ <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="input-field"
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                العملة
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="input-field"
              >
                {supportedCurrencies.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol} - {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                الضريبة
              </label>
              <input
                type="number"
                value={formData.tax}
                onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                className="input-field"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                الخصم
              </label>
              <input
                type="number"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                className="input-field"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              تاريخ الاستحقاق
            </label>
            <input
              type="date"
              value={formData.dueAt}
              onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              الحالة
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'paid' })}
                className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                  formData.status === 'paid'
                    ? 'bg-success/10 border-success text-success'
                    : 'border-border text-muted-foreground'
                }`}
              >
                مدفوعة
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'partially_paid' })}
                className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                  formData.status === 'partially_paid'
                    ? 'bg-warning/10 border-warning text-warning'
                    : 'border-border text-muted-foreground'
                }`}
              >
                جزئية
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'unpaid' })}
                className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                  formData.status === 'unpaid'
                    ? 'bg-destructive/10 border-destructive text-destructive'
                    : 'border-border text-muted-foreground'
                }`}
              >
                غير مدفوعة
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button type="submit" className="btn-primary flex-1">
              إنشاء الفاتورة
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
