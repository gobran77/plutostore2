import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Zap, KeyRound, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function CustomerActivate() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activationComplete, setActivationComplete] = useState(false);
  const navigate = useNavigate();

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!whatsappNumber.trim() || !activationCode.trim()) {
      toast.error('الرجاء إدخال رقم الواتساب وكود التفعيل');
      return;
    }

    setIsLoading(true);

    try {
      // Find customer by WhatsApp number and activation code
      const { data: customer, error } = await supabase
        .from('customer_accounts')
        .select('*')
        .eq('whatsapp_number', whatsappNumber.trim())
        .eq('activation_code', activationCode.trim())
        .single();

      if (error || !customer) {
        toast.error('الكود غير صحيح أو رقم الواتساب غير مسجل');
        setIsLoading(false);
        return;
      }

      if ((customer as any).is_activated) {
        toast.info('الحساب مفعل مسبقاً');
        navigate('/customer');
        return;
      }

      // Activate the account
      const { error: updateError } = await supabase
        .from('customer_accounts')
        .update({ is_activated: true })
        .eq('id', customer.id);

      if (updateError) throw updateError;

      setActivationComplete(true);
      toast.success('تم تفعيل الحساب بنجاح!');
    } catch (err) {
      console.error('Activation error:', err);
      toast.error('حدث خطأ أثناء التفعيل');
    } finally {
      setIsLoading(false);
    }
  };

  if (activationComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
          <div className="bg-gradient-to-br from-success to-success/80 p-8 text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">تم التفعيل!</h1>
            <p className="text-white/80 text-sm">يمكنك الآن تسجيل الدخول</p>
          </div>

          <CardContent className="p-6">
            <Button
              onClick={() => navigate('/customer')}
              className="w-full h-12 text-base font-medium bg-gradient-primary hover:opacity-90 transition-opacity"
            >
              تسجيل الدخول
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
          <p className="text-white/80 text-sm">تفعيل الحساب</p>
        </div>

        <CardHeader className="text-center pt-6 pb-2">
          <h2 className="text-xl font-semibold text-foreground">تفعيل حسابك</h2>
          <p className="text-muted-foreground text-sm">أدخل الكود الذي استلمته عبر الواتساب</p>
        </CardHeader>

        <CardContent className="p-6 pt-2">
          <form onSubmit={handleActivate} className="space-y-5">
            {/* WhatsApp Number */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-sm font-medium">
                رقم الواتساب
              </Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="966XXXXXXXXX"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="h-12 text-base"
                dir="ltr"
              />
            </div>

            {/* Activation Code */}
            <div className="space-y-2">
              <Label htmlFor="code" className="text-sm font-medium">
                كود التفعيل
              </Label>
              <div className="relative">
                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="code"
                  type="text"
                  placeholder="أدخل الكود المكون من 6 أرقام"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  className="pr-11 h-12 text-base text-center tracking-widest font-mono"
                  maxLength={6}
                  dir="ltr"
                />
              </div>
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

          {/* Back to login */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link to="/customer" className="text-primary hover:underline font-medium">
              العودة لتسجيل الدخول
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
