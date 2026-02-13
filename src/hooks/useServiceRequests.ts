import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ServiceRequestStatus } from '@/types/serviceRequests';
import type { Subscription } from '@/types';
import {
  createInvoiceFromSubscription,
  createPaymentFromSubscription,
  addInvoice,
  addPayment,
} from '@/utils/invoicePaymentUtils';
import { addCustomerActivity } from '@/lib/customerActivityLog';
import { fixTextEncoding } from '@/lib/textEncoding';

// Service requests are stored in localStorage.

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
  linked_subscription_id?: string | null;
  linked_invoice_id?: string | null;
  linked_payment_id?: string | null;
  linked_login_email?: string | null;
  linked_slot_id?: string | null;
  activated_at?: string | null;
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
const SUBSCRIPTIONS_KEY = 'app_subscriptions';
const SERVICES_KEY = 'app_services';

type LocalCustomerAccount = {
  id: string;
  name: string;
  whatsapp_number: string;
  balance?: number;
  balance_sar?: number;
  balance_yer?: number;
  balance_usd?: number;
};

type LocalServicePricing = {
  periodDays?: number;
  periodName?: string;
  buyPrice?: number;
  sellPrice?: number;
  currency?: string;
};

type LocalService = {
  id: string;
  name?: string;
  defaultType?: string;
  default_type?: string;
  accounts?: Array<{
    id?: string;
    name?: string;
    type?: string;
    sharedEmails?: Array<{
      id?: string;
      email?: string;
      password?: string;
      users?: Array<{
        id?: string;
        customerId?: string;
        name?: string;
        email?: string;
        linkedAt?: string;
      }>;
    }>;
  }>;
  pricing?: LocalServicePricing[];
};

export interface ActivationCredentials {
  slotId?: string;
  loginEmail?: string;
  loginPassword?: string;
  loginSlotName?: string;
}

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
    case 'SAR':
      return 'balance_sar';
    case 'YER':
      return 'balance_yer';
    case 'USD':
      return 'balance_usd';
    default:
      return 'balance_yer';
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

const getAvailableBalance = (customerId: string, currency: string): number => {
  const col = getBalanceColumn(currency);
  const accounts = loadArray<LocalCustomerAccount>(ACCOUNTS_KEY);
  const account = accounts.find((a) => String(a.id) === String(customerId));
  if (!account) return 0;
  return Number((account as any)[col] || 0);
};

const getCustomerName = (customerId: string, fallback?: string) => {
  const accounts = loadArray<LocalCustomerAccount>(ACCOUNTS_KEY);
  const account = accounts.find((a) => String(a.id) === String(customerId));
  if (account?.name && String(account.name).trim().length > 0) return String(account.name);
  return fallback || 'عميل';
};

const getServiceMeta = (request: ServiceRequest) => {
  const services = loadArray<LocalService>(SERVICES_KEY);
  const service = services.find((s) => String(s.id) === String(request.service_id));
  const pricing = Array.isArray(service?.pricing) ? service.pricing : [];

  const pricingMatch = pricing.find((p) => {
    const byDays = Number(p?.periodDays || 0) === Number(request.period_days || 0);
    const byName = String(p?.periodName || '') === String(request.period_name || '');
    return byDays || byName;
  });

  const cost = Number(pricingMatch?.buyPrice || 0);
  const accountTypeRaw = String(service?.defaultType || service?.default_type || 'shared').toLowerCase();
  const accountType = accountTypeRaw === 'private' ? 'private' : 'shared';

  return { cost, accountType };
};

const createSubscriptionFromRequest = (request: ServiceRequest, activation?: ActivationCredentials) => {
  const subscriptions = loadArray<any>(SUBSCRIPTIONS_KEY);
  const existing = subscriptions.find((s: any) => String(s?.sourceRequestId || '') === String(request.id));
  if (existing) return { subscription: existing as Subscription, created: false as const };

  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + Math.max(1, Number(request.period_days || 30)));

  const customerName = getCustomerName(request.customer_id, request.customer?.name);
  const { cost, accountType } = getServiceMeta(request);

  const newSubscription: Subscription & { sourceRequestId?: string } = {
    id: `sub_${Date.now()}`,
    customerId: request.customer_id,
    customerName,
    services: [
      {
        id: `srv_${request.service_id}_${Date.now()}`,
        serviceId: request.service_id,
        serviceName: fixTextEncoding(request.service_name),
        price: Number(request.price || 0),
        cost,
      },
    ],
    startDate: now,
    endDate,
    status: 'active',
    autoRenew: false,
    totalPrice: Number(request.price || 0),
    totalCost: cost,
    discount: 0,
    currency: request.currency,
    paymentStatus: 'paid',
    paidAmount: Number(request.price || 0),
    paymentMethod: {
      id: 'wallet-balance',
      name: 'رصيد عميل',
      type: 'wallet',
      details: 'خصم تلقائي عبر طلب خدمة',
    },
    subscriptionType: accountType,
    accountType,
    paymentNotes: `طلب خدمة #${request.id}`,
    slotId: activation?.slotId || undefined,
    loginEmail: activation?.loginEmail || request.customer_email || undefined,
    loginPassword: activation?.loginPassword || undefined,
    loginSlotName: activation?.loginSlotName || undefined,
    sourceRequestId: request.id,
  };

  subscriptions.unshift(newSubscription);
  saveArray(SUBSCRIPTIONS_KEY, subscriptions);
  return { subscription: newSubscription as Subscription, created: true as const };
};

