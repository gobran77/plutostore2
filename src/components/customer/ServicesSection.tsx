import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Package, Tag, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react';
import { getCurrencySymbol } from '@/types/currency';
import type { Json } from '@/integrations/supabase/types';
import { ServiceOrderModal } from './ServiceOrderModal';

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
  is_active: boolean;
  image_url: string | null;
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

// Helper to parse pricing from JSON
function parsePricing(pricing: Json): ServicePricing[] {
  if (!Array.isArray(pricing)) return [];
  return pricing.map((p) => {
    const item = p as Record<string, unknown>;
    return {
      periodDays: Number(item.periodDays) || 0,
      periodName: String(item.periodName || ''),
      buyPrice: Number(item.buyPrice) || 0,
      sellPrice: Number(item.sellPrice) || 0,
      currency: String(item.currency || 'SAR'),
    };
  });
}

export function ServicesSection() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [customer, setCustomer] = useState<CustomerSession | null>(null);

  // Admin WhatsApp number
  const adminWhatsApp = '201030638992';

  useEffect(() => {
    fetchServices();
    loadCustomerSession();
  }, []);

  const loadCustomerSession = () => {
    const session = localStorage.getItem('customer_session');
    if (session) {
      setCustomer(JSON.parse(session));
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const parsedServices: Service[] = (data || []).map(service => ({
        ...service,
        default_type: service.default_type || 'shared',
        is_active: service.is_active ?? true,
        pricing: parsePricing(service.pricing),
        image_url: (service as any).image_url || null,
      }));

      setServices(parsedServices);
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (serviceId: string) => {
    setExpandedService(expandedService === serviceId ? null : serviceId);
  };

  const handleOrderService = (service: Service) => {
    setSelectedService(service);
    setShowOrderModal(true);
  };

  const handleRechargeRequest = () => {
    if (!customer) return;
    
    const message = encodeURIComponent(
      `مرحباً، أريد شحن رصيدي\n\n` +
      `الاسم: ${customer.name}\n` +
      `رقم الواتساب: ${customer.whatsapp_number}`
    );
    
    window.open(`https://wa.me/${adminWhatsApp}?text=${message}`, '_blank');
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (services.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="p-8 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">لا توجد خدمات متاحة حالياً</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          الخدمات المتاحة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {services.map((service) => {
          const isExpanded = expandedService === service.id;
          const activePricing = service.pricing.filter(p => p.sellPrice > 0);
          const lowestPrice = activePricing.length > 0 
            ? Math.min(...activePricing.map(p => p.sellPrice))
            : null;

          return (
            <div 
              key={service.id} 
              className="border rounded-xl overflow-hidden transition-all"
            >
              {/* Service Header */}
              <button
                onClick={() => toggleExpand(service.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 text-right">
                  {service.image_url ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                      <img 
                        src={service.image_url} 
                        alt={service.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-primary" />
                    </div>
                  )}
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
                      يبدأ من {lowestPrice} {getCurrencySymbol(activePricing[0]?.currency || 'SAR')}
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Pricing Details */}
              {isExpanded && activePricing.length > 0 && (
                <div className="border-t bg-muted/30 p-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    خيارات الاشتراك
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {activePricing.map((pricing, idx) => (
                      <div 
                        key={idx}
                        className="bg-card border rounded-lg p-3 text-center"
                      >
                        <p className="text-xs text-muted-foreground mb-1">
                          {pricing.periodName}
                        </p>
                        <p className="text-lg font-bold text-primary">
                          {pricing.sellPrice}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getCurrencySymbol(pricing.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <Badge variant={service.default_type === 'shared' ? 'default' : 'secondary'}>
                      {service.default_type === 'shared' ? 'حساب مشترك' : 'حساب خاص'}
                    </Badge>
                    <Button 
                      size="sm" 
                      className="bg-gradient-primary"
                      onClick={() => handleOrderService(service)}
                    >
                      <ShoppingCart className="w-4 h-4 ml-1" />
                      طلب الخدمة
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>

      {/* Service Order Modal */}
      {customer && (
        <ServiceOrderModal
          open={showOrderModal}
          onOpenChange={setShowOrderModal}
          service={selectedService}
          customer={customer}
          onRechargeRequest={handleRechargeRequest}
        />
      )}
    </Card>
  );
}
