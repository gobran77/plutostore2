import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  Wallet, 
  CreditCard, 
  LogOut, 
  Phone,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageCircle,
  Package,
  HeadphonesIcon,
  KeyRound,
  Settings,
  Fingerprint,
  Bell,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { AdminCustomerControls } from '@/components/customer/AdminCustomerControls';
import { ServicesSection } from '@/components/customer/ServicesSection';
import { CustomerTickets } from '@/components/customer/CustomerTickets';
import { getCurrencySymbol } from '@/types/currency';
import { getCustomerAccounts, updateCustomerAccountRecord } from '@/lib/customerAccountsStorage';
import { getCustomerActivity, type CustomerActivityItem } from '@/lib/customerActivityLog';
import {
  getCustomerPasskeyStatus,
  isPasskeySupported,
  registerCustomerPasskey,
  removeCustomerPasskey,
  setCustomerPasskeyEnabled,
} from '@/lib/customerPasskeyAuth';

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
  balances: CustomerBalances;
  activation_code?: string;
  impersonated_by_admin?: boolean;
}

interface Subscription {
  id: string;
  service_name: string;
  price: number;
  currency: string;
  payment_status?: string | null;
  paid_amount?: number | null;
  due_date?: string | null;
  payment_notes?: string | null;
  start_date: string;
  end_date: string;
  status: string;
  slot_id?: string | null;
  service_slots?: {
    email: string | null;
    password: string | null;
    slot_name: string | null;
    updated_at: string;
  } | null;
}

interface PaymentMethodInfo {
  id: string;
  name: string;
  type: 'bank' | 'wallet' | 'card' | 'cash';
  details?: string;
  active: boolean;
}

interface CustomerPaymentRecord {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  paidAt: string;
  methodName?: string;
}

