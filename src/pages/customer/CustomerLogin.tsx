import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Zap, Phone, Lock, Eye, EyeOff, KeyRound, ArrowRight, Tag } from 'lucide-react';
import { ServicesPricingModal } from '@/components/customer/ServicesPricingModal';
import { getCustomerAccounts, updateCustomerAccountRecord } from '@/lib/customerAccountsStorage';
import { sendActivationOtpEmail } from '@/lib/otpEmail';
import { toast } from 'sonner';

interface PendingCustomer {
  id: string;
  name: string;
  whatsapp_number: string;
  balance: number;
  currency: string;
  activation_code: string;
}

const normalizeDigits = (value: string): string => {
  const arabicIndic = '\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669';
  const easternArabicIndic = '\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9';

  return String(value ?? '')
    .split('')
    .map((ch) => {
      const idxArabic = arabicIndic.indexOf(ch);
      if (idxArabic !== -1) return String(idxArabic);

      const idxEastern = easternArabicIndic.indexOf(ch);
      if (idxEastern !== -1) return String(idxEastern);

      return ch;
    })
    .join('');
};

const normalizeWhatsapp = (value: string): string => normalizeDigits(value).replace(/\D/g, '');

const isSameWhatsapp = (accountNumber: string, inputNumber: string): boolean => {
  const account = normalizeWhatsapp(accountNumber);
  const input = normalizeWhatsapp(inputNumber);

  if (!account || !input) return false;
  if (account === input) return true;

  if (account.length >= 8 && input.length >= 8) {
    return account.endsWith(input) || input.endsWith(account);
  }

  return false;
};

const generateCode = (): string => Math.floor(100000 + Math.random() * 900000).toString();

