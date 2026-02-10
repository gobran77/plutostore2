import { useState, useEffect } from 'react';
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
  HeadphonesIcon
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
  payment_status?: string;
  start_date: string;
  end_date: string;
  status: string;
}

export default function CustomerDashboard() {
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'subscriptions' | 'services' | 'tickets'>('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  // Admin WhatsApp number
  const adminWhatsApp = '201030638992';

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
        .select('*')
        .eq('customer_id', customerId)
        .order('end_date', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      toast.error('حدث خطأ في تحميل الاشتراكات');
    } finally {
      setIsLoading(false);
    }
  };

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
                <span>لديك مبالغ مستحقة في بعض العملات</span>
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
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border py-2 px-4">
        <div className="max-w-lg mx-auto flex justify-around">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'home' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-xs">الرئيسية</span>
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'subscriptions' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-xs">اشتراكاتي</span>
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
              activeTab === 'services' ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-xs">الخدمات</span>
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
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
