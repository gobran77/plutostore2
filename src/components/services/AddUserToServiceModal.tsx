import { useState } from 'react';
import { X } from 'lucide-react';
import { Customer } from '@/types';
import { ServiceUser } from '@/types/services';
import { CustomerSearchSelect } from './CustomerSearchSelect';

interface AddUserToServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (user: Omit<ServiceUser, 'id' | 'linkedAt'>) => void;
  customers: Customer[];
}

export const AddUserToServiceModal = ({
  isOpen,
  onClose,
  onAdd,
  customers,
}: AddUserToServiceModalProps) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [useManualEntry, setUseManualEntry] = useState(false);

  const handleSubmit = () => {
    if (useManualEntry) {
      if (!manualName.trim() || !manualEmail.trim()) return;
      onAdd({
        name: manualName,
        email: manualEmail,
      });
    } else {
      if (!selectedCustomer) return;
      onAdd({
        customerId: selectedCustomer.id,
        name: selectedCustomer.name,
        email: selectedCustomer.email,
        phone: selectedCustomer.whatsapp,
      });
    }
    handleClose();
  };

  const handleClose = () => {
    setSelectedCustomer(null);
    setManualName('');
    setManualEmail('');
    setUseManualEntry(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">إضافة مستخدم</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Toggle between customer search and manual entry */}
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setUseManualEntry(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                !useManualEntry
                  ? 'bg-card shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              اختيار من العملاء
            </button>
            <button
              type="button"
              onClick={() => setUseManualEntry(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                useManualEntry
                  ? 'bg-card shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              إدخال يدوي
            </button>
          </div>

          {!useManualEntry ? (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                اختر العميل <span className="text-destructive">*</span>
              </label>
              <CustomerSearchSelect
                customers={customers}
                selectedCustomer={selectedCustomer}
                onSelect={setSelectedCustomer}
                placeholder="ابحث بالاسم أو الرقم أو الإيميل..."
              />
              {customers.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  لا يوجد عملاء مسجلين. يمكنك الإدخال يدوياً أو إضافة عملاء أولاً.
                </p>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  اسم المستخدم <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="اسم المستخدم"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  البريد الإلكتروني <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="input-field"
                  dir="ltr"
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={useManualEntry ? !manualName.trim() || !manualEmail.trim() : !selectedCustomer}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              إضافة المستخدم
            </button>
            <button onClick={handleClose} className="btn-secondary">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
