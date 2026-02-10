import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import {
  Mail,
  MessageCircle,
  CreditCard,
  Globe,
  Bell,
  Shield,
  Save,
  TestTube,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('email');

  const tabs = [
    { id: 'email', label: 'البريد الإلكتروني', icon: Mail },
    { id: 'whatsapp', label: 'واتساب', icon: MessageCircle },
    { id: 'payment', label: 'الدفع', icon: CreditCard },
    { id: 'currency', label: 'العملات', icon: Globe },
    { id: 'notifications', label: 'التنبيهات', icon: Bell },
    { id: 'security', label: 'الأمان', icon: Shield },
  ];

  return (
    <MainLayout>
      <Header title="الإعدادات" subtitle="إدارة إعدادات النظام والتكاملات" />

      <div className="p-6 animate-fade-in">
        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <div className="w-64 shrink-0">
            <div className="bg-card rounded-xl border border-border p-2 shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'email' && (
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    إعدادات البريد الإلكتروني
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    قم بإعداد مزود البريد الإلكتروني لإرسال الرسائل
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      المزود
                    </label>
                    <select className="input-field">
                      <option>SMTP مخصص</option>
                      <option>SendGrid</option>
                      <option>Mailgun</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        خادم SMTP
                      </label>
                      <input
                        type="text"
                        placeholder="smtp.example.com"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        المنفذ
                      </label>
                      <input
                        type="text"
                        placeholder="587"
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        اسم المستخدم
                      </label>
                      <input
                        type="text"
                        placeholder="user@example.com"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        كلمة المرور
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      البريد المرسل منه
                    </label>
                    <input
                      type="email"
                      placeholder="noreply@example.com"
                      className="input-field"
                    />
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="text-sm text-success font-medium">
                      الاتصال ناجح - تم التحقق من الإعدادات
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <button className="btn-primary">
                    <Save className="w-4 h-4" />
                    حفظ الإعدادات
                  </button>
                  <button className="btn-secondary">
                    <TestTube className="w-4 h-4" />
                    اختبار الإرسال
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'whatsapp' && (
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    إعدادات واتساب
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    قم بربط حساب WhatsApp Business API الخاص بك
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      المزود
                    </label>
                    <select className="input-field">
                      <option>WhatsApp Business API</option>
                      <option>Twilio</option>
                      <option>MessageBird</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      placeholder="+966501234567"
                      className="input-field"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      مفتاح API
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Webhook URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://api.example.com/webhook"
                      className="input-field"
                      dir="ltr"
                    />
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    <span className="text-sm text-warning font-medium">
                      لم يتم التحقق من الاتصال بعد
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <button className="btn-primary">
                    <Save className="w-4 h-4" />
                    حفظ الإعدادات
                  </button>
                  <button className="btn-secondary">
                    <TestTube className="w-4 h-4" />
                    اختبار الإرسال
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'currency' && (
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    إعدادات العملات
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    إدارة العملات المدعومة في النظام
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      العملة الافتراضية
                    </label>
                    <select className="input-field">
                      <option>ريال سعودي (SAR)</option>
                      <option>درهم إماراتي (AED)</option>
                      <option>دولار أمريكي (USD)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      العملات المفعّلة
                    </label>
                    <div className="space-y-2">
                      {[
                        { code: 'SAR', name: 'ريال سعودي', symbol: 'ر.س' },
                        { code: 'AED', name: 'درهم إماراتي', symbol: 'د.إ' },
                        { code: 'USD', name: 'دولار أمريكي', symbol: '$' },
                        { code: 'EUR', name: 'يورو', symbol: '€' },
                      ].map((currency) => (
                        <label
                          key={currency.code}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            defaultChecked={['SAR', 'AED', 'USD'].includes(currency.code)}
                            className="w-4 h-4 rounded border-input"
                          />
                          <span className="font-medium text-foreground">
                            {currency.name}
                          </span>
                          <span className="text-muted-foreground">
                            ({currency.symbol})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <button className="btn-primary">
                    <Save className="w-4 h-4" />
                    حفظ الإعدادات
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    إعدادات التنبيهات
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    تخصيص التنبيهات التلقائية
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">تنبيهات الاشتراكات</h4>
                    {[
                      { label: 'قبل انتهاء الاشتراك بـ 7 أيام', enabled: true },
                      { label: 'قبل انتهاء الاشتراك بـ 3 أيام', enabled: true },
                      { label: 'قبل انتهاء الاشتراك بـ 1 يوم', enabled: true },
                      { label: 'عند انتهاء الاشتراك', enabled: true },
                      { label: 'بعد انتهاء الاشتراك بـ 2 يوم', enabled: false },
                    ].map((item) => (
                      <label
                        key={item.label}
                        className="flex items-center justify-between p-3 rounded-lg border border-border"
                      >
                        <span className="text-foreground">{item.label}</span>
                        <div className="relative">
                          <input
                            type="checkbox"
                            defaultChecked={item.enabled}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-muted rounded-full peer-checked:bg-primary transition-colors cursor-pointer" />
                          <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform cursor-pointer" />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <button className="btn-primary">
                    <Save className="w-4 h-4" />
                    حفظ الإعدادات
                  </button>
                </div>
              </div>
            )}

            {(activeTab === 'payment' || activeTab === 'security') && (
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    {activeTab === 'payment' ? (
                      <CreditCard className="w-8 h-8 text-muted-foreground" />
                    ) : (
                      <Shield className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {activeTab === 'payment' ? 'إعدادات الدفع' : 'إعدادات الأمان'}
                  </h3>
                  <p className="text-muted-foreground">
                    هذا القسم قيد التطوير وسيكون متاحاً قريباً
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
