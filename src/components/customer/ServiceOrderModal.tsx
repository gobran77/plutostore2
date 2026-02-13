import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  MessageCircle, 
  Wallet, 
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Send,
  Mail,
  User,
  CalendarDays
} from 'lucide-react';
import { getCurrencySymbol } from '@/types/currency';
import { toast } from 'sonner';
import { useServiceRequests } from '@/hooks/useServiceRequests';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ServicePricing {
  periodDays: number;
  periodName: string;
  buyPrice: number;
  sellPrice: number;
  currency: string;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  default_type: string;
  pricing: ServicePricing[];
}

interface CustomerBalances {
  balance_sar: number;
  balance_yer: number;
  balance_usd: number;
}

interface CustomerSession {
  id: string;
  name: string;
  whatsapp_number: string;
  balance: number;
  currency: string;
  balances?: CustomerBalances;
}

interface ServiceOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  customer: CustomerSession;
  onRechargeRequest: () => void;
}

export function ServiceOrderModal({
  open,
  onOpenChange,
  service,
  customer,
  onRechargeRequest,
}: ServiceOrderModalProps) {
  const [selectedPricing, setSelectedPricing] = useState<number | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createRequest } = useServiceRequests();
  const adminWhatsApp = '201030638992';

  // Reset email when service changes
  useEffect(() => {
    setCustomerEmail('');
    setSelectedPricing(null);
  }, [service?.id]);

  if (!service) return null;

  const isPrivateService = service.default_type === 'private';
  const activePricing = service.pricing.filter(p => p.sellPrice > 0);
  const selected = selectedPricing !== null ? activePricing[selectedPricing] : null;
  
  // Get customer balance for the selected currency
  const getBalanceForCurrency = (currency: string): number => {
    if (!customer.balances) return customer.balance;
    switch (currency) {
      case 'SAR': return customer.balances.balance_sar || 0;
      case 'YER': return customer.balances.balance_yer || 0;
      case 'USD': return customer.balances.balance_usd || 0;
      default: return customer.balance;
    }
  };
  
  const selectedCurrencyBalance = selected ? getBalanceForCurrency(selected.currency) : 0;
  const canAfford = selected && selectedCurrencyBalance >= selected.sellPrice;
  const subscriptionStartDate = new Date();
  const subscriptionEndDate = new Date();
  if (selected) {
    subscriptionEndDate.setDate(
      subscriptionEndDate.getDate() + Math.max(1, Number(selected.periodDays || 0))
    );
  }
  
  // Validate email for private services
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  const canSubmit = selected && (!isPrivateService || (customerEmail && isValidEmail(customerEmail)));
  const shortfallAmount = selected ? Math.max(0, selected.sellPrice - selectedCurrencyBalance) : 0;

  const handleSubmitRequest = async () => {
    if (!selected) {
      toast.error('Please select a subscription period');
      return;
    }

    if (isPrivateService && !customerEmail) {
      toast.error('Please enter activation email');
      return;
    }

    if (isPrivateService && !isValidEmail(customerEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!canAfford) {
      toast.error('Insufficient balance. You can send this order via WhatsApp.');
      const proceedViaWhatsApp = window.confirm(
        `Insufficient balance for this service.\nRequired: ${selected.sellPrice} ${getCurrencySymbol(selected.currency)}\nAvailable: ${selectedCurrencyBalance} ${getCurrencySymbol(selected.currency)}\nShortfall: ${shortfallAmount} ${getCurrencySymbol(selected.currency)}\n\nSend this order via WhatsApp now?`
      );
      if (proceedViaWhatsApp) {
        handleOrderViaWhatsApp();
      }
      return;
    }

    setIsSubmitting(true);

    const success = await createRequest({
      customer_id: customer.id,
      service_id: service.id,
      service_name: service.name,
      period_name: selected.periodName,
      period_days: selected.periodDays,
      price: selected.sellPrice,
      currency: selected.currency,
      customer_email: isPrivateService ? customerEmail : undefined,
    });

    setIsSubmitting(false);

    if (success) {
      onOpenChange(false);
      setSelectedPricing(null);
      setCustomerEmail('');
    }
  };

  const handleOrderViaWhatsApp = () => {
    if (!selected) {
      toast.error('Please select a subscription period');
      return;
    }

    const message = encodeURIComponent(
      `*New Subscription Order*\n\n` +
      `*Customer:* ${customer.name}\n` +
      `*Customer ID:* ${customer.id}\n` +
      `*WhatsApp:* ${customer.whatsapp_number}\n` +
      (isPrivateService && customerEmail ? `*Activation Email:* ${customerEmail}\n` : '') +
      `\n*Service:* ${service.name}\n` +
      `*Period:* ${selected.periodName}\n` +
      `*Start Date:* ${format(subscriptionStartDate, 'dd MMM yyyy', { locale: ar })}\n` +
      `*End Date:* ${format(subscriptionEndDate, 'dd MMM yyyy', { locale: ar })}\n` +
      `*Price:* ${selected.sellPrice} ${getCurrencySymbol(selected.currency)}\n` +
      `*Type:* ${service.default_type === 'shared' ? 'Shared Account' : 'Private Account'}\n\n` +
      `*Available Balance (${selected.currency}):* ${selectedCurrencyBalance} ${getCurrencySymbol(selected.currency)}\n` +
      `${canAfford ? '*Status:* Balance is sufficient for direct deduction' : `*Status:* Insufficient balance (shortfall: ${shortfallAmount} ${getCurrencySymbol(selected.currency)})`}\n` +
      `\nPlease review and contact the customer.`
    );

    window.open(`https://wa.me/${adminWhatsApp}?text=${message}`, '_blank');
    toast.success('WhatsApp opened with order details');
    onOpenChange(false);
  };

  const handleRecharge = () => {
    onOpenChange(false);
    onRechargeRequest();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            طلب خدمة: {service.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Service Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">نوع الحساب</span>
              <Badge variant={service.default_type === 'shared' ? 'default' : 'secondary'}>
                {service.default_type === 'shared' ? 'مشترك' : 'خاص'}
              </Badge>
            </div>
            {service.description && (
              <p className="text-sm text-muted-foreground mt-2">{service.description}</p>
            )}
          </div>

          {/* Pricing Options */}
          <div>
            <Label className="text-sm font-medium mb-3 block">اختر مدة الاشتراك</Label>
            <RadioGroup
              value={selectedPricing?.toString() || ''}
              onValueChange={(value) => setSelectedPricing(parseInt(value))}
              className="grid grid-cols-2 gap-2"
            >
              {activePricing.map((pricing, idx) => (
                <div key={idx}>
                  <RadioGroupItem
                    value={idx.toString()}
                    id={`pricing-${idx}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`pricing-${idx}`}
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                  >
                    <span className="text-xs text-muted-foreground">{pricing.periodName}</span>
                    <span className="text-lg font-bold text-primary">{pricing.sellPrice}</span>
                    <span className="text-xs text-muted-foreground">
                      {getCurrencySymbol(pricing.currency)}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Email Input for Private Services */}
          {isPrivateService && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                البريد الإلكتروني للتفعيل
                <Badge variant="destructive" className="text-xs">مطلوب</Badge>
              </Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="pr-10 text-left"
                  dir="ltr"
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                سيتم تفعيل الخدمة على هذا البريد الإلكتروني
              </p>
              {customerEmail && !isValidEmail(customerEmail) && (
                <p className="text-xs text-destructive">
                  الرجاء إدخال بريد إلكتروني صحيح
                </p>
              )}
            </div>
          )}

          {/* Balance Info - Multi-Currency */}
          {customer.balances && (
            <div className="rounded-lg p-3 bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4" />
                <span className="text-sm font-medium">أرصدتك</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className={`p-2 rounded ${customer.balances.balance_sar < 0 ? 'bg-destructive/10' : 'bg-success/10'}`}>
                  <p className={`font-bold ${customer.balances.balance_sar < 0 ? 'text-destructive' : 'text-success'}`}>
                    {customer.balances.balance_sar.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">SAR</p>
                </div>
                <div className={`p-2 rounded ${customer.balances.balance_yer < 0 ? 'bg-destructive/10' : 'bg-success/10'}`}>
                  <p className={`font-bold ${customer.balances.balance_yer < 0 ? 'text-destructive' : 'text-success'}`}>
                    {customer.balances.balance_yer.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">YER</p>
                </div>
                <div className={`p-2 rounded ${customer.balances.balance_usd < 0 ? 'bg-destructive/10' : 'bg-success/10'}`}>
                  <p className={`font-bold ${customer.balances.balance_usd < 0 ? 'text-destructive' : 'text-success'}`}>
                    {customer.balances.balance_usd.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">USD</p>
                </div>
              </div>
              
              {/* Selected pricing currency balance check */}
              {selected && (
                <div className="mt-3 pt-2 border-t flex items-center gap-2">
                  {canAfford ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-sm text-success">
                        رصيد {getCurrencySymbol(selected.currency)} كافي للخصم المباشر
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <span className="text-sm text-warning">
                        تحتاج {(selected.sellPrice - selectedCurrencyBalance).toFixed(0)} {getCurrencySymbol(selected.currency)} إضافية
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Order Confirmation Summary */}
          {selected && (
            <div className="rounded-lg p-3 border bg-primary/5 space-y-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">تأكيد الطلب</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-background p-2">
                  <p className="text-xs text-muted-foreground">بداية الاشتراك</p>
                  <p className="font-medium">
                    {format(subscriptionStartDate, 'dd MMM yyyy', { locale: ar })}
                  </p>
                </div>
                <div className="rounded-md bg-background p-2">
                  <p className="text-xs text-muted-foreground">نهاية الاشتراك</p>
                  <p className="font-medium text-primary">
                    {format(subscriptionEndDate, 'dd MMM yyyy', { locale: ar })}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                يتحدث تاريخ الانتهاء تلقائيا عند تغيير المدة.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {/* Primary: Submit Request to System */}
            <Button
              onClick={handleSubmitRequest}
              className="w-full bg-gradient-primary"
              disabled={!canSubmit || isSubmitting}
            >
              <Send className="w-4 h-4 ml-2" />
              {isSubmitting
                ? 'Sending...'
                : (selected && !canAfford ? 'Insufficient balance - Send via WhatsApp' : 'Submit Request')}
            </Button>

            {/* Secondary: WhatsApp option */}
            <Button
              onClick={handleOrderViaWhatsApp}
              variant="outline"
              className="w-full"
              disabled={selectedPricing === null}
            >
              <MessageCircle className="w-4 h-4 ml-2" />
              أو تواصل عبر واتساب
            </Button>

            {selected && !canAfford && (
              <Button
                onClick={handleRecharge}
                variant="outline"
                className="w-full"
              >
                <CreditCard className="w-4 h-4 ml-2" />
                شحن الرصيد أولاً
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            سيتم مراجعة طلبك من قبل الإدارة والرد عليك في أقرب وقت
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
