import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  createCustomerAccountRecord,
  getCustomerAccounts,
  type CustomerAccountRecord,
} from '@/lib/customerAccountsStorage';

const countries = [
  { name: 'السعودية', code: 'SA', phoneCode: '+966' },
  { name: 'اليمن', code: 'YE', phoneCode: '+967' },
  { name: 'مصر', code: 'EG', phoneCode: '+20' },
  { name: 'الإمارات', code: 'AE', phoneCode: '+971' },
  { name: 'الكويت', code: 'KW', phoneCode: '+965' },
  { name: 'قطر', code: 'QA', phoneCode: '+974' },
  { name: 'البحرين', code: 'BH', phoneCode: '+973' },
  { name: 'عمان', code: 'OM', phoneCode: '+968' },
  { name: 'الأردن', code: 'JO', phoneCode: '+962' },
  { name: 'العراق', code: 'IQ', phoneCode: '+964' },
];

const currencies = [
  { code: 'SAR', name: 'ريال سعودي' },
  { code: 'YER', name: 'ريال يمني' },
  { code: 'USD', name: 'دولار أمريكي' },
  { code: 'AED', name: 'درهم إماراتي' },
  { code: 'EGP', name: 'جنيه مصري' },
];

interface AddCustomerAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddCustomerAccountModal = ({ isOpen, onClose, onSuccess }: AddCustomerAccountModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '+966',
    password: '',
    currency: 'SAR',
  });

  const generateActivationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim() || !formData.password.trim()) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    // Validate phone number (digits only)
    if (!/^\d+$/.test(formData.phone)) {
      toast.error('رقم الهاتف يجب أن يحتوي على أرقام فقط');
      return;
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast.error('صيغة البريد الإلكتروني غير صحيحة');
      return;
    }

    setIsLoading(true);

    try {
      const fullWhatsappNumber = `${formData.countryCode}${formData.phone}`.replace(/\+/g, '');
      const activationCode = generateActivationCode();

      // Check if phone number already exists (local storage)
      const accounts = await getCustomerAccounts();
      const existing = accounts.find((a) => String(a?.whatsapp_number || '').trim() === String(fullWhatsappNumber).trim());
      if (existing) {
        toast.error('رقم الهاتف مسجل مسبقاً');
        setIsLoading(false);
        return;
      }

      const emailValue = formData.email.trim().toLowerCase();
      if (emailValue) {
        const emailExists = accounts.find(
          (a) => String((a as any)?.email || '').trim().toLowerCase() === emailValue
        );
        if (emailExists) {
          toast.error('Email already registered');
          setIsLoading(false);
          return;
        }
      }

      const now = new Date().toISOString();
      const newCustomer: CustomerAccountRecord = {
        id: `cust_${Date.now()}`,
        name: formData.name.trim(),
        email: emailValue,
        whatsapp_number: fullWhatsappNumber,
        password_hash: formData.password,
        currency: formData.currency,
        activation_code: activationCode,
        is_activated: false,
        is_admin: false,
        account_type: 'customer',
        status: 'inactive',
        created_at: now,
        balance: 0,
        balance_sar: 0,
        balance_yer: 0,
        balance_usd: 0,
      };
      await createCustomerAccountRecord(newCustomer);

      toast.success('تم إنشاء حساب العميل بنجاح');
      setFormData({
        name: '',
        email: '',
        phone: '',
        countryCode: '+966',
        password: '',
        currency: 'SAR',
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating customer:', err);
      toast.error('حدث خطأ في إنشاء الحساب');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">إضافة عميل جديد</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              الاسم الكامل <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="أدخل اسم العميل"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              البريد الإلكتروني (اختياري)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="customer@example.com"
              className="input-field"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              رقم الواتساب <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={formData.countryCode}
                onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                className="input-field w-32"
                dir="ltr"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.phoneCode}>
                    {country.phoneCode} {country.name}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                placeholder="501234567"
                className="input-field flex-1"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              كلمة المرور <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="أدخل كلمة مرور للعميل"
              className="input-field"
              dir="ltr"
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
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.name} ({currency.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'جاري الإنشاء...' : 'إضافة العميل'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
