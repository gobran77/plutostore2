import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Customer } from '@/types';

const countries = [
  { name: 'السعودية', code: 'SA', phoneCode: '+966', currency: 'SAR' },
  { name: 'اليمن', code: 'YE', phoneCode: '+967', currency: 'YER' },
  { name: 'الإمارات', code: 'AE', phoneCode: '+971', currency: 'AED' },
  { name: 'الكويت', code: 'KW', phoneCode: '+965', currency: 'KWD' },
  { name: 'قطر', code: 'QA', phoneCode: '+974', currency: 'QAR' },
  { name: 'البحرين', code: 'BH', phoneCode: '+973', currency: 'BHD' },
  { name: 'عمان', code: 'OM', phoneCode: '+968', currency: 'OMR' },
  { name: 'مصر', code: 'EG', phoneCode: '+20', currency: 'EGP' },
  { name: 'الأردن', code: 'JO', phoneCode: '+962', currency: 'JOD' },
  { name: 'لبنان', code: 'LB', phoneCode: '+961', currency: 'LBP' },
  { name: 'العراق', code: 'IQ', phoneCode: '+964', currency: 'IQD' },
  { name: 'سوريا', code: 'SY', phoneCode: '+963', currency: 'SYP' },
  { name: 'فلسطين', code: 'PS', phoneCode: '+970', currency: 'ILS' },
  { name: 'السودان', code: 'SD', phoneCode: '+249', currency: 'SDG' },
  { name: 'ليبيا', code: 'LY', phoneCode: '+218', currency: 'LYD' },
  { name: 'تونس', code: 'TN', phoneCode: '+216', currency: 'TND' },
  { name: 'الجزائر', code: 'DZ', phoneCode: '+213', currency: 'DZD' },
  { name: 'المغرب', code: 'MA', phoneCode: '+212', currency: 'MAD' },
];

const currencies = [
  { code: 'SAR', name: 'ريال سعودي' },
  { code: 'YER', name: 'ريال يمني' },
  { code: 'USD', name: 'دولار أمريكي' },
  { code: 'AED', name: 'درهم إماراتي' },
  { code: 'EUR', name: 'يورو' },
  { code: 'KWD', name: 'دينار كويتي' },
  { code: 'QAR', name: 'ريال قطري' },
  { code: 'BHD', name: 'دينار بحريني' },
  { code: 'OMR', name: 'ريال عماني' },
  { code: 'EGP', name: 'جنيه مصري' },
];

// Helper to extract phone number without country code
const extractPhoneNumber = (whatsapp: string) => {
  for (const country of countries) {
    if (whatsapp.startsWith(country.phoneCode)) {
      return {
        phone: whatsapp.replace(country.phoneCode, ''),
        countryCode: country.code,
      };
    }
  }
  return { phone: whatsapp, countryCode: 'SA' };
};

// Helper to find country code from country name
const getCountryCodeFromName = (countryName: string) => {
  const country = countries.find(c => c.name === countryName);
  return country?.code || 'SA';
};

interface EditCustomerModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSave: (customer: Customer) => void;
}

export const EditCustomerModal = ({ isOpen, customer, onClose, onSave }: EditCustomerModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: 'SA',
    currency: 'SAR',
    notes: '',
    status: 'active' as 'active' | 'inactive' | 'blocked',
  });

  const selectedCountry = countries.find(c => c.code === formData.countryCode);

  useEffect(() => {
    if (customer) {
      const { phone, countryCode: extractedCode } = extractPhoneNumber(customer.whatsapp);
      const countryCode = customer.country ? getCountryCodeFromName(customer.country) : extractedCode;
      
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: phone,
        countryCode: countryCode,
        currency: customer.currency,
        notes: customer.notes || '',
        status: customer.status,
      });
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    setFormData({
      ...formData,
      countryCode: countryCode,
      currency: country?.currency || formData.currency,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullWhatsapp = selectedCountry ? `${selectedCountry.phoneCode}${formData.phone}` : formData.phone;
    onSave({
      ...customer,
      name: formData.name,
      email: formData.email,
      whatsapp: fullWhatsapp,
      country: selectedCountry?.name || '',
      currency: formData.currency,
      notes: formData.notes,
      status: formData.status,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">تعديل بيانات العميل</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                البريد الإلكتروني (اختياري)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@email.com"
                className="input-field"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                رقم الواتساب <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 bg-muted rounded-lg border border-border min-w-[80px] justify-center">
                  <span className="text-sm font-medium text-foreground" dir="ltr">
                    {selectedCountry?.phoneCode || '+966'}
                  </span>
                </div>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="501234567"
                  className="input-field flex-1"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                الدولة <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.countryCode}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="input-field"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name} ({country.phoneCode})
                  </option>
                ))}
              </select>
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
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              حالة العميل
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'blocked' })}
              className="input-field"
            >
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="blocked">محظور</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              ملاحظات
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="أي ملاحظات إضافية..."
              className="input-field min-h-[80px] resize-none"
            />
          </div>

          {/* Actions */}
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
