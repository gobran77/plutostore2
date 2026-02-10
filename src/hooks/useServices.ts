import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface ServicePricing {
  periodDays: number;
  periodName: string;
  buyPrice: number;
  sellPrice: number;
  currency: string;
}

export interface DBService {
  id: string;
  name: string;
  description: string | null;
  default_type: string;
  pricing: ServicePricing[];
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
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

export function useServices() {
  const [services, setServices] = useState<DBService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      const parsedServices: DBService[] = (data || []).map(service => ({
        ...service,
        default_type: service.default_type || 'shared',
        is_active: service.is_active ?? true,
        pricing: parsePricing(service.pricing),
        image_url: (service as any).image_url || null,
      }));
      
      setServices(parsedServices);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError('حدث خطأ في تحميل الخدمات');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addService = useCallback(async (serviceData: {
    name: string;
    description?: string;
    default_type: string;
    pricing: ServicePricing[];
    is_active?: boolean;
    image_url?: string;
  }) => {
    try {
      const { data, error: insertError } = await supabase
        .from('services')
        .insert({
          name: serviceData.name,
          description: serviceData.description || null,
          default_type: serviceData.default_type,
          pricing: serviceData.pricing as unknown as Json,
          is_active: serviceData.is_active ?? true,
          image_url: serviceData.image_url || null,
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;
      
      const newService: DBService = {
        ...data,
        default_type: data.default_type || 'shared',
        is_active: data.is_active ?? true,
        pricing: parsePricing(data.pricing),
        image_url: (data as any).image_url || null,
      };
      
      setServices(prev => [newService, ...prev]);
      toast.success('تمت إضافة الخدمة بنجاح');
      return newService;
    } catch (err) {
      console.error('Error adding service:', err);
      toast.error('حدث خطأ في إضافة الخدمة');
      throw err;
    }
  }, []);

  const updateService = useCallback(async (id: string, serviceData: Partial<{
    name: string;
    description: string;
    default_type: string;
    pricing: ServicePricing[];
    is_active: boolean;
  }>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (serviceData.name !== undefined) updateData.name = serviceData.name;
      if (serviceData.description !== undefined) updateData.description = serviceData.description;
      if (serviceData.default_type !== undefined) updateData.default_type = serviceData.default_type;
      if (serviceData.pricing !== undefined) updateData.pricing = serviceData.pricing as unknown as Json;
      if (serviceData.is_active !== undefined) updateData.is_active = serviceData.is_active;

      const { data, error: updateError } = await supabase
        .from('services')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      const updatedService: DBService = {
        ...data,
        default_type: data.default_type || 'shared',
        is_active: data.is_active ?? true,
        pricing: parsePricing(data.pricing),
        image_url: (data as any).image_url || null,
      };
      
      setServices(prev => prev.map(s => s.id === id ? updatedService : s));
      toast.success('تم تحديث الخدمة بنجاح');
      return updatedService;
    } catch (err) {
      console.error('Error updating service:', err);
      toast.error('حدث خطأ في تحديث الخدمة');
      throw err;
    }
  }, []);

  const deleteService = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      setServices(prev => prev.filter(s => s.id !== id));
      toast.success('تم حذف الخدمة بنجاح');
    } catch (err) {
      console.error('Error deleting service:', err);
      toast.error('حدث خطأ في حذف الخدمة');
      throw err;
    }
  }, []);

  const toggleServiceStatus = useCallback(async (id: string) => {
    const service = services.find(s => s.id === id);
    if (!service) return;
    
    await updateService(id, { is_active: !service.is_active });
  }, [services, updateService]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return {
    services,
    isLoading,
    error,
    fetchServices,
    addService,
    updateService,
    deleteService,
    toggleServiceStatus,
    activeServices: services.filter(s => s.is_active)
  };
}
