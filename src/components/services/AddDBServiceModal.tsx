import { useState, useRef } from 'react';
import { X, Users, User, Upload, Image, Loader2 } from 'lucide-react';
import { ServicePricing } from '@/hooks/useServices';
import { supportedCurrencies, getCurrencySymbol } from '@/types/currency';
import { defaultPricingPeriods } from '@/types/services';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddDBServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (service: {
    name: string;
    description?: string;
    default_type: string;
    pricing: ServicePricing[];
    image_url?: string;
  }) => Promise<unknown>;
}

const initialPricing: ServicePricing[] = defaultPricingPeriods.map(p => ({
  periodDays: p.periodDays,
  periodName: p.periodName,
  buyPrice: 0,
  sellPrice: 0,
  currency: 'SAR',
}));

export const AddDBServiceModal = ({ isOpen, onClose, onAdd }: AddDBServiceModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultType, setDefaultType] = useState<'shared' | 'private'>('shared');
  const [pricing, setPricing] = useState<ServicePricing[]>(initialPricing);
  const [selectedCurrency, setSelectedCurrency] = useState('SAR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `services/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('service-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('service-images')
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
      toast.success('تم رفع الصورة بنجاح');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('فشل في رفع الصورة');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const validPricing = pricing.map(p => ({ ...p, currency: selectedCurrency }));
      await onAdd({ 
        name, 
        description, 
        default_type: defaultType, 
        pricing: validPricing,
        image_url: imageUrl || undefined,
      });
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error adding service:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setDefaultType('shared');
    setPricing(initialPricing);
    setSelectedCurrency('SAR');
    setImageUrl(null);
  };

  const updatePricing = (index: number, field: 'buyPrice' | 'sellPrice', value: string) => {
    const newPricing = [...pricing];
    newPricing[index] = { ...newPricing[index], [field]: parseFloat(value) || 0 };
    setPricing(newPricing);
  };

  const handleClose = () => {
    resetForm();
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
          <h2 className="text-xl font-bold text-foreground">إضافة خدمة للعملاء</h2>
          <button 
            onClick={handleClose} 
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              صورة الخدمة (اختياري)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            {imageUrl ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border">
                <img 
                  src={imageUrl} 
                  alt="Service preview" 
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 left-2 p-1.5 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/30 transition-all disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                    <span className="text-sm text-muted-foreground">جاري الرفع...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">اضغط لرفع صورة</span>
                    <span className="text-xs text-muted-foreground">PNG, JPG حتى 5MB</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              اسم الخدمة <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: ChatGPT Plus"
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
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !name.trim()}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {isSubmitting ? 'جاري الإضافة...' : 'إضافة الخدمة'}
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
