import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, ExternalLink, Check, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  whatsappNumber: string;
  message: string;
}

export const WhatsAppMessageModal = ({
  isOpen,
  onClose,
  customerName,
  whatsappNumber,
  message,
}: WhatsAppMessageModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('تم نسخ الرسالة');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('فشل نسخ الرسالة');
    }
  };

  const openWhatsApp = () => {
    // Open WhatsApp in new tab - user clicks this directly which bypasses iframe restrictions
    const encodedMessage = encodeURIComponent(message);
    const url = `https://web.whatsapp.com/send?phone=${whatsappNumber}&text=${encodedMessage}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openWhatsAppMobile = () => {
    const encodedMessage = encodeURIComponent(message);
    // Use intent for mobile
    const url = `whatsapp://send?phone=${whatsappNumber}&text=${encodedMessage}`;
    window.location.href = url;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-success" />
            إرسال رسالة واتساب
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Info */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">إلى:</p>
              <p className="font-medium">{customerName}</p>
            </div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">الرقم:</p>
              <p className="font-mono text-sm">{whatsappNumber}</p>
            </div>
          </div>

          {/* Message Preview */}
          <div>
            <label className="text-sm font-medium mb-2 block">الرسالة:</label>
            <Textarea
              value={message}
              readOnly
              className="min-h-[200px] text-sm leading-relaxed"
              dir="rtl"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="w-full"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 ml-2" />
                  تم النسخ!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 ml-2" />
                  نسخ الرسالة
                </>
              )}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={openWhatsApp}
                className="bg-success hover:bg-success/90"
              >
                <ExternalLink className="w-4 h-4 ml-2" />
                فتح واتساب ويب
              </Button>
              
              <Button
                onClick={openWhatsAppMobile}
                variant="outline"
                className="border-success text-success hover:bg-success/10"
              >
                <MessageCircle className="w-4 h-4 ml-2" />
                تطبيق الجوال
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            💡 انسخ الرسالة أولاً ثم افتح واتساب والصقها في المحادثة
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
