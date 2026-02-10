import { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { Invoice, InvoiceStatus } from '@/types';
import { supportedCurrencies } from '@/types/currency';

interface EditInvoiceModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onSave: (invoice: Invoice) => void;
}

export const EditInvoiceModal = ({ isOpen, invoice, onClose, onSave }: EditInvoiceModalProps) => {
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'SAR',
    tax: '0',
    discount: '0',
    status: 'unpaid' as InvoiceStatus,
    dueAt: '',
  });

  useEffect(() => {
    if (invoice && isOpen) {
      setFormData({
        amount: invoice.amount.toString(),
        currency: invoice.currency,
        tax: invoice.tax.toString(),
        discount: invoice.discount.toString(),
        status: invoice.status,
        dueAt: invoice.dueAt.toISOString().split('T')[0],
      });
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave({
      ...invoice,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      tax: parseFloat(formData.tax) || 0,
      discount: parseFloat(formData.discount) || 0,
      status: formData.status,
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
            <div>
              <h2 className="text-xl font-bold text-foreground">تعديل الفاتورة</h2>
              <p className="text-sm text-muted-foreground font-mono">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">العميل</p>
            <p className="font-medium text-foreground">{invoice.customerName}</p>
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
              حفظ التغييرات
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
