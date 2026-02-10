import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Tag, ChevronDown, ChevronUp, UserPlus, Loader2 } from 'lucide-react';
import { getCurrencySymbol } from '@/types/currency';
import { useNavigate } from 'react-router-dom';
import type { Service as LegacyService } from '@/types/services';

type Service = LegacyService;

interface ServicesPricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServicesPricingModal({ open, onOpenChange }: ServicesPricingModalProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      fetchServices();
    }
  }, [open]);

  const fetchServices = async () => {
    try {
      const raw = localStorage.getItem('app_services');
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      const servicesWithDates: Service[] = list.map((s: any) => ({
        ...s,
        createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
      }));
      setServices(servicesWithDates);
    } catch (err) {
      console.error('Error fetching services:', err);
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (serviceId: string) => {
    setExpandedService(expandedService === serviceId ? null : serviceId);
  };

  const handleRegister = () => {
    onOpenChange(false);
    navigate('/customer/register');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="w-6 h-6 text-primary" />
            أسعار الخدمات
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">لا توجد خدمات متاحة حالياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => {
              const isExpanded = expandedService === service.id;
              const activePricing = (service.pricing || []).filter((p) => (p as any).sellPrice > 0);
              const lowestPrice = activePricing.length > 0 
                ? Math.min(...activePricing.map((p: any) => p.sellPrice))
                : null;

              return (
                <div 
                  key={service.id} 
                  className="border rounded-xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleExpand(service.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 text-right">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{service.name}</h3>
                        {service.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {lowestPrice !== null && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {lowestPrice} {getCurrencySymbol((activePricing[0] as any)?.currency || 'SAR')}
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                    {isExpanded && activePricing.length > 0 && (
                      <div className="border-t bg-muted/30 p-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">
                        خيارات الاشتراك
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {activePricing.map((pricing, idx) => (
                          <div 
                            key={idx}
                            className="bg-card border rounded-lg p-3 text-center"
                          >
                            <p className="text-xs text-muted-foreground mb-1">
                              {(pricing as any).periodName}
                            </p>
                            <p className="text-lg font-bold text-primary">
                              {(pricing as any).sellPrice}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getCurrencySymbol((pricing as any).currency)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <Badge className="mt-3" variant={service.defaultType === 'shared' ? 'default' : 'secondary'}>
                        {service.defaultType === 'shared' ? 'حساب مشترك' : 'حساب خاص'}
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Register CTA */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mt-4">
              <div className="text-center">
                <UserPlus className="w-8 h-8 mx-auto text-primary mb-2" />
                <h4 className="font-semibold mb-1">هل تريد طلب خدمة؟</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  يرجى إنشاء حساب والتواصل مع الإدارة
                </p>
                <Button onClick={handleRegister} className="bg-gradient-primary">
                  <UserPlus className="w-4 h-4 ml-2" />
                  إنشاء حساب جديد
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
