import { useState } from 'react';
import { X, Plus, Edit, Trash2, CreditCard, Building2, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export interface PaymentMethodType {
  id: string;
  name: string;
  type: 'bank' | 'wallet' | 'card' | 'cash';
  icon?: string;
  details?: string;
  active: boolean;
}

interface PaymentMethodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  methods: PaymentMethodType[];
  onMethodsChange: (methods: PaymentMethodType[]) => void;
}

const defaultMethods: PaymentMethodType[] = [
  { id: '1', name: 'نقداً', type: 'cash', active: true },
  { id: '2', name: 'تحويل بنكي', type: 'bank', active: true },
  { id: '3', name: 'بطاقة ائتمان', type: 'card', active: true },
];

export const PaymentMethodsModal = ({ 
  isOpen, 
  onClose, 
  methods, 
  onMethodsChange 
}: PaymentMethodsModalProps) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank' as 'bank' | 'wallet' | 'card' | 'cash',
    details: '',
  });

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم طريقة الدفع');
      return;
    }

    const newMethod: PaymentMethodType = {
      id: Date.now().toString(),
      name: formData.name,
      type: formData.type,
      details: formData.details,
      active: true,
    };

    onMethodsChange([...methods, newMethod]);
    setFormData({ name: '', type: 'bank', details: '' });
    setIsAddingNew(false);
    toast.success('تمت إضافة طريقة الدفع بنجاح');
  };

  const handleEdit = (id: string) => {
    const method = methods.find(m => m.id === id);
    if (method) {
      setFormData({
        name: method.name,
        type: method.type,
        details: method.details || '',
      });
      setEditingId(id);
    }
  };

  const handleSaveEdit = () => {
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم طريقة الدفع');
      return;
    }

    onMethodsChange(methods.map(m => 
      m.id === editingId 
        ? { ...m, name: formData.name, type: formData.type, details: formData.details }
        : m
    ));
    setFormData({ name: '', type: 'bank', details: '' });
    setEditingId(null);
    toast.success('تم تحديث طريقة الدفع بنجاح');
  };

  const handleDelete = (id: string) => {
    onMethodsChange(methods.filter(m => m.id !== id));
    toast.success('تم حذف طريقة الدفع');
  };

  const handleToggleActive = (id: string) => {
    onMethodsChange(methods.map(m => 
      m.id === id ? { ...m, active: !m.active } : m
    ));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bank': return Building2;
      case 'wallet': return Wallet;
      case 'card': return CreditCard;
      default: return CreditCard;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bank': return 'بنك';
      case 'wallet': return 'محفظة';
      case 'card': return 'بطاقة';
      case 'cash': return 'نقداً';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-2xl mx-4 animate-scale-in border border-border max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">إدارة طرق الدفع والمحافظ</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Add New Button */}
          {!isAddingNew && !editingId && (
            <button
              onClick={() => setIsAddingNew(true)}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors mb-4"
            >
              <Plus className="w-5 h-5 text-primary" />
              <span className="font-medium text-primary">إضافة طريقة دفع جديدة</span>
            </button>
          )}

          {/* Add/Edit Form */}
          {(isAddingNew || editingId) && (
            <div className="bg-muted/50 rounded-xl p-4 mb-4 space-y-4">
              <h3 className="font-medium text-foreground">
                {editingId ? 'تعديل طريقة الدفع' : 'إضافة طريقة دفع جديدة'}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    الاسم <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: بنك الراجحي"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    النوع
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="input-field"
                  >
                    <option value="bank">بنك</option>
                    <option value="wallet">محفظة إلكترونية</option>
                    <option value="card">بطاقة</option>
                    <option value="cash">نقداً</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  تفاصيل إضافية (اختياري)
                </label>
                <input
                  type="text"
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  placeholder="مثال: رقم الحساب أو IBAN"
                  className="input-field"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={editingId ? handleSaveEdit : handleAdd}
                  className="btn-primary"
                >
                  {editingId ? 'حفظ التعديلات' : 'إضافة'}
                </button>
                <button
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingId(null);
                    setFormData({ name: '', type: 'bank', details: '' });
                  }}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* Methods List */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">طرق الدفع المتاحة</h3>
            
            {methods.map((method) => {
              const Icon = getTypeIcon(method.type);
              return (
                <div
                  key={method.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                    method.active 
                      ? 'border-border bg-card' 
                      : 'border-border/50 bg-muted/30 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${
                      method.type === 'bank' ? 'bg-primary/10 text-primary' :
                      method.type === 'wallet' ? 'bg-success/10 text-success' :
                      method.type === 'card' ? 'bg-warning/10 text-warning' :
                      'bg-secondary text-foreground'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{method.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getTypeLabel(method.type)}
                        {method.details && ` • ${method.details}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleActive(method.id)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        method.active ? 'bg-success' : 'bg-muted'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        method.active ? 'right-0.5' : 'right-5'
                      }`} />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleEdit(method.id)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(method.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <button onClick={onClose} className="btn-primary w-full">
            تم
          </button>
        </div>
      </div>
    </div>
  );
};

export const defaultPaymentMethods: PaymentMethodType[] = [
  { id: '1', name: 'نقداً', type: 'cash', active: true },
  { id: '2', name: 'تحويل بنكي', type: 'bank', active: true },
  { id: '3', name: 'بطاقة ائتمان', type: 'card', active: true },
  { id: '4', name: 'بنك الراجحي', type: 'bank', details: 'SA0000000000000000000', active: true },
  { id: '5', name: 'بنك الأهلي', type: 'bank', details: 'SA1111111111111111111', active: true },
  { id: '6', name: 'STC Pay', type: 'wallet', active: true },
  { id: '7', name: 'Apple Pay', type: 'wallet', active: true },
  { id: '8', name: 'مدى', type: 'card', active: true },
];
