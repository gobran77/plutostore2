import { useState } from 'react';
import { X, Users, User, Plus, Trash2 } from 'lucide-react';
import { Service, ServiceType, ServicePricing, defaultPricingPeriods } from '@/types/services';
import { supportedCurrencies, getCurrencySymbol } from '@/types/currency';

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (service: Omit<Service, 'id' | 'accounts' | 'createdAt'>) => void;
}

const initialPricing: ServicePricing[] = defaultPricingPeriods.map(p => ({
  periodDays: p.periodDays,
  periodName: p.periodName,
  buyPrice: 0,
  sellPrice: 0,
  currency: 'SAR',
}));

export const AddServiceModal = ({ isOpen, onClose, onAdd }: AddServiceModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultType, setDefaultType] = useState<ServiceType>('shared');
  const [pricing, setPricing] = useState<ServicePricing[]>(initialPricing);
  const [selectedCurrency, setSelectedCurrency] = useState('SAR');

  const handleSubmit = () => {
    if (!name.trim()) return;
    
    // Filter out pricing with 0 values and update currency
    const validPricing = pricing.map(p => ({ ...p, currency: selectedCurrency }));
    
    onAdd({ name, description, defaultType, pricing: validPricing });
    setName('');
    setDescription('');
    setDefaultType('shared');
    setPricing(initialPricing);
    onClose();
  };

  const updatePricing = (index: number, field: 'buyPrice' | 'sellPrice', value: string) => {
    const newPricing = [...pricing];
    newPricing[index] = { ...newPricing[index], [field]: parseFloat(value) || 0 };
    setPricing(newPricing);
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setDefaultType('shared');
    setPricing(initialPricing);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" 
        onClick={handleClose} 
      />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-2xl mx-4 animate-scale-in border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-xl font-bold text-foreground">إضافة خدمة جديدة</h2>
          <button 
            onClick={handleClose} 
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              اسم الخدمة <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: ChatGPT"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              نوع الخدمة الافتراضي
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDefaultType('shared')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  defaultType === 'shared'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Users className={`w-6 h-6 mx-auto mb-2 ${
                  defaultType === 'shared' ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <p className="font-medium text-foreground">مشترك</p>
                <p className="text-xs text-muted-foreground">
                  حساب واحد لعدة مستخدمين
                </p>
              </button>
              <button
                type="button"
                onClick={() => setDefaultType('private')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  defaultType === 'private'
                    ? 'border-success bg-success/5'
                    : 'border-border hover:border-success/50'
                }`}
              >
                <User className={`w-6 h-6 mx-auto mb-2 ${
                  defaultType === 'private' ? 'text-success' : 'text-muted-foreground'
                }`} />
                <p className="font-medium text-foreground">خاص</p>
                <p className="text-xs text-muted-foreground">
                  حساب مستقل لكل مشترك
                </p>
              </button>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-foreground">
                تسعير الخدمة حسب الفترات
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="input-field w-auto text-sm"
              >
                {supportedCurrencies.map((c) => (
                  <option key={c.code} value={c.code}>{c.symbol} - {c.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-3">
              {pricing.map((p, index) => (
                <div key={p.periodDays} className="grid grid-cols-3 gap-3 items-center bg-muted/30 rounded-lg p-3">
                  <div className="text-sm font-medium text-foreground">{p.periodName}</div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">سعر الشراء</label>
                    <input
                      type="number"
                      value={p.buyPrice || ''}
                      onChange={(e) => updatePricing(index, 'buyPrice', e.target.value)}
                      placeholder="0"
                      className="input-field text-sm py-1.5"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">سعر البيع</label>
                    <input
                      type="number"
                      value={p.sellPrice || ''}
                      onChange={(e) => updatePricing(index, 'sellPrice', e.target.value)}
                      placeholder="0"
                      className="input-field text-sm py-1.5"
                      min="0"
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * اترك القيمة 0 للفترات التي لا تريد تفعيلها
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              الوصف (اختياري)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر للخدمة..."
              className="input-field min-h-[80px] resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button onClick={handleSubmit} className="btn-primary flex-1">
              إضافة الخدمة
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
