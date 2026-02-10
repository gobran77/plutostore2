import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ServiceRequestStatus } from '@/types/serviceRequests';

// Supabase removed: localStorage-backed service requests.

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

const REQUESTS_KEY = 'app_service_requests';
const ACCOUNTS_KEY = 'app_customer_accounts';

type LocalCustomerAccount = {
  id: string;
  name: string;
  whatsapp_number: string;
  balance?: number;
  balance_sar?: number;
  balance_yer?: number;
  balance_usd?: number;
};

const loadArray = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveArray = (key: string, value: any[]) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getBalanceColumn = (currency: string): keyof LocalCustomerAccount => {
  switch (currency) {
    case 'SAR': return 'balance_sar';
    case 'YER': return 'balance_yer';
    case 'USD': return 'balance_usd';
    default: return 'balance_yer';
  }
};

const adjustBalance = (customerId: string, currency: string, delta: number) => {
  const col = getBalanceColumn(currency);
  const accounts = loadArray<LocalCustomerAccount>(ACCOUNTS_KEY);
  const idx = accounts.findIndex((a) => a.id === customerId);
  if (idx === -1) return;
  const cur = Number((accounts[idx] as any)[col] || 0);
  (accounts[idx] as any)[col] = cur + delta;
  saveArray(ACCOUNTS_KEY, accounts as any[]);
};

export function useServiceRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = () => {
    const reqs = loadArray<ServiceRequest>(REQUESTS_KEY);
    const accounts = loadArray<LocalCustomerAccount>(ACCOUNTS_KEY);
    const joined = reqs.map((r) => {
      const c = accounts.find((a) => a.id === r.customer_id);
      return {
        ...r,
        customer: c ? {
          name: c.name,
          whatsapp_number: c.whatsapp_number,
          balance: Number(c.balance || 0),
          balance_sar: c.balance_sar,
          balance_yer: c.balance_yer,
          balance_usd: c.balance_usd,
        } : undefined,
      } as ServiceRequest;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setRequests(joined);
    setIsLoading(false);
  };

  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === REQUESTS_KEY || e.key === ACCOUNTS_KEY) refetch();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === 'pending' || r.status === 'processing').length,
    [requests]
  );

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
      // Deduct balance locally
      adjustBalance(request.customer_id, request.currency, -Number(request.price || 0));

      const now = new Date().toISOString();
      const req: ServiceRequest = {
        id: `req_${Date.now()}`,
        customer_id: request.customer_id,
        service_id: request.service_id,
        service_name: request.service_name,
        period_name: request.period_name,
        period_days: request.period_days,
        price: Number(request.price || 0),
        currency: request.currency,
        status: 'pending',
        admin_notes: null,
        customer_email: request.customer_email || null,
        created_at: now,
        updated_at: now,
      };

      const reqs = loadArray<ServiceRequest>(REQUESTS_KEY);
      reqs.unshift(req);
      saveArray(REQUESTS_KEY, reqs);

      toast.success('تم إرسال طلب الخدمة وخصم الرصيد بنجاح');
      refetch();
      return true;
    } catch (err) {
      console.error('Error creating service request:', err);
      toast.error('حدث خطأ أثناء إرسال الطلب');
      return false;
    }
  };

  const updateRequestStatus = async (
    id: string,
    status: ServiceRequestStatus,
    admin_notes?: string,
    request?: ServiceRequest
  ) => {
    try {
      // Refund balance if rejecting/failing
      if ((status === 'rejected' || status === 'failed') && request) {
        adjustBalance(request.customer_id, request.currency, Number(request.price || 0));
      }

      const reqs = loadArray<ServiceRequest>(REQUESTS_KEY);
      const idx = reqs.findIndex((r) => r.id === id);
      if (idx === -1) return false;

      reqs[idx] = {
        ...reqs[idx],
        status,
        admin_notes: typeof admin_notes === 'string' ? admin_notes : (reqs[idx].admin_notes || null),
        updated_at: new Date().toISOString(),
      };
      saveArray(REQUESTS_KEY, reqs);

      const statusMessages: Record<ServiceRequestStatus, string> = {
        pending: 'تم تحويل الطلب إلى معلق',
        processing: 'جاري معالجة الطلب',
        approved: 'تمت الموافقة على الطلب',
        rejected: 'تم رفض الطلب واسترداد الرصيد',
        activated: 'تم تفعيل الخدمة بنجاح',
        failed: 'فشل الطلب وتم استرداد الرصيد',
      };

      toast.success(statusMessages[status]);
      refetch();
      return true;
    } catch (err) {
      console.error('Error updating request status:', err);
      toast.error('حدث خطأ أثناء تحديث الطلب');
      return false;
    }
  };

  const deleteRequest = async (id: string, request?: ServiceRequest) => {
    try {
      if (request && request.status !== 'activated') {
        adjustBalance(request.customer_id, request.currency, Number(request.price || 0));
      }

      const reqs = loadArray<ServiceRequest>(REQUESTS_KEY).filter((r) => r.id !== id);
      saveArray(REQUESTS_KEY, reqs);
      toast.success('تم حذف الطلب');
      refetch();
      return true;
    } catch (err) {
      console.error('Error deleting request:', err);
      toast.error('حدث خطأ أثناء حذف الطلب');
      return false;
    }
  };

  return {
    requests,
    isLoading,
    pendingCount,
    createRequest,
    updateRequestStatus,
    deleteRequest,
    refetch,
  };
}

