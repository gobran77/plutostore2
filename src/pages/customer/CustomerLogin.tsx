import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Zap, Phone, Lock, Eye, EyeOff, KeyRound, ArrowRight, Tag } from 'lucide-react';
import { ServicesPricingModal } from '@/components/customer/ServicesPricingModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PendingCustomer {
  id: string;
  name: string;
  whatsapp_number: string;
  balance: number;
  currency: string;
  activation_code: string;
}

export default function CustomerLogin() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'login' | 'activation'>('login');
  const [activationCode, setActivationCode] = useState('');
  const [pendingCustomer, setPendingCustomer] = useState<PendingCustomer | null>(null);
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
      // Find customer by WhatsApp number
      const { data: customer, error } = await supabase
        .from('customer_accounts')
        .select('*')
        .eq('whatsapp_number', whatsappNumber.trim())
        .single();

      if (error || !customer) {
        toast.error('رقم الواتساب غير مسجل');
        setIsLoading(false);
        return;
      }

      // Simple password check (in production, use proper hashing)
      if (customer.password_hash !== password) {
        toast.error('كلمة المرور غير صحيحة');
        setIsLoading(false);
        return;
      }

      const isAdmin = (customer as any).is_admin === true || (customer as any).account_type === 'admin';

      if (isAdmin) {
        // Admin goes directly without activation code
        localStorage.setItem('admin_session', JSON.stringify({
          id: customer.id,
          name: customer.name,
          whatsapp_number: customer.whatsapp_number,
          is_admin: true,
        }));
        toast.success(`مرحباً ${customer.name}! (مدير النظام)`);
        navigate('/');
      } else {
        // Generate new activation code for each login
        const newActivationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Update activation code in database
        await supabase
          .from('customer_accounts')
          .update({ activation_code: newActivationCode })
          .eq('id', customer.id);

        // Send activation code via WhatsApp
        const whatsappMessage = [
          `🔐 *كود التفعيل الخاص بك*`,
          ``,
          `مرحباً ${customer.name}،`,
          ``,
          `كود التفعيل: *${newActivationCode}*`,
          ``,
          `📱 *كيفية الاستخدام:*`,
          `1️⃣ أدخل الكود في خانة "كود التفعيل"`,
          `2️⃣ اضغط على زر "تفعيل الحساب"`,
          `3️⃣ سيتم تحويلك للوحة التحكم`,
          ``,
          `⚠️ هذا الكود صالح لمرة واحدة فقط`,
          ``,
          `بلوتو ستور AI 🚀`,
        ].join('\n');

        try {
          await supabase.functions.invoke('send-whatsapp', {
            body: {
              to: customer.whatsapp_number,
              message: whatsappMessage,
              customerName: customer.name,
            },
          });
          toast.success('تم إرسال كود التفعيل إلى واتساب');
        } catch (err) {
          console.error('Error sending activation code:', err);
          toast.info('أدخل كود التفعيل للمتابعة');
        }

        // All customers must enter activation code every time
        setPendingCustomer({
          id: customer.id,
          name: customer.name,
          whatsapp_number: customer.whatsapp_number,
          balance: customer.balance || 0,
          currency: customer.currency || 'SAR',
          activation_code: newActivationCode,
        });
        setStep('activation');
      }
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
      // Check if activation code matches
      if (activationCode.trim() !== pendingCustomer.activation_code) {
        toast.error('كود التفعيل غير صحيح');
        setIsLoading(false);
        return;
      }

      // Mark account as activated if not already
      await supabase
        .from('customer_accounts')
        .update({ is_activated: true })
        .eq('id', pendingCustomer.id);

        // Store customer session and navigate
        localStorage.setItem('customer_session', JSON.stringify({
          id: pendingCustomer.id,
          name: pendingCustomer.name,
          whatsapp_number: pendingCustomer.whatsapp_number,
          balance: pendingCustomer.balance,
          currency: pendingCustomer.currency,
          activation_code: pendingCustomer.activation_code,
        }));
        
        toast.success(`مرحباً ${pendingCustomer.name}!`);
        navigate('/customer/dashboard');
    } catch (err) {
      console.error('Activation error:', err);
      toast.error('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('login');
    setActivationCode('');
    setPendingCustomer(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-primary p-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4 shadow-lg">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">بلوتو ستور AI</h1>
          <p className="text-white/80 text-sm">بوابة العملاء</p>
        </div>

        <CardHeader className="text-center pt-6 pb-2">
          <h2 className="text-xl font-semibold text-foreground">
            {step === 'login' ? 'تسجيل الدخول' : 'تفعيل الحساب'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {step === 'login' 
              ? 'أدخل بيانات حسابك للمتابعة' 
              : `مرحباً ${pendingCustomer?.name}، أدخل كود التفعيل`
            }
          </p>
        </CardHeader>

        <CardContent className="p-6 pt-2">
          {step === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              {/* WhatsApp Number */}
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

              {/* Password */}
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

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-gradient-primary hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleActivation} className="space-y-5">
              {/* Back button */}
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                العودة لتسجيل الدخول
              </button>

              {/* Activation Code */}
              <div className="space-y-2">
                <Label htmlFor="activation" className="text-sm font-medium">
                  كود التفعيل
                </Label>
                <div className="relative">
                  <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="activation"
                    type="text"
                    placeholder="أدخل كود التفعيل المرسل إليك"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    className="pr-11 h-12 text-base text-center tracking-widest font-mono"
                    dir="ltr"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  الكود مكون من 6 أرقام ويُرسل إليك عبر واتساب
                </p>
              </div>

              {/* Activate Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-gradient-primary hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading ? 'جاري التفعيل...' : 'تفعيل الحساب'}
              </Button>
            </form>
          )}

          {/* Register & Activate links */}
          {step === 'login' && (
            <div className="text-center space-y-2 mt-6">
              {/* Services Pricing Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full mb-4"
                onClick={() => setShowPricingModal(true)}
              >
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

      {/* Services Pricing Modal */}
      <ServicesPricingModal 
        open={showPricingModal} 
        onOpenChange={setShowPricingModal} 
      />
    </div>
  );
}
