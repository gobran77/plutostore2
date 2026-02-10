import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ServiceRequestStatus } from '@/types/serviceRequests';

export interface ServiceRequest {
  id: string;
  customer_id: string;
  service_id: string;
  service_name: string;
  period_name: string;
  period_days: number;
  price: number;
  currency: string;
  status: ServiceRequestStatus;
  admin_notes: string | null;
  customer_email: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    name: string;
    whatsapp_number: string;
    balance: number;
    balance_sar?: number;
    balance_yer?: number;
    balance_usd?: number;
  };
}

const getBalanceColumn = (currency: string): string => {
  switch (currency) {
    case 'SAR': return 'balance_sar';
    case 'YER': return 'balance_yer';
    case 'USD': return 'balance_usd';
    default: return 'balance_yer';
  }
};

export function useServiceRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          customer:customer_accounts(name, whatsapp_number, balance, balance_sar, balance_yer, balance_usd)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsedRequests = (data || []).map((r: any) => ({
        ...r,
        status: r.status as ServiceRequestStatus,
        customer: r.customer ? {
          name: r.customer.name,
          whatsapp_number: r.customer.whatsapp_number,
          balance: r.customer.balance,
          balance_sar: r.customer.balance_sar,
          balance_yer: r.customer.balance_yer,
          balance_usd: r.customer.balance_usd,
        } : undefined,
      }));

      setRequests(parsedRequests);
      setPendingCount(parsedRequests.filter((r: ServiceRequest) => 
        r.status === 'pending' || r.status === 'processing'
      ).length);
    } catch (err) {
      console.error('Error fetching service requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Deduct balance when creating request
  const createRequest = async (request: {
    customer_id: string;
    service_id: string;
    service_name: string;
    period_name: string;
    period_days: number;
    price: number;
    currency: string;
    customer_email?: string;
  }) => {
    try {
      // First get current balance
      const balanceColumn = getBalanceColumn(request.currency);
      const { data: customerData, error: fetchError } = await supabase
        .from('customer_accounts')
        .select(balanceColumn)
        .eq('id', request.customer_id)
        .single();

      if (fetchError) throw fetchError;

      const currentBalance = (customerData as any)?.[balanceColumn] || 0;
      const newBalance = currentBalance - request.price;

      // Deduct balance
      const { error: updateError } = await supabase
        .from('customer_accounts')
        .update({ [balanceColumn]: newBalance })
        .eq('id', request.customer_id);

      if (updateError) throw updateError;

      // Create request
      const { error } = await supabase
        .from('service_requests')
        .insert([{
          customer_id: request.customer_id,
          service_id: request.service_id,
          service_name: request.service_name,
          period_name: request.period_name,
          period_days: request.period_days,
          price: request.price,
          currency: request.currency,
          customer_email: request.customer_email || null,
        }]);

      if (error) throw error;

      toast.success('تم إرسال طلب الخدمة وخصم الرصيد بنجاح');
      fetchRequests();
      return true;
    } catch (err) {
      console.error('Error creating service request:', err);
      toast.error('حدث خطأ أثناء إرسال الطلب');
      return false;
    }
  };

  // Refund balance
  const refundBalance = async (customerId: string, amount: number, currency: string) => {
    const balanceColumn = getBalanceColumn(currency);
    const { data: customerData, error: fetchError } = await supabase
      .from('customer_accounts')
      .select(balanceColumn)
      .eq('id', customerId)
      .single();

    if (fetchError) throw fetchError;

    const currentBalance = (customerData as any)?.[balanceColumn] || 0;
    const newBalance = currentBalance + amount;

    const { error: updateError } = await supabase
      .from('customer_accounts')
      .update({ [balanceColumn]: newBalance })
      .eq('id', customerId);

    if (updateError) throw updateError;
  };

  const updateRequestStatus = async (
    id: string, 
    status: ServiceRequestStatus,
    admin_notes?: string,
    request?: ServiceRequest
  ) => {
    try {
      // If rejecting or failing, refund the balance
      if ((status === 'rejected' || status === 'failed') && request) {
        await refundBalance(request.customer_id, request.price, request.currency);
      }

      const { error } = await supabase
        .from('service_requests')
        .update({ status, admin_notes })
        .eq('id', id);

      if (error) throw error;

      const statusMessages: Record<ServiceRequestStatus, string> = {
        pending: 'تم تحويل الطلب إلى معلق',
        processing: 'جاري معالجة الطلب',
        approved: 'تمت الموافقة على الطلب',
        rejected: 'تم رفض الطلب واسترداد الرصيد',
        activated: 'تم تفعيل الخدمة بنجاح',
        failed: 'فشل الطلب وتم استرداد الرصيد',
      };

      toast.success(statusMessages[status]);
      fetchRequests();
      return true;
    } catch (err) {
      console.error('Error updating request status:', err);
      toast.error('حدث خطأ أثناء تحديث الطلب');
      return false;
    }
  };

  const deleteRequest = async (id: string, request?: ServiceRequest) => {
    try {
      // Refund balance if request is not activated yet
      if (request && request.status !== 'activated') {
        await refundBalance(request.customer_id, request.price, request.currency);
      }

      const { error } = await supabase
        .from('service_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (request && request.status !== 'activated') {
        toast.success('تم حذف الطلب واسترداد الرصيد');
      } else {
        toast.success('تم حذف الطلب');
      }
      fetchRequests();
      return true;
    } catch (err) {
      console.error('Error deleting request:', err);
      toast.error('حدث خطأ أثناء حذف الطلب');
      return false;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchRequests();
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('service_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
        },
        (payload) => {
          console.log('Service request change:', payload);
          fetchRequests();
          
          // Show notification for new requests
          if (payload.eventType === 'INSERT') {
            toast.info('🔔 طلب خدمة جديد!', {
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    requests,
    isLoading,
    pendingCount,
    createRequest,
    updateRequestStatus,
    deleteRequest,
    refetch: fetchRequests,
  };
}