const pickDefaultActivationCredentials = (request: ServiceRequest): ActivationCredentials | undefined => {
  const services = loadArray<LocalService>(SERVICES_KEY);
  const service = services.find((s) => String(s.id) === String(request.service_id));
  if (!service) return undefined;

  const accounts = Array.isArray(service.accounts) ? service.accounts : [];
  const sharedAccounts = accounts.filter((a) => String(a?.type || '') === 'shared');
  const candidates = sharedAccounts.flatMap((acc) => {
    const sharedEmails = Array.isArray(acc?.sharedEmails) ? acc.sharedEmails : [];
    return sharedEmails
      .filter((e) => String(e?.email || '').trim().length > 0)
      .map((e) => ({
        id: String(e?.id || ''),
        email: String(e?.email || ''),
        password: e?.password ? String(e.password) : undefined,
        slotName: acc?.name ? String(acc.name) : (acc?.id ? String(acc.id) : undefined),
        usersCount: Array.isArray(e?.users) ? e.users.length : 0,
      }))
      .filter((x) => x.id.length > 0);
  });

  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => a.usersCount - b.usersCount);
  const best = candidates[0];
  return {
    slotId: best.id,
    loginEmail: best.email,
    loginPassword: best.password,
    loginSlotName: best.slotName,
  };
};

const assignCustomerToServiceSlot = (request: ServiceRequest, activation?: ActivationCredentials) => {
  if (!activation?.slotId) return;
  const services = loadArray<LocalService>(SERVICES_KEY);
  const serviceIdx = services.findIndex((s) => String(s.id) === String(request.service_id));
  if (serviceIdx === -1) return;

  const service = services[serviceIdx];
  const accounts = Array.isArray(service.accounts) ? service.accounts : [];
  let changed = false;

  const accountName = getCustomerName(request.customer_id, request.customer?.name);
  const customerEmail = request.customer_email || activation.loginEmail || '';

  const nextAccounts = accounts.map((acc) => {
    const sharedEmails = Array.isArray(acc.sharedEmails) ? acc.sharedEmails : [];
    const nextSharedEmails = sharedEmails.map((se) => {
      if (String(se.id || '') !== String(activation.slotId || '')) return se;
      const users = Array.isArray(se.users) ? se.users : [];
      const exists = users.some((u) => String(u.customerId || '') === String(request.customer_id));
      if (exists) return se;
      changed = true;
      return {
        ...se,
        users: [
          ...users,
          {
            id: `slot_user_${Date.now()}`,
            customerId: request.customer_id,
            name: accountName,
            email: customerEmail,
            linkedAt: new Date().toISOString(),
          },
        ],
      };
    });
    return { ...acc, sharedEmails: nextSharedEmails };
  });

  if (!changed) return;
  services[serviceIdx] = { ...service, accounts: nextAccounts };
  saveArray(SERVICES_KEY, services as any[]);
};

const activateRequestRecords = (request: ServiceRequest, activation?: ActivationCredentials) => {
  const { subscription } = createSubscriptionFromRequest(request, activation);
  assignCustomerToServiceSlot(request, activation);

  let invoiceId: string | null = null;
  let paymentId: string | null = null;

  const invoices = loadArray<any>('app_invoices');
  const existingInvoice = invoices.find((inv: any) => String(inv?.subscriptionId || '') === String(subscription.id));

  if (existingInvoice) {
    invoiceId = String(existingInvoice.id || '');
  } else {
    const invoice = createInvoiceFromSubscription(subscription as any);
    addInvoice(invoice);
    invoiceId = String(invoice.id || '');

    const payment = createPaymentFromSubscription(subscription as any, invoice.invoiceNumber);
    if (payment) {
      const enrichedPayment = {
        ...payment,
        customerId: request.customer_id,
        customerName: subscription.customerName,
        methodName: 'رصيد عميل',
        reference: `طلب خدمة ${request.id}`,
      } as any;
      addPayment(enrichedPayment);
      paymentId = String(enrichedPayment.id || '');
    }
  }

  addCustomerActivity({
    customerId: request.customer_id,
    type: 'subscription_add',
    title: 'تم تفعيل طلب خدمة',
    description: `${request.service_name} - ${request.period_name}`,
    amount: Number(request.price || 0),
    currency: request.currency,
    meta: {
      requestId: request.id,
      subscriptionId: subscription.id,
    },
  });

  if (paymentId) {
    addCustomerActivity({
      customerId: request.customer_id,
      type: 'payment',
      title: 'تم تسجيل دفعة الاشتراك',
      description: `خصم رصيد لتفعيل ${request.service_name}`,
      amount: Number(request.price || 0),
      currency: request.currency,
      meta: {
        requestId: request.id,
        subscriptionId: subscription.id,
        paymentId,
      },
    });
  }

  return {
    subscriptionId: subscription.id,
    invoiceId,
    paymentId,
  };
};

