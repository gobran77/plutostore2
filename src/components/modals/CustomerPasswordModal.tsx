import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Copy, Check, RefreshCw, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { 
  createCustomerAccount, 
  regenerateCustomerPassword 
} from '@/hooks/useCustomerPassword';

interface CustomerPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'regenerate';
  customerData?: {
    id?: string;
    name: string;
    whatsapp: string;
    currency?: string;
  };
}

export const CustomerPasswordModal = ({
  isOpen,
  onClose,
  mode,
  customerData,
}: CustomerPasswordModalProps) => {
  const [password, setPassword] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!customerData) return;
    
    setIsLoading(true);

    try {
      let result;
      
      if (mode === 'create') {
        result = await createCustomerAccount(
          customerData.name,
          customerData.whatsapp,
          customerData.currency || 'SAR'
        );
      } else {
        if (!customerData.id) {
          toast.error('معرف العميل غير موجود');
          return;
        }
        result = await regenerateCustomerPassword(customerData.id);
      }

      if (result.success && result.password) {
        setPassword(result.password);
        toast.success(
          mode === 'create' 
            ? 'تم إنشاء حساب العميل بنجاح' 
            : 'تم تجديد كلمة المرور بنجاح'
        );
      } else {
        toast.error(result.error || 'حدث خطأ');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success('تم نسخ كلمة المرور');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendWhatsApp = () => {
    if (!password || !customerData) return;
    
    const message = encodeURIComponent(
      `مرحباً ${customerData.name}،\n\n` +
      `بيانات الدخول لحسابك في بلوتو ستور AI:\n\n` +
      `رقم الواتساب: ${customerData.whatsapp}\n` +
      `كلمة المرور: ${password}\n\n` +
      `رابط الدخول: ${window.location.origin}/customer`
    );
    
    window.open(`https://wa.me/${customerData.whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const handleClose = () => {
    setPassword(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            {mode === 'create' ? 'إنشاء حساب عميل' : 'تجديد كلمة المرور'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Customer Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الاسم:</span>
              <span className="font-medium">{customerData?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الواتساب:</span>
              <span className="font-medium" dir="ltr">{customerData?.whatsapp}</span>
            </div>
          </div>

          {/* Password Display */}
          {password ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>كلمة المرور الجديدة</Label>
                <div className="flex gap-2">
                  <Input 
                    value={password} 
                    readOnly 
                    className="font-mono text-lg text-center tracking-widest"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSendWhatsApp}
                  className="flex-1 bg-success hover:bg-success/90"
                >
                  <MessageCircle className="w-4 h-4 ml-2" />
                  إرسال عبر واتساب
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={isLoading}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                احفظ كلمة المرور في مكان آمن أو أرسلها للعميل مباشرة
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {mode === 'create' 
                  ? 'سيتم إنشاء حساب جديد للعميل مع كلمة مرور عشوائية'
                  : 'سيتم توليد كلمة مرور جديدة لهذا العميل'}
              </p>
              
              <Button
                onClick={handleGenerate}
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                ) : (
                  <Key className="w-4 h-4 ml-2" />
                )}
                {mode === 'create' ? 'إنشاء الحساب' : 'توليد كلمة مرور جديدة'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
