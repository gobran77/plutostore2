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
  KeyRound
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { differenceInDays, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { AdminCustomerControls } from '@/components/customer/AdminCustomerControls';
import { ServicesSection } from '@/components/customer/ServicesSection';
import { CustomerTickets } from '@/components/customer/CustomerTickets';
import { getCurrencySymbol } from '@/types/currency';

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

export default function CustomerDashboard() {
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'subscriptions' | 'credentials' | 'services' | 'tickets'>('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [credentialsUpdated, setCredentialsUpdated] = useState(false);
  const slotIdsRef = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  // Admin WhatsApp number
  const adminWhatsApp = '201030638992';
  const SUBSCRIPTIONS_STORAGE_KEY = 'app_subscriptions';

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

  useEffect(() => {
    // Check for admin session first
    const adminSession = localStorage.getItem('admin_session');
    if (adminSession) {
      setIsAdmin(true);
    }

    const session = localStorage.getItem('customer_session');
    if (!session) {
      navigate('/customer');
      return;
    }

    const customerData = JSON.parse(session) as CustomerSession;
    setCustomer(customerData);
    fetchSubscriptions(customerData.id);
    fetchUpdatedBalance(customerData.id);
  }, [navigate]);

  const fetchUpdatedBalance = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_accounts')
        .select('balance, currency, balance_sar, balance_yer, balance_usd')
        .eq('id', customerId)
        .single();

      if (!error && data) {
        const balances: CustomerBalances = {
          balance_sar: data.balance_sar || 0,
          balance_yer: data.balance_yer || 0,
          balance_usd: data.balance_usd || 0,
        };
        
        setCustomer(prev => prev ? { 
          ...prev, 
          balance: data.balance || 0, 
          currency: data.currency || 'SAR',
          balances 
        } : null);
        
        // Update session
        const session = localStorage.getItem('customer_session');
        if (session) {
          const parsed = JSON.parse(session);
          parsed.balance = data.balance || 0;
          parsed.currency = data.currency || 'SAR';
          parsed.balances = balances;
          localStorage.setItem('customer_session', JSON.stringify(parsed));
        }
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  const fetchSubscriptions = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_subscriptions')
        .select('*, service_slots(email, password, slot_name, updated_at)')
        .eq('customer_id', customerId)
        .order('end_date', { ascending: false });

      if (error) {
        console.error('Error fetching subscriptions (db):', error);
        const localSubs = loadLocalSubscriptionsForCustomer(customerId);
        if (localSubs.length > 0) {
          setSubscriptions(localSubs);
          return;
        }
        toast.error('حدث خطأ في تحميل الاشتراكات');
        setSubscriptions([]);
        return;
      }

      const dbSubs = (data || []) as Subscription[];
      if (dbSubs.length > 0) {
        setSubscriptions(dbSubs);
        return;
      }

      // Fallback for environments where customer_subscriptions has limited fields or is empty:
      // use localStorage subscriptions created by the admin in this browser.
      const localSubs = loadLocalSubscriptionsForCustomer(customerId);

      // Attach slot credentials for shared subscriptions.
      const slotIds = Array.from(new Set(localSubs.map((s) => s.slot_id).filter((v): v is string => typeof v === 'string' && v.length > 0)));
      if (slotIds.length > 0) {
        const { data: slotsData, error: slotsErr } = await supabase
          .from('service_slots')
          .select('id, email, password, slot_name, updated_at')
          .in('id', slotIds);

        if (slotsErr) {
          console.error('Error fetching service slots:', slotsErr);
          setSubscriptions(localSubs);
          return;
        }

        const byId = new Map<string, any>((slotsData || []).map((x: any) => [String(x.id), x]));
        const withSlots = localSubs.map((s) => {
          const slot = s.slot_id ? byId.get(String(s.slot_id)) : null;
          return slot ? { ...s, service_slots: slot } : s;
        });
        setSubscriptions(withSlots);
      } else {
        setSubscriptions(localSubs);
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err);

      const local = loadLocalSubscriptionsForCustomer(customerId);
      if (local.length > 0) {
        setSubscriptions(local);
      } else {
        toast.error('حدث خطأ في تحميل الاشتراكات');
        setSubscriptions([]);
      }
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

  // Listen for credential changes on assigned slots and notify the customer.
  useEffect(() => {
    if (!customer?.id) return;

    const channel = supabase
      .channel(`customer-slot-updates-${customer.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_slots',
        },
        (payload: any) => {
          const updatedId = payload?.new?.id as string | undefined;
          if (!updatedId || !slotIdsRef.current.has(updatedId)) return;

          setCredentialsUpdated(true);
          toast.error('تم تحديث بيانات الدخول. يرجى تسجيل الدخول من جديد والتواصل مع الادمن لطلب كود التحقق.');

          // Update UI immediately even if fetching subscriptions is blocked (RLS/network).
          const nextEmail = payload?.new?.email ?? null;
          const nextPassword = payload?.new?.password ?? null;
          const nextSlotName = payload?.new?.slot_name ?? null;
          const nextUpdatedAt = payload?.new?.updated_at ?? new Date().toISOString();

          setSubscriptions((prev) =>
            prev.map((s) =>
              s.slot_id === updatedId
                ? {
                    ...s,
                    service_slots: {
                      email: nextEmail,
                      password: nextPassword,
                      slot_name: nextSlotName,
                      updated_at: nextUpdatedAt,
                    },
                  }
                : s
            )
          );
          fetchSubscriptions(customer.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      // Create renewal request in database
      const { error } = await supabase
        .from('renewal_requests')
        .insert({
          customer_id: customer.id,
          subscription_id: subscription.id,
          status: 'pending'
        });

      if (error) throw error;

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
        <div className="grid grid-cols-3 gap-2">
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
        </div>

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
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border py-2 px-3">
        <div className="max-w-lg mx-auto flex flex-wrap justify-between gap-1">
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
            onClick={() => setActiveTab('tickets')}
            className={`flex flex-1 min-w-[64px] flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${
              activeTab === 'tickets' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <HeadphonesIcon className="w-5 h-5" />
            <span className="text-xs">الدعم</span>
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
