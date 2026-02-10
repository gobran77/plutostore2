import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Zap, Phone, Lock, Eye, EyeOff, User, Copy, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Generate random 6-digit activation code
const generateActivationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export default function CustomerRegister() {
  const [name, setName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !whatsappNumber.trim() || !password.trim()) {
      toast.error('الرجاء إدخال جميع البيانات المطلوبة');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('كلمة المرور غير متطابقة');
      return;
    }

    if (password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsLoading(true);

    try {
      // Check if phone number already exists
      const { data: existingCustomer } = await supabase
        .from('customer_accounts')
        .select('id')
        .eq('whatsapp_number', whatsappNumber.trim())
        .single();

      if (existingCustomer) {
        toast.error('رقم الواتساب مسجل مسبقاً');
        setIsLoading(false);
        return;
      }

      // Generate activation code
      const code = generateActivationCode();

      // Create customer account
      const { error } = await supabase
        .from('customer_accounts')
        .insert({
          name: name.trim(),
          whatsapp_number: whatsappNumber.trim(),
          password_hash: password,
          activation_code: code,
          is_activated: false,
          account_type: 'customer',
          balance: 0,
          currency: 'SAR',
        });

      if (error) throw error;

      setActivationCode(code);
      setRegistrationComplete(true);
      toast.success('تم إنشاء الحساب بنجاح!');
    } catch (err) {
      console.error('Registration error:', err);
      toast.error('حدث خطأ أثناء إنشاء الحساب');
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(activationCode);
    setCopied(true);
    toast.success('تم نسخ الكود');
    setTimeout(() => setCopied(false), 2000);
  };

  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
          <div className="bg-gradient-to-br from-success to-success/80 p-8 text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">تم إنشاء الحساب!</h1>
            <p className="text-white/80 text-sm">احفظ كود التفعيل التالي</p>
          </div>

          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                سيتم إرسال هذا الكود لك عبر الواتساب للتفعيل
              </p>
              
              <div className="bg-muted rounded-xl p-4 flex items-center justify-center gap-3">
                <span className="text-3xl font-mono font-bold tracking-widest text-primary">
                  {activationCode}
                </span>
                <button
                  onClick={copyCode}
                  className="p-2 rounded-lg hover:bg-background transition-colors"
                >
                  {copied ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <Copy className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <p className="text-sm text-warning-foreground text-center">
                ⚠️ انتظر حتى يتم تفعيل حسابك من قبل الإدارة
              </p>
            </div>

            <Button
              onClick={() => navigate('/customer')}
              className="w-full h-12 text-base font-medium"
              variant="outline"
            >
              العودة لتسجيل الدخول
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-primary p-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4 shadow-lg">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">بلوتو ستور AI</h1>
          <p className="text-white/80 text-sm">إنشاء حساب جديد</p>
        </div>

        <CardHeader className="text-center pt-6 pb-2">
          <h2 className="text-xl font-semibold text-foreground">تسجيل عميل جديد</h2>
          <p className="text-muted-foreground text-sm">أدخل بياناتك لإنشاء حساب</p>
        </CardHeader>

        <CardContent className="p-6 pt-2">
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                الاسم الكامل
              </Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="أدخل اسمك الكامل"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pr-11 h-12 text-base"
                />
              </div>
            </div>

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

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                تأكيد كلمة المرور
              </Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="أعد إدخال كلمة المرور"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-11 h-12 text-base"
                />
              </div>
            </div>

            {/* Register Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium bg-gradient-primary hover:opacity-90 transition-opacity"
              disabled={isLoading}
            >
              {isLoading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
            </Button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            لديك حساب بالفعل؟{' '}
            <Link to="/customer" className="text-primary hover:underline font-medium">
              تسجيل الدخول
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
