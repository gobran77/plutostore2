import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Payment } from '@/types';
import { PaymentMethodType } from './PaymentMethodsModal';

interface EditPaymentModalProps {
  isOpen: boolean;
  payment: Payment | null;
  onClose: () => void;
  onSave: (payment: Payment) => void;
  paymentMethods: PaymentMethodType[];
}

export const EditPaymentModal = ({ 
  isOpen, 
  payment, 
  onClose, 
  onSave,
  paymentMethods 
}: EditPaymentModalProps) => {
  const [formData, setFormData] = useState({
    amount: '',
    methodId: '',
    reference: '',
    paidAt: '',
  });

  const activeMethods = paymentMethods.filter(m => m.active);

  useEffect(() => {
    if (payment) {
      const method = paymentMethods.find(m => m.name === (payment as any).methodName || m.type === payment.method);
      setFormData({
        amount: payment.amount.toString(),
        methodId: method?.id || '',
        reference: payment.reference || '',
        paidAt: payment.paidAt.toISOString().split('T')[0],
      });
    }
  }, [payment, paymentMethods]);

  if (!isOpen || !payment) return null;

  const selectedMethod = paymentMethods.find(m => m.id === formData.methodId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMethod) return;

    onSave({
      ...payment,
      amount: parseFloat(formData.amount),
      method: selectedMethod.type as any,
      reference: formData.reference,
      paidAt: new Date(formData.paidAt),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">تعديل الدفعة</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">الفاتورة</p>
            <p className="font-medium text-foreground">{payment.invoiceNumber}</p>
            <p className="text-sm text-muted-foreground">{payment.customerName}</p>
          </div>

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

          <div className="flex items-center gap-3 pt-4">
            <button type="submit" className="btn-primary flex-1">
              حفظ التعديلات
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