export default function CustomerDashboard() {
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'subscriptions' | 'credentials' | 'services' | 'report' | 'tickets' | 'settings'>('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [credentialsUpdated, setCredentialsUpdated] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodInfo[]>([]);
  const [accountActivities, setAccountActivities] = useState<CustomerActivityItem[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPaymentRecord[]>([]);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyConfigured, setPasskeyConfigured] = useState(false);
  const [passkeyEnabled, setPasskeyEnabled] = useState(false);
  const [isPasskeyBusy, setIsPasskeyBusy] = useState(false);
  const slotIdsRef = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  // Admin WhatsApp number
  const adminWhatsApp = '201030638992';
  const SUBSCRIPTIONS_STORAGE_KEY = 'app_subscriptions';
  const PAYMENT_METHODS_STORAGE_KEY = 'app_payment_methods';
  const PAYMENTS_STORAGE_KEY = 'app_payments';
  const CUSTOMER_ACTIVITY_KEY = 'app_customer_activity';

  const getOutstandingDebtByCurrency = (customerId: string): CustomerBalances => {
    try {
      const raw = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) {
        return { balance_sar: 0, balance_yer: 0, balance_usd: 0 };
      }

      const debt = { balance_sar: 0, balance_yer: 0, balance_usd: 0 };
      parsed
        .filter((s: any) => String(s?.customerId || '') === String(customerId))
        .forEach((s: any) => {
          const paymentStatus = String(s?.paymentStatus || 'paid');
          if (paymentStatus === 'paid') return;

          const totalPrice = Number(s?.totalPrice || 0);
          const paidAmount = Number(s?.paidAmount || 0);
          const remaining = Math.max(0, totalPrice - paidAmount);
          if (remaining <= 0) return;

          const currency = String(s?.currency || '').toUpperCase();
          if (currency === 'SAR') debt.balance_sar += remaining;
          if (currency === 'YER') debt.balance_yer += remaining;
          if (currency === 'USD') debt.balance_usd += remaining;
        });

      return debt;
    } catch {
      return { balance_sar: 0, balance_yer: 0, balance_usd: 0 };
    }
  };

  const loadLocalSubscriptionsForCustomer = (customerId: string): Subscription[] => {
    try {
      const raw = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((s: any) => String(s?.customerId || '') === customerId)
        .map((s: any) => {
          const start = s?.startDate ? new Date(s.startDate) : (s?.start_date ? new Date(s.start_date) : new Date());
          const end = s?.endDate ? new Date(s.endDate) : (s?.end_date ? new Date(s.end_date) : new Date());
          const due = s?.dueDate ? new Date(s.dueDate) : (s?.due_date ? new Date(s.due_date) : null);

          const services = Array.isArray(s?.services) ? s.services : [];
          const serviceName = services.length > 0
            ? services.map((x: any) => String(x?.serviceName || '')).filter(Boolean).join(', ')
            : String(s?.service_name || s?.serviceName || '');

          return {
            id: String(s?.id || `${Date.now()}`),
            service_name: serviceName || 'خدمة',
            price: Number(s?.totalPrice ?? s?.price ?? 0),
            currency: String(s?.currency || 'SAR'),
            payment_status: s?.paymentStatus ? String(s.paymentStatus) : (s?.payment_status ? String(s.payment_status) : null),
            paid_amount: typeof s?.paidAmount === 'number' ? s.paidAmount : (typeof s?.paid_amount === 'number' ? s.paid_amount : null),
            due_date: due ? due.toISOString() : null,
            payment_notes: s?.paymentNotes ? String(s.paymentNotes) : (s?.payment_notes ? String(s.payment_notes) : null),
            start_date: start.toISOString(),
            end_date: end.toISOString(),
            status: String(s?.status || 'active'),
            slot_id: s?.slotId ? String(s.slotId) : (s?.slot_id ? String(s.slot_id) : null),
            service_slots: (s?.loginEmail || s?.loginPassword || s?.loginSlotName) ? {
              email: s?.loginEmail ? String(s.loginEmail) : null,
              password: s?.loginPassword ? String(s.loginPassword) : null,
              slot_name: s?.loginSlotName ? String(s.loginSlotName) : null,
              updated_at: s?.loginUpdatedAt ? String(s.loginUpdatedAt) : new Date().toISOString(),
            } : null,
          } as Subscription;
        });
    } catch (e) {
      console.error('Error loading local subscriptions:', e);
      return [];
    }
  };

  const loadPaymentMethods = () => {
    try {
      const raw = localStorage.getItem(PAYMENT_METHODS_STORAGE_KEY);
      if (!raw) {
        setPaymentMethods([]);
        return;
      }
      const parsed = JSON.parse(raw);
      setPaymentMethods(Array.isArray(parsed) ? parsed : []);
    } catch {
      setPaymentMethods([]);
    }
  };

  const loadCustomerPayments = (customerId: string, customerName: string) => {
    try {
      const raw = localStorage.getItem(PAYMENTS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const list = (Array.isArray(parsed) ? parsed : [])
        .filter((p: any) => {
          const byId = String(p?.customerId || '') === String(customerId);
          const byName = String(p?.customerName || '') === String(customerName || '');
          return byId || byName;
        })
        .map((p: any) => ({
          id: String(p?.id || ''),
          invoiceNumber: String(p?.invoiceNumber || ''),
          amount: Number(p?.amount || 0),
          currency: String(p?.currency || 'SAR'),
          paidAt: p?.paidAt ? new Date(p.paidAt).toISOString() : new Date().toISOString(),
          methodName: p?.methodName ? String(p.methodName) : String(p?.method || ''),
        }))
        .sort((a: CustomerPaymentRecord, b: CustomerPaymentRecord) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
      setCustomerPayments(list);
    } catch {
      setCustomerPayments([]);
    }
  };

  const loadAccountActivities = (customerId: string) => {
    setAccountActivities(getCustomerActivity(customerId, 100));
  };

  const refreshPasskeyState = (customerId: string) => {
    const status = getCustomerPasskeyStatus(customerId);
    setPasskeyConfigured(status.configured);
    setPasskeyEnabled(status.enabled);
  };

  useEffect(() => {
    const initSession = async () => {
      const session = localStorage.getItem('customer_session');
      if (!session) {
        navigate('/customer', { replace: true });
        return;
      }

      let customerData: CustomerSession;
      try {
        customerData = JSON.parse(session) as CustomerSession;
      } catch {
        localStorage.removeItem('customer_session');
        navigate('/customer', { replace: true });
        return;
      }

      const sessionId = String(customerData?.id || '').trim();
      if (!sessionId) {
        localStorage.removeItem('customer_session');
        navigate('/customer', { replace: true });
        return;
      }

      try {
        const accounts = await getCustomerAccounts();
        const account = accounts.find((a) => String(a.id) === sessionId);
        if (!account) {
          // Prevent stale/deleted sessions from showing old fixed users after refresh.
          localStorage.removeItem('customer_session');
          toast.error('انتهت جلسة هذا الحساب. يرجى تسجيل الدخول مرة أخرى.');
          navigate('/customer', { replace: true });
          return;
        }

        const adminSession = localStorage.getItem('admin_session');
        const isAdminImpersonation = Boolean(customerData?.impersonated_by_admin) && Boolean(adminSession);
        setIsAdmin(isAdminImpersonation);

        // Ensure balances object exists (older sessions won't have it).
        const balances: CustomerBalances = customerData.balances || {
          balance_sar: 0,
          balance_yer: 0,
          balance_usd: 0,
        };
        const normalized = { ...customerData, balances };
        setCustomer(normalized);
        fetchSubscriptions(normalized.id);
        fetchUpdatedBalance(normalized.id);
        loadPaymentMethods();
        loadCustomerPayments(normalized.id, normalized.name);
        loadAccountActivities(normalized.id);
      } catch (error) {
        console.error('Error validating customer session:', error);
        navigate('/customer', { replace: true });
      }
    };

    initSession();
  }, [navigate]);

  useEffect(() => {
    setPasskeySupported(isPasskeySupported());
    if (customer?.id) {
      refreshPasskeyState(customer.id);
    } else {
      setPasskeyConfigured(false);
      setPasskeyEnabled(false);
    }
  }, [customer?.id]);

  const fetchUpdatedBalance = async (customerId: string) => {
    try {
      const accounts = await getCustomerAccounts();
      const account = accounts.find((a) => String(a.id) === String(customerId));
      if (!account) {
        localStorage.removeItem('customer_session');
        navigate('/customer', { replace: true });
        return;
      }

      const storedBalances: CustomerBalances = {
        balance_sar: Number((account as any)?.balance_sar || 0),
        balance_yer: Number((account as any)?.balance_yer || 0),
        balance_usd: Number((account as any)?.balance_usd || 0),
      };
      const debt = getOutstandingDebtByCurrency(customerId);

      // Keep positive credit as-is. Normalize stale negative debt to actual outstanding debt.
      const nextBalances: CustomerBalances = {
        balance_sar: storedBalances.balance_sar < 0 ? -debt.balance_sar : storedBalances.balance_sar,
        balance_yer: storedBalances.balance_yer < 0 ? -debt.balance_yer : storedBalances.balance_yer,
        balance_usd: storedBalances.balance_usd < 0 ? -debt.balance_usd : storedBalances.balance_usd,
      };

      const shouldPatchAccount =
        nextBalances.balance_sar !== storedBalances.balance_sar ||
        nextBalances.balance_yer !== storedBalances.balance_yer ||
        nextBalances.balance_usd !== storedBalances.balance_usd;

      if (shouldPatchAccount) {
        await updateCustomerAccountRecord(account.id, nextBalances as any);
      }

      setCustomer((prev) => {
        if (!prev || String(prev.id) !== String(customerId)) return prev;
        const next = {
          ...prev,
          balance: Number((account as any)?.balance || prev.balance || 0),
          currency: String((account as any)?.currency || prev.currency || 'SAR'),
          balances: nextBalances,
        };
        localStorage.setItem('customer_session', JSON.stringify(next));
        return next;
      });
    } catch (error) {
      console.error('Error fetching updated customer balance:', error);
    }
  };

  const fetchSubscriptions = async (customerId: string) => {
    try {
      const localSubs = loadLocalSubscriptionsForCustomer(customerId);
      setSubscriptions(localSubs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    slotIdsRef.current = new Set(
      subscriptions
        .map((s) => s.slot_id)
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
    );
  }, [subscriptions]);

  // No realtime. Keep a simple in-browser sync via storage events.
  useEffect(() => {
    if (!customer?.id) return;

    const onStorage = (e: StorageEvent) => {
      if (e.key === SUBSCRIPTIONS_STORAGE_KEY) {
        fetchSubscriptions(customer.id);
      }
      if (e.key === 'app_customer_accounts') {
        fetchUpdatedBalance(customer.id);
      }
      if (e.key === PAYMENT_METHODS_STORAGE_KEY) {
        loadPaymentMethods();
      }
      if (e.key === PAYMENTS_STORAGE_KEY) {
        loadCustomerPayments(customer.id, customer.name);
      }
      if (e.key === CUSTOMER_ACTIVITY_KEY) {
        loadAccountActivities(customer.id);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [customer?.id]);

  const handleLogout = () => {
    localStorage.removeItem('customer_session');
    if (isAdmin) {
      navigate('/customers');
      toast.success('تم الخروج من حساب العميل');
    } else {
      navigate('/customer');
      toast.success('تم تسجيل الخروج بنجاح');
    }
  };

  const refreshData = () => {
    if (customer) {
      fetchSubscriptions(customer.id);
      fetchUpdatedBalance(customer.id);
      loadPaymentMethods();
      loadCustomerPayments(customer.id, customer.name);
      loadAccountActivities(customer.id);
      refreshPasskeyState(customer.id);
    }
  };

  const handleEnableFaceLogin = async () => {
    if (!customer || isAdmin) return;
    if (!passkeySupported) {
      toast.error('هذا الجهاز أو المتصفح لا يدعم بصمة الوجه');
      return;
    }

    setIsPasskeyBusy(true);
    try {
      await registerCustomerPasskey({
        id: customer.id,
        name: customer.name,
        whatsapp_number: customer.whatsapp_number,
      });
      setCustomerPasskeyEnabled(customer.id, true);
      await updateCustomerAccountRecord(customer.id, { biometric_face_enabled: true } as any);
      refreshPasskeyState(customer.id);
      toast.success('تم تفعيل تسجيل الدخول ببصمة الوجه');
    } catch (error: any) {
      const name = String(error?.name || '');
      const code = String(error?.message || '');
      if (code === 'unsupported') {
        toast.error('هذا الجهاز أو المتصفح لا يدعم بصمة الوجه');
      } else if (name === 'NotAllowedError') {
        toast.error('تم إلغاء طلب التفعيل');
      } else if (name === 'InvalidStateError') {
        toast.info('تم تسجيل بصمة مسبقاً على هذا الجهاز');
        refreshPasskeyState(customer.id);
      } else {
        console.error('Failed to enable face login:', error);
        toast.error('تعذر تفعيل بصمة الوجه');
      }
    } finally {
      setIsPasskeyBusy(false);
    }
  };

  const handleDisableFaceLogin = async () => {
    if (!customer || isAdmin) return;
    setIsPasskeyBusy(true);
    try {
      setCustomerPasskeyEnabled(customer.id, false);
      await updateCustomerAccountRecord(customer.id, { biometric_face_enabled: false } as any);
      refreshPasskeyState(customer.id);
      toast.success('تم إيقاف تسجيل الدخول ببصمة الوجه');
    } catch (error) {
      console.error('Failed to disable face login:', error);
      toast.error('تعذر إيقاف بصمة الوجه');
    } finally {
      setIsPasskeyBusy(false);
    }
  };

  const handleRemoveFaceLogin = async () => {
    if (!customer || isAdmin) return;
    setIsPasskeyBusy(true);
    try {
      removeCustomerPasskey(customer.id);
      await updateCustomerAccountRecord(customer.id, { biometric_face_enabled: false } as any);
      refreshPasskeyState(customer.id);
      toast.success('تم حذف بصمة الوجه من هذا الجهاز');
    } catch (error) {
      console.error('Failed to remove face login:', error);
      toast.error('تعذر حذف بصمة الوجه');
    } finally {
      setIsPasskeyBusy(false);
    }
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

  const handleRenewalRequest = async (subscription: Subscription) => {
    if (!customer) return;

    try {
      // Store renewal requests locally (admin can review from local data if needed).
      try {
        const key = 'app_renewal_requests';
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        const arr = Array.isArray(parsed) ? parsed : [];
        arr.unshift({
          id: `ren_${Date.now()}`,
          customer_id: customer.id,
          subscription_id: subscription.id,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
        localStorage.setItem(key, JSON.stringify(arr));
      } catch {
        // ignore local persistence issues; WhatsApp message is the main path.
      }

      // Send WhatsApp message
      const message = encodeURIComponent(
        `طلب تجديد اشتراك\n\n` +
        `العميل: ${customer.name}\n` +
        `رقم الواتساب: ${customer.whatsapp_number}\n` +
        `الخدمة: ${subscription.service_name}\n` +
        `السعر: ${subscription.price} ${subscription.currency}`
      );
      
      window.open(`https://wa.me/${adminWhatsApp}?text=${message}`, '_blank');
      toast.success('تم إرسال طلب التجديد بنجاح');
    } catch (err) {
      console.error('Error creating renewal request:', err);
      toast.error('حدث خطأ في إرسال طلب التجديد');
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    // Set both dates to start of day to get accurate day count
    end.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return differenceInDays(end, now) + 1; // Add 1 to include end day
  };

  const getStatusInfo = (subscription: Subscription) => {
    const daysRemaining = getDaysRemaining(subscription.end_date);
    
    if (subscription.status === 'cancelled') {
      return { icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10', text: 'ملغي' };
    }
    if (daysRemaining < 0) {
      return { icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10', text: 'منتهي' };
    }
    if (daysRemaining <= 3) {
      return { icon: AlertTriangle, color: 'text-warning', bgColor: 'bg-warning/10', text: 'ينتهي قريباً' };
    }
    return { icon: CheckCircle, color: 'text-success', bgColor: 'bg-success/10', text: 'نشط' };
  };

  // Get total balance across all currencies (for display purposes)
  const getTotalBalanceDisplay = () => {
    if (!customer?.balances) return null;
    
    const { balance_sar, balance_yer, balance_usd } = customer.balances;
    const currencies = [
      { code: 'SAR', balance: balance_sar, symbol: getCurrencySymbol('SAR') },
      { code: 'YER', balance: balance_yer, symbol: getCurrencySymbol('YER') },
      { code: 'USD', balance: balance_usd, symbol: getCurrencySymbol('USD') },
    ];
    
    return currencies.filter(c => c.balance !== 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!customer) return null;

  const activeCurrencies = getTotalBalanceDisplay() || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="bg-gradient-primary text-white p-4 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold">بلوتو ستور AI</h1>
              <p className="text-xs text-white/70">مرحباً {customer.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4 pb-24">
        {credentialsUpdated && (
          <Card className="border-0 shadow-md overflow-hidden">
            <CardContent className="p-4 bg-destructive/10 border border-destructive/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div className="space-y-2">
                  <p className="font-semibold text-destructive">تم تحديث بيانات الدخول</p>
                  <p className="text-sm text-muted-foreground">
                    يرجى تسجيل الدخول من جديد والتواصل مع الادمن لطلب كود التحقق.
                  </p>
                  <Button onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
                    <LogOut className="w-4 h-4 ml-2" />
                    تسجيل الخروج
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Multi-Currency Balance Card */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="p-4 bg-gradient-to-br from-primary to-primary/80 text-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-white/80">أرصدتك</span>
              <Wallet className="w-5 h-5 text-white/60" />
            </div>
            
            {/* Currency Balances Grid */}
            <div className="grid grid-cols-3 gap-2">
              {/* SAR */}
              <div className={`p-3 rounded-xl ${
                customer.balances?.balance_sar < 0 
                  ? 'bg-destructive/30' 
                  : 'bg-white/10'
              }`}>
                <p className="text-xs text-white/70 mb-1">ريال سعودي</p>
                <p className={`text-lg font-bold ${
                  customer.balances?.balance_sar < 0 ? 'text-red-200' : ''
                }`}>
                  {(customer.balances?.balance_sar || 0).toLocaleString()}
                </p>
                <p className="text-xs text-white/50">SAR</p>
              </div>
              
              {/* YER */}
              <div className={`p-3 rounded-xl ${
                customer.balances?.balance_yer < 0 
                  ? 'bg-destructive/30' 
                  : 'bg-white/10'
              }`}>
                <p className="text-xs text-white/70 mb-1">ريال يمني</p>
                <p className={`text-lg font-bold ${
                  customer.balances?.balance_yer < 0 ? 'text-red-200' : ''
                }`}>
                  {(customer.balances?.balance_yer || 0).toLocaleString()}
                </p>
                <p className="text-xs text-white/50">YER</p>
              </div>
              
              {/* USD */}
              <div className={`p-3 rounded-xl ${
                customer.balances?.balance_usd < 0 
                  ? 'bg-destructive/30' 
                  : 'bg-white/10'
              }`}>
                <p className="text-xs text-white/70 mb-1">دولار</p>
                <p className={`text-lg font-bold ${
                  customer.balances?.balance_usd < 0 ? 'text-red-200' : ''
                }`}>
                  {(customer.balances?.balance_usd || 0).toLocaleString()}
                </p>
                <p className="text-xs text-white/50">USD</p>
              </div>
            </div>

            {/* Debt Warning */}
            {(customer.balances?.balance_sar < 0 || 
              customer.balances?.balance_yer < 0 || 
              customer.balances?.balance_usd < 0) && (
              <div className="mt-3 p-2 bg-destructive/20 rounded-lg flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>يوجد عليكم مبالغ مستحقة في بعض العملات</span>
              </div>
            )}
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-0 shadow-md">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-primary">
                {subscriptions.filter(s => getDaysRemaining(s.end_date) > 0 && s.status !== 'cancelled').length}
              </div>
              <span className="text-xs text-muted-foreground">اشتراكات نشطة</span>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-warning">
                {subscriptions.filter(s => getDaysRemaining(s.end_date) <= 3 && getDaysRemaining(s.end_date) > 0).length}
              </div>
              <span className="text-xs text-muted-foreground">تنتهي قريباً</span>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-destructive">
                {subscriptions.filter(s => getDaysRemaining(s.end_date) <= 0).length}
              </div>
              <span className="text-xs text-muted-foreground">منتهية</span>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          <Card 
            className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
            onClick={handleRechargeRequest}
          >
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mb-2">
                <MessageCircle className="w-5 h-5 text-success" />
              </div>
              <span className="text-xs font-medium">شحن رصيد</span>
            </CardContent>
          </Card>

          <Card 
            className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setActiveTab('subscriptions')}
          >
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium">اشتراكاتي</span>
            </CardContent>
          </Card>

          <Card 
            className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setActiveTab('services')}
          >
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                <Package className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="text-xs font-medium">الخدمات</span>
            </CardContent>
          </Card>

          <Card
            className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setActiveTab('report')}
          >
            <CardContent className="p-3 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium">تقرير الحساب</span>
            </CardContent>
          </Card>
        </div>

        {activeTab === 'report' && (
          <>
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  إشعارات الحساب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {accountActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">لا توجد إشعارات حالياً</p>
                ) : (
                  accountActivities.slice(0, 10).map((item) => (
                    <div key={item.id} className="p-3 rounded-lg bg-muted/40 border border-border">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{item.title}</p>
                        {typeof item.amount === 'number' && item.amount > 0 && (
                          <span className="text-xs font-semibold text-primary">
                            {item.amount.toLocaleString()} {item.currency || ''}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(item.createdAt), 'dd MMM yyyy - HH:mm', { locale: ar })}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  تقرير الحساب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground">إجمالي الاشتراكات</p>
                    <p className="font-bold">{subscriptions.length}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground">الخدمات النشطة</p>
                    <p className="font-bold">{subscriptions.filter((s) => getDaysRemaining(s.end_date) > 0 && s.status !== 'cancelled').length}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground">عمليات الدفع</p>
                    <p className="font-bold">{customerPayments.length}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">أنواع الخدمات المشترك بها</p>
                  {subscriptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">لا توجد خدمات مسجلة.</p>
                  ) : (
                    subscriptions.slice(0, 10).map((sub) => (
                      <div key={sub.id} className="p-2 rounded-md border border-border text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{sub.service_name}</span>
                          <span className="text-muted-foreground">{sub.price} {sub.currency}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          من {format(new Date(sub.start_date), 'dd MMM yyyy', { locale: ar })} إلى {format(new Date(sub.end_date), 'dd MMM yyyy', { locale: ar })}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">آخر المدفوعات</p>
                  {customerPayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">لا توجد مدفوعات مسجلة.</p>
                  ) : (
                    customerPayments.slice(0, 10).map((pay) => (
                      <div key={pay.id} className="p-2 rounded-md border border-border text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{pay.invoiceNumber || 'دفعة'}</span>
                          <span className="text-primary font-semibold">
                            {pay.amount.toLocaleString()} {pay.currency}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(pay.paidAt), 'dd MMM yyyy - HH:mm', { locale: ar })}
                          {pay.methodName ? ` • ${pay.methodName}` : ''}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Deferred/Partial Payment Alert */}
        {(() => {
          const dueSubs = subscriptions
            .filter((s) => (s.payment_status === 'deferred' || s.payment_status === 'partial'))
            .map((s) => {
              const paid = typeof s.paid_amount === 'number' ? s.paid_amount : 0;
              const remaining = Math.max(0, Number(s.price || 0) - paid);
              const due = s.due_date ? new Date(s.due_date) : null;
              const daysLeft = due ? differenceInDays(new Date(due), new Date()) : null;
              return { s, remaining, due, daysLeft };
            })
            .filter((x) => x.remaining > 0);

          if (dueSubs.length === 0) return null;

          const top = dueSubs[0];
          const activeSettlementMethods = paymentMethods.filter(
            (m) => m.active && (m.type === 'bank' || m.type === 'wallet')
          );
          return (
            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  يرجى سداد القيمة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">الخدمة: </span>
                  <span className="font-medium">{top.s.service_name}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">المتبقي: </span>
                  <span className="font-bold text-destructive">
                    {top.remaining} {top.s.currency}
                  </span>
                </div>
                {top.due && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">تاريخ الاستحقاق: </span>
                    <span className="font-medium">{format(top.due, 'dd MMM yyyy', { locale: ar })}</span>
                    {typeof top.daysLeft === 'number' && (
                      <span className="text-muted-foreground"> ({top.daysLeft >= 0 ? `متبقي ${top.daysLeft} يوم` : `متأخر ${Math.abs(top.daysLeft)} يوم`})</span>
                    )}
                  </div>
                )}
                {top.s.payment_notes && top.s.payment_notes.trim().length > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">ملاحظة: </span>
                    <span className="font-medium">{top.s.payment_notes}</span>
                  </div>
                )}
                {activeSettlementMethods.length > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">طرق السداد المتاحة: </span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {activeSettlementMethods.map((method) => (
                        <span
                          key={method.id}
                          className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                        >
                          {method.type === 'bank' ? 'بنك: ' : 'محفظة: '}
                          {method.name}
                          {method.details ? ` (${method.details})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Days Remaining Alert */}
        {subscriptions.length > 0 && (
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                الأيام المتبقية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {subscriptions.slice(0, 3).map((sub) => {
                const daysRemaining = getDaysRemaining(sub.end_date);
                const status = getStatusInfo(sub);
                const StatusIcon = status.icon;
                
                return (
                  <div key={sub.id} className={`p-3 rounded-lg ${status.bgColor}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`w-5 h-5 ${status.color}`} />
                        <span className="font-medium text-sm">{sub.service_name}</span>
                      </div>
                      <span className={`text-sm font-bold ${status.color}`}>
                        {daysRemaining < 0 ? 'منتهي' : `${daysRemaining} يوم`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Subscriptions List */}
        {activeTab === 'subscriptions' && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                اشتراكاتي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscriptions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  لا توجد اشتراكات حالياً
                </p>
              ) : (
                subscriptions.map((sub) => {
                  const daysRemaining = getDaysRemaining(sub.end_date);
                  const status = getStatusInfo(sub);
                  const StatusIcon = status.icon;
                  const isExpired = daysRemaining < 0;

                  return (
                    <div key={sub.id} className="border rounded-xl p-4 space-y-3">
                      {/* Service Info */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{sub.service_name}</h3>
                          <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs ${status.bgColor} ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.text}
                          </div>
                        </div>
                        <div className="text-left">
                          <span className="text-lg font-bold text-primary">{sub.price}</span>
                          <span className="text-sm text-muted-foreground mr-1">{sub.currency}</span>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>البداية: {format(new Date(sub.start_date), 'dd MMM yyyy', { locale: ar })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>النهاية: {format(new Date(sub.end_date), 'dd MMM yyyy', { locale: ar })}</span>
                        </div>
                      </div>

                      {/* Days Remaining */}
                      <div className={`text-center py-2 rounded-lg ${status.bgColor}`}>
                        <span className={`text-sm font-medium ${status.color}`}>
                          {isExpired ? 'انتهى الاشتراك' : `متبقي ${daysRemaining} يوم`}
                        </span>
                      </div>

                      {/* Actions for expired/expiring */}
                      {(isExpired || daysRemaining <= 3) && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => handleRenewalRequest(sub)}
                            className="flex-1 bg-gradient-primary"
                          >
                            <RefreshCw className="w-4 h-4 ml-2" />
                            تجديد الاشتراك
                          </Button>
                        </div>
                      )}

                      {/* Login details (shared slots) */}
                      {sub.service_slots?.email && (
                        <div className="pt-3 border-t border-border space-y-2">
                          <p className="text-sm font-semibold">بيانات الدخول</p>
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">الإيميل</span>
                              <span className="font-mono" dir="ltr">{sub.service_slots.email}</span>
                            </div>
                            {sub.service_slots.password && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">كلمة المرور</span>
                                <span className="font-mono" dir="ltr">{sub.service_slots.password}</span>
                              </div>
                            )}
                            {sub.service_slots.slot_name && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">السلوت</span>
                                <span className="font-medium">{sub.service_slots.slot_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}

        {/* Services Section */}
        {activeTab === 'services' && (
          <ServicesSection />
        )}

        {/* Tickets Section */}
        {activeTab === 'tickets' && (
          <CustomerTickets customerId={customer.id} />
        )}

        {/* Credentials Section */}
        {activeTab === 'credentials' && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                بياناتي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscriptions.filter((s) => s.service_slots?.email || s.service_slots?.password).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  لا توجد بيانات دخول حالياً
                </p>
              ) : (
                subscriptions
                  .filter((s) => s.service_slots?.email || s.service_slots?.password)
                  .map((sub) => (
                    <div key={sub.id} className="border rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{sub.service_name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(sub.end_date), 'dd MMM yyyy', { locale: ar })}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-sm">
                        {sub.service_slots?.email && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">الإيميل</span>
                            <span className="font-mono" dir="ltr">{sub.service_slots.email}</span>
                          </div>
                        )}
                        {sub.service_slots?.password && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">كلمة المرور</span>
                            <span className="font-mono" dir="ltr">{sub.service_slots.password}</span>
                          </div>
                        )}
                        {sub.service_slots?.slot_name && (
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">السلوت</span>
                            <span className="font-medium">{sub.service_slots.slot_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Settings Section */}
        {activeTab === 'settings' && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                الإعدادات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-primary" />
                    <p className="font-semibold">تسجيل الدخول ببصمة الوجه</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      passkeyEnabled ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {passkeyEnabled ? 'مفعل' : 'غير مفعل'}
                  </span>
                </div>
                {!passkeySupported ? (
                  <p className="text-sm text-muted-foreground">
                    هذا الجهاز أو المتصفح لا يدعم بصمة الوجه (Passkey).
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    فعّل بصمة الوجه لتسجيل الدخول بسرعة من هذا الجهاز بدون كتابة رقم الهاتف كل مرة.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={handleEnableFaceLogin}
                    disabled={!passkeySupported || isPasskeyBusy || isAdmin}
                    className="h-9"
                  >
                    {isPasskeyBusy ? 'جاري المعالجة...' : passkeyConfigured ? 'إعادة تفعيل' : 'تفعيل بصمة الوجه'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDisableFaceLogin}
                    disabled={!passkeyConfigured || !passkeyEnabled || isPasskeyBusy || isAdmin}
                    className="h-9"
                  >
                    إيقاف مؤقت
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveFaceLogin}
                    disabled={!passkeyConfigured || isPasskeyBusy || isAdmin}
                    className="h-9"
                  >
                    حذف من هذا الجهاز
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border py-2 px-3">
        <div className="max-w-lg mx-auto grid grid-cols-7 gap-1">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-1 min-w-[64px] flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${
              activeTab === 'home' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-xs">الرئيسية</span>
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex flex-1 min-w-[64px] flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${
              activeTab === 'subscriptions' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-xs">اشتراكاتي</span>
          </button>
          <button
            onClick={() => setActiveTab('credentials')}
            className={`flex flex-1 min-w-[64px] flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${
              activeTab === 'credentials' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <KeyRound className="w-5 h-5" />
            <span className="text-xs">بياناتي</span>
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`flex flex-1 min-w-[64px] flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${
              activeTab === 'services' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-xs">الخدمات</span>
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex flex-1 min-w-[64px] flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${
              activeTab === 'report' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-xs">التقرير</span>
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex flex-1 min-w-[64px] flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${
              activeTab === 'tickets' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <HeadphonesIcon className="w-5 h-5" />
            <span className="text-xs">الدعم</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-1 min-w-[64px] flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${
              activeTab === 'settings' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs">الإعدادات</span>
          </button>
        </div>
      </nav>

      {/* Admin Controls - Only show if admin */}
      {isAdmin && (
        <AdminCustomerControls
          customerId={customer.id}
          customerName={customer.name}
          balances={customer.balances || { balance_sar: 0, balance_yer: 0, balance_usd: 0 }}
          subscriptions={subscriptions}
          onUpdate={refreshData}
        />
      )}
    </div>
  );
}