export default function CustomerLogin() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'login' | 'activation' | 'forgotRequest' | 'forgotReset'>('login');

  const [activationCode, setActivationCode] = useState('');
  const [pendingCustomer, setPendingCustomer] = useState<PendingCustomer | null>(null);

  const [resetWhatsapp, setResetWhatsapp] = useState('');
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pendingReset, setPendingReset] = useState<PendingCustomer | null>(null);

  const [showPricingModal, setShowPricingModal] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!whatsappNumber.trim() || !password.trim()) {
      toast.error('الرجاء إدخال رقم الواتساب وكلمة المرور');
      return;
    }

    setIsLoading(true);

    try {
      const accounts = await getCustomerAccounts();

      if (accounts.length === 0) {
        toast.error('No saved accounts found.');
        return;
      }

      const customer = accounts.find((a) => isSameWhatsapp(String(a.whatsapp_number || ''), whatsappNumber));

      if (!customer) {
        toast.error('رقم الواتساب غير مسجل');
        return;
      }

      if (customer.password_hash !== password) {
        toast.error('كلمة المرور غير صحيحة');
        return;
      }

      const isAdmin = (customer as any).is_admin === true || (customer as any).account_type === 'admin';

      if (isAdmin) {
        localStorage.setItem(
          'admin_session',
          JSON.stringify({
            id: customer.id,
            name: customer.name,
            whatsapp_number: customer.whatsapp_number,
            is_admin: true,
          })
        );

        toast.success(`مرحباً ${customer.name}`);
        navigate('/');
        return;
      }

      const newActivationCode = generateCode();
      await updateCustomerAccountRecord(customer.id, { activation_code: newActivationCode });

      const email = String((customer as any)?.email || '').trim();
      if (email) {
        const emailResult = await sendActivationOtpEmail({
          to: email,
          customerName: customer.name,
          code: newActivationCode,
        });

        if (emailResult.ok) {
          toast.success('OTP sent to your email');
        } else {
          toast.error(`OTP email failed: ${emailResult.error || 'unknown error'}`);
        }
      }

      setPendingCustomer({
        id: customer.id,
        name: customer.name,
        whatsapp_number: customer.whatsapp_number,
        balance: customer.balance || 0,
        currency: customer.currency || 'SAR',
        activation_code: newActivationCode,
      });
      setStep('activation');
    } catch (err) {
      console.error('Login error:', err);
      toast.error('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activationCode.trim()) {
      toast.error('الرجاء إدخال كود التفعيل');
      return;
    }

    if (!pendingCustomer) {
      toast.error('حدث خطأ، يرجى المحاولة مرة أخرى');
      setStep('login');
      return;
    }

    setIsLoading(true);

    try {
      if (activationCode.trim() !== pendingCustomer.activation_code) {
        toast.error('كود التفعيل غير صحيح');
        return;
      }

      await updateCustomerAccountRecord(pendingCustomer.id, { is_activated: true, status: 'active' });

      localStorage.setItem(
        'customer_session',
        JSON.stringify({
          id: pendingCustomer.id,
          name: pendingCustomer.name,
          whatsapp_number: pendingCustomer.whatsapp_number,
          balance: pendingCustomer.balance,
          currency: pendingCustomer.currency,
          activation_code: pendingCustomer.activation_code,
        })
      );

      toast.success(`مرحباً ${pendingCustomer.name}`);
      navigate('/customer/dashboard');
    } catch (err) {
      console.error('Activation error:', err);
      toast.error('حدث خطأ أثناء التفعيل');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetWhatsapp.trim()) {
      toast.error('أدخل رقم الواتساب');
      return;
    }

    setIsLoading(true);
    try {
      const accounts = await getCustomerAccounts();
      const customer = accounts.find((a) => isSameWhatsapp(String(a.whatsapp_number || ''), resetWhatsapp));

      if (!customer) {
        toast.error('رقم الواتساب غير مسجل');
        return;
      }

      const email = String((customer as any)?.email || '').trim();
      if (!email) {
        toast.error('لا يوجد بريد إلكتروني لهذا الحساب');
        return;
      }

      const resetCode = generateCode();
      await updateCustomerAccountRecord(customer.id, { activation_code: resetCode });

      const emailResult = await sendActivationOtpEmail({
        to: email,
        customerName: customer.name,
        code: resetCode,
      });

      if (!emailResult.ok) {
        toast.error(`OTP email failed: ${emailResult.error || 'unknown error'}`);
        return;
      }

      setPendingReset({
        id: customer.id,
        name: customer.name,
        whatsapp_number: customer.whatsapp_number,
        balance: customer.balance || 0,
        currency: customer.currency || 'SAR',
        activation_code: resetCode,
      });
      setStep('forgotReset');
      toast.success('تم إرسال كود إعادة التعيين إلى البريد الإلكتروني');
    } catch (error) {
      console.error('Forgot password request failed:', error);
      toast.error('تعذر بدء إعادة تعيين كلمة المرور');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pendingReset) {
      toast.error('اطلب كود إعادة التعيين أولاً');
      setStep('forgotRequest');
      return;
    }

    if (!resetCodeInput.trim() || !newPassword.trim()) {
      toast.error('أدخل الكود وكلمة المرور الجديدة');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب ألا تقل عن 6 أحرف');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }

    if (resetCodeInput.trim() !== pendingReset.activation_code) {
      toast.error('كود إعادة التعيين غير صحيح');
      return;
    }

    setIsLoading(true);
    try {
      await updateCustomerAccountRecord(pendingReset.id, {
        password_hash: newPassword,
      });

      toast.success('تم تحديث كلمة المرور بنجاح');
      setStep('login');
      setWhatsappNumber(resetWhatsapp);
      setPassword('');
      setResetCodeInput('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPendingReset(null);
    } catch (error) {
      console.error('Password reset failed:', error);
      toast.error('تعذر إعادة تعيين كلمة المرور');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('login');
    setActivationCode('');
    setPendingCustomer(null);
    setResetCodeInput('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPendingReset(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        <div className="bg-gradient-primary p-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4 shadow-lg">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">بلوتو ستور AI</h1>
          <p className="text-white/80 text-sm">بوابة العملاء</p>
        </div>

        <CardHeader className="text-center pt-6 pb-2">
          <h2 className="text-xl font-semibold text-foreground">
            {step === 'login' && 'تسجيل الدخول'}
            {step === 'activation' && 'تفعيل الحساب'}
            {step === 'forgotRequest' && 'نسيت كلمة المرور'}
            {step === 'forgotReset' && 'إعادة تعيين كلمة المرور'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {step === 'login' && 'أدخل بيانات حسابك للمتابعة'}
            {step === 'activation' && `مرحباً ${pendingCustomer?.name}، أدخل كود التفعيل`}
            {step === 'forgotRequest' && 'أدخل رقم الواتساب لإرسال كود إعادة التعيين'}
            {step === 'forgotReset' && 'أدخل الكود وكلمة المرور الجديدة'}
          </p>
        </CardHeader>

        <CardContent className="p-6 pt-2">
          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-sm font-medium">
                  رقم الواتساب
                </Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="whatsapp"
                    type="tel"
                    placeholder="966XXXXXXXXX"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="pr-11 h-12 text-base"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="أدخل كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-11 pl-11 h-12 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-gradient-primary hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setResetWhatsapp(whatsappNumber);
                  setStep('forgotRequest');
                }}
                className="w-full text-sm text-primary hover:underline"
              >
                نسيت كلمة المرور؟
              </button>
            </form>
          )}

          {step === 'activation' && (
            <form onSubmit={handleActivation} className="space-y-5">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                العودة لتسجيل الدخول
              </button>

              <div className="space-y-2">
                <Label htmlFor="activation" className="text-sm font-medium">
                  كود التفعيل
                </Label>
                <div className="relative">
                  <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="activation"
                    type="text"
                    placeholder="أدخل كود التفعيل"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    className="pr-11 h-12 text-base text-center tracking-widest font-mono"
                    dir="ltr"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">الكود مكون من 6 أرقام ومُرسل إلى البريد الإلكتروني</p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-gradient-primary hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading ? 'جاري التفعيل...' : 'تفعيل الحساب'}
              </Button>
            </form>
          )}

          {step === 'forgotRequest' && (
            <form onSubmit={handleForgotRequest} className="space-y-5">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                العودة لتسجيل الدخول
              </button>

              <div className="space-y-2">
                <Label htmlFor="resetWhatsapp" className="text-sm font-medium">
                  رقم الواتساب
                </Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="resetWhatsapp"
                    type="tel"
                    placeholder="966XXXXXXXXX"
                    value={resetWhatsapp}
                    onChange={(e) => setResetWhatsapp(e.target.value)}
                    className="pr-11 h-12 text-base"
                    dir="ltr"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-gradient-primary hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading ? 'جاري الإرسال...' : 'إرسال كود إعادة التعيين'}
              </Button>
            </form>
          )}

          {step === 'forgotReset' && (
            <form onSubmit={handleForgotReset} className="space-y-5">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                العودة لتسجيل الدخول
              </button>

              <div className="space-y-2">
                <Label htmlFor="resetCode" className="text-sm font-medium">
                  كود إعادة التعيين
                </Label>
                <div className="relative">
                  <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="resetCode"
                    type="text"
                    placeholder="أدخل الكود من البريد"
                    value={resetCodeInput}
                    onChange={(e) => setResetCodeInput(e.target.value)}
                    className="pr-11 h-12 text-base text-center tracking-widest font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">
                  كلمة المرور الجديدة
                </Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="أدخل كلمة المرور الجديدة"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-11 pl-11 h-12 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword" className="text-sm font-medium">
                  تأكيد كلمة المرور الجديدة
                </Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmNewPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="أعد إدخال كلمة المرور الجديدة"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="pr-11 h-12 text-base"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-gradient-primary hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
              </Button>
            </form>
          )}

          {step === 'login' && (
            <div className="text-center space-y-2 mt-6">
              <Button type="button" variant="outline" className="w-full mb-4" onClick={() => setShowPricingModal(true)}>
                <Tag className="w-4 h-4 ml-2" />
                أسعار الخدمات
              </Button>

              <p className="text-sm text-muted-foreground">
                ليس لديك حساب؟{' '}
                <Link to="/customer/register" className="text-primary hover:underline font-medium">
                  إنشاء حساب جديد
                </Link>
              </p>
              <p className="text-sm text-muted-foreground">
                لديك كود تفعيل؟{' '}
                <Link to="/customer/activate" className="text-primary hover:underline font-medium">
                  تفعيل الحساب
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ServicesPricingModal open={showPricingModal} onOpenChange={setShowPricingModal} />
    </div>
  );
}