export function useServiceRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = () => {
    const reqs = loadArray<ServiceRequest>(REQUESTS_KEY);
    const accounts = loadArray<LocalCustomerAccount>(ACCOUNTS_KEY);
    const joined = reqs
      .map((r) => {
        const c = accounts.find((a) => a.id === r.customer_id);
        return {
          ...r,
          service_name: fixTextEncoding(r.service_name),
          period_name: fixTextEncoding(r.period_name),
          admin_notes: r.admin_notes ? fixTextEncoding(r.admin_notes) : null,
          customer_email: r.customer_email ? fixTextEncoding(r.customer_email) : null,
          linked_login_email: r.linked_login_email ? fixTextEncoding(r.linked_login_email) : null,
          customer: c
            ? {
                name: c.name,
                whatsapp_number: c.whatsapp_number,
                balance: Number(c.balance || 0),
                balance_sar: c.balance_sar,
                balance_yer: c.balance_yer,
                balance_usd: c.balance_usd,
              }
            : undefined,
        } as ServiceRequest;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
      const requiredAmount = Number(request.price || 0);
      const availableBalance = getAvailableBalance(request.customer_id, request.currency);
      if (!Number.isFinite(requiredAmount) || requiredAmount <= 0) {
        toast.error('Invalid service price');
        return false;
      }
      if (availableBalance < requiredAmount) {
        toast.error('Insufficient balance. Please use WhatsApp order.');
        return false;
      }

      adjustBalance(request.customer_id, request.currency, -Number(request.price || 0));

      const now = new Date().toISOString();
      const req: ServiceRequest = {
        id: `req_${Date.now()}`,
        customer_id: request.customer_id,
        service_id: request.service_id,
        service_name: fixTextEncoding(request.service_name),
        period_name: fixTextEncoding(request.period_name),
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
    request?: ServiceRequest,
    activation?: ActivationCredentials
  ) => {
    try {
      const reqs = loadArray<ServiceRequest>(REQUESTS_KEY);
      const idx = reqs.findIndex((r) => r.id === id);
      if (idx === -1) return false;

      const targetRequest = request || reqs[idx];

      if ((status === 'rejected' || status === 'failed') && targetRequest) {
        adjustBalance(targetRequest.customer_id, targetRequest.currency, Number(targetRequest.price || 0));
      }

      let linkPatch: Partial<ServiceRequest> = {};
      const wasAlreadyActivated =
        reqs[idx].status === 'activated' && Boolean(reqs[idx].linked_subscription_id);

      if (status === 'activated' && targetRequest && !wasAlreadyActivated) {
        const effectiveActivation = activation || pickDefaultActivationCredentials(targetRequest);
        const links = activateRequestRecords(targetRequest, effectiveActivation);

        const baseNotes = typeof admin_notes === 'string' ? admin_notes : (reqs[idx].admin_notes || '');
        const autoLinkNote = effectiveActivation?.loginEmail
          ? `تم ربط التفعيل على الإيميل: ${effectiveActivation.loginEmail}`
          : '';

        linkPatch = {
          linked_subscription_id: links.subscriptionId,
          linked_invoice_id: links.invoiceId,
          linked_payment_id: links.paymentId,
          linked_login_email: effectiveActivation?.loginEmail || null,
          linked_slot_id: effectiveActivation?.slotId || null,
          activated_at: new Date().toISOString(),
          admin_notes: [baseNotes, autoLinkNote].filter(Boolean).join(' | ') || null,
        };
      }

      reqs[idx] = {
        ...reqs[idx],
        ...linkPatch,
        status,
        admin_notes: Object.prototype.hasOwnProperty.call(linkPatch, 'admin_notes')
          ? (linkPatch as any).admin_notes
          : (typeof admin_notes === 'string' ? admin_notes : (reqs[idx].admin_notes || null)),
        updated_at: new Date().toISOString(),
      };
      saveArray(REQUESTS_KEY, reqs);

      const statusMessages: Record<ServiceRequestStatus, string> = {
        pending: 'تم تحويل الطلب إلى معلق',
        processing: 'جاري معالجة الطلب',
        approved: 'تمت الموافقة على الطلب',
        rejected: 'تم رفض الطلب واسترداد الرصيد',
        activated: 'تم تفعيل الخدمة وربطها بالاشتراكات والفواتير والمدفوعات',
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
