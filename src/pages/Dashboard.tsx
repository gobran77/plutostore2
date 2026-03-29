import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { SubscriptionsPieChart } from '@/components/dashboard/SubscriptionsPieChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { UpcomingRenewals } from '@/components/dashboard/UpcomingRenewals';
import { CurrencySelector } from '@/components/dashboard/CurrencySelector';
import { CurrencyExchangeModal } from '@/components/dashboard/CurrencyExchangeModal';
import { AddCashModal } from '@/components/dashboard/AddCashModal';
import { ResetBalancesModal } from '@/components/dashboard/ResetBalancesModal';
import { Customer, Subscription } from '@/types';
import { Service } from '@/types/services';
import { Expense } from '@/types/expenses';
import { CurrencyExchange, getCurrencySymbol, supportedCurrencies, recalculateBalances } from '@/types/currency';
import { CashAddition, addCashAddition, loadCashAdditions } from '@/types/cashAdditions';
import {
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Package,
  AlertCircle,
  ArrowRightLeft,
  Wallet,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

const CUSTOMERS_STORAGE_KEY = 'app_customers';
const SUBSCRIPTIONS_STORAGE_KEY = 'app_subscriptions';
const SERVICES_STORAGE_KEY = 'app_services';
const EXPENSES_STORAGE_KEY = 'app_expenses';
const EXCHANGES_STORAGE_KEY = 'app_currency_exchanges';

const Dashboard = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [exchanges, setExchanges] = useState<CurrencyExchange[]>([]);
  const [cashAdditions, setCashAdditions] = useState<CashAddition[]>([]);
  const [currencyBalances, setCurrencyBalances] = useState<Record<string, number>>({});
  const [overduePayments, setOverduePayments] = useState<Subscription[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string | 'all'>('all');
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Load data from localStorage
  useEffect(() => {
    // Load customers
    const savedCustomers = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (savedCustomers) {
      try {
        const parsed = JSON.parse(savedCustomers);
        const customersWithDates = parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
        }));
        setCustomers(customersWithDates);
      } catch (e) {
        console.error('Error loading customers:', e);
      }
    }

    // Load subscriptions
    const savedSubscriptions = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
    if (savedSubscriptions) {
      try {
        const parsed = JSON.parse(savedSubscriptions);
        const subscriptionsWithDates = parsed.map((s: any) => {
          const totalPrice = Number(s?.totalPrice || 0);
          const paidAmountRaw =
            typeof s?.paidAmount === 'number'
              ? s.paidAmount
              : typeof s?.paid_amount === 'number'
              ? s.paid_amount
              : Number(s?.paidAmount ?? s?.paid_amount);
          const paidAmount = Number.isFinite(paidAmountRaw) ? paidAmountRaw : totalPrice;
          const hasOutstanding = totalPrice > paidAmount;
          const paymentStatus =
            s?.paymentStatus ||
            s?.payment_status ||
            (hasOutstanding ? (paidAmount <= 0 ? 'deferred' : 'partial') : 'paid');

          return {
            ...s,
            startDate: new Date(s.startDate),
            endDate: new Date(s.endDate),
            dueDate: s.dueDate ? new Date(s.dueDate) : undefined,
            paymentStatus,
            paidAmount,
          };
        });
        setSubscriptions(subscriptionsWithDates);
      } catch (e) {
        console.error('Error loading subscriptions:', e);
      }
    }

    // Load services
    const savedServices = localStorage.getItem(SERVICES_STORAGE_KEY);
    if (savedServices) {
      try {
        const parsed = JSON.parse(savedServices);
        setServices(parsed);
      } catch (e) {
        console.error('Error loading services:', e);
      }
    }

    // Load expenses
    const savedExpenses = localStorage.getItem(EXPENSES_STORAGE_KEY);
    if (savedExpenses) {
      try {
        const parsed = JSON.parse(savedExpenses);
        setExpenses(parsed.map((e: any) => ({
          ...e,
          date: new Date(e.date),
          createdAt: new Date(e.createdAt),
        })));
      } catch (e) {
        console.error('Error loading expenses:', e);
      }
    }

    // Load exchanges
    const savedExchanges = localStorage.getItem(EXCHANGES_STORAGE_KEY);
    if (savedExchanges) {
      try {
        const parsed = JSON.parse(savedExchanges);
        setExchanges(parsed.map((e: any) => ({
          ...e,
          date: new Date(e.date),
          createdAt: new Date(e.createdAt),
        })));
      } catch (e) {
        console.error('Error loading exchanges:', e);
      }
    }

    // Load cash additions
    setCashAdditions(loadCashAdditions());

    // Recalculate currency balances from all sources
    setCurrencyBalances(recalculateBalances());
  }, []);

  // Check for overdue payments and show notifications
  useEffect(() => {
    const now = new Date();
    const overdue = subscriptions.filter(s => {
      if (s.paymentStatus === 'paid') return false;
      if (!s.dueDate) return false;
      return new Date(s.dueDate) < now;
    });
    setOverduePayments(overdue);
    
    // Show notification for overdue payments
    if (overdue.length > 0) {
      toast.warning(`لديك ${overdue.length} دفعة متأخرة تحتاج إلى متابعة!`, {
        duration: 5000,
        id: 'overdue-payments',
      });
    }
  }, [subscriptions]);

  // Handle currency exchange
  const handleExchange = (exchange: Omit<CurrencyExchange, 'id' | 'createdAt'>) => {
    const newExchange: CurrencyExchange = {
      ...exchange,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    const updated = [newExchange, ...exchanges];
    setExchanges(updated);
    localStorage.setItem(EXCHANGES_STORAGE_KEY, JSON.stringify(updated));
    
    // Recalculate balances after exchange
    setCurrencyBalances(recalculateBalances());
    
    toast.success(`تم تحويل ${exchange.amount} ${getCurrencySymbol(exchange.fromCurrency)} إلى ${exchange.result.toFixed(2)} ${getCurrencySymbol(exchange.toCurrency)}`);
  };

  // Handle cash addition
  const handleAddCash = (data: { amount: number; currency: string; reason: string; notes?: string }) => {
    const newAddition: CashAddition = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date(),
    };
    
    // Save to storage
    addCashAddition(newAddition);
    setCashAdditions([newAddition, ...cashAdditions]);
    
    // Recalculate balances
    setCurrencyBalances(recalculateBalances());
    
    toast.success(`تمت إضافة ${data.amount} ${getCurrencySymbol(data.currency)} للصندوق`);
  };

  // Handle balance reset
  const handleBalanceReset = () => {
    // Reload all data after reset
    window.location.reload();
  };

  // Filter subscriptions by currency
  const filteredSubscriptions = selectedCurrency === 'all' 
    ? subscriptions 
    : subscriptions.filter(s => s.currency === selectedCurrency);

  const filteredExpenses = selectedCurrency === 'all'
    ? expenses
    : expenses.filter(e => e.currency === selectedCurrency);

  // Calculate statistics per currency or all
  const totalRevenue = filteredSubscriptions.reduce((sum, s) => sum + s.totalPrice, 0);
  const totalCost = filteredSubscriptions.reduce((sum, s) => sum + s.totalCost, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalCost - totalExpenses;
  const totalDebt = filteredSubscriptions
    .filter(s => s.paymentStatus !== 'paid')
    .reduce((sum, s) => sum + (s.totalPrice - s.paidAmount), 0);
  const deferredCount = filteredSubscriptions.filter(s => s.paymentStatus === 'deferred' || s.paymentStatus === 'partial').length;
  
  const activeSubscriptions = filteredSubscriptions.filter(s => s.status === 'active').length;
  
  // Check for subscriptions expiring within 7 days
  const today = new Date();
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiringSoon = filteredSubscriptions.filter(s => {
    const endDate = new Date(s.endDate);
    return s.status === 'active' && endDate >= today && endDate <= sevenDaysFromNow;
  }).length;

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const totalServices = services.length;

  // Get currency symbol for display
  const currencySymbol = selectedCurrency === 'all' ? '' : getCurrencySymbol(selectedCurrency);

  // Format currency
  const formatCurrency = (amount: number, currency?: string) => {
    const symbol = currency ? getCurrencySymbol(currency) : currencySymbol;
    return `${new Intl.NumberFormat('ar-SA').format(amount)} ${symbol}`;
  };

  // Calculate totals per currency for "all" view
  const totalsByCurrency = supportedCurrencies.reduce((acc, curr) => {
    const currSubs = subscriptions.filter(s => s.currency === curr.code);
    const currExp = expenses.filter(e => e.currency === curr.code);
    acc[curr.code] = {
      revenue: currSubs.reduce((sum, s) => sum + s.totalPrice, 0),
      cost: currSubs.reduce((sum, s) => sum + s.totalCost, 0),
      expenses: currExp.reduce((sum, e) => sum + e.amount, 0),
      debt: currSubs.filter(s => s.paymentStatus !== 'paid').reduce((sum, s) => sum + (s.totalPrice - s.paidAmount), 0),
    };
    return acc;
  }, {} as Record<string, { revenue: number; cost: number; expenses: number; debt: number }>);

  return (
    <MainLayout>
      <Header
        title="لوحة التحكم"
        subtitle="مرحباً بك، إليك نظرة عامة على نشاطك"
        action={
          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="btn-ghost flex items-center gap-1 md:gap-2 text-destructive hover:bg-destructive/10 text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2"
            >
              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">تصفير</span>
            </button>
            <button
              onClick={() => setIsCashModalOpen(true)}
              className="btn-secondary flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2"
            >
              <PlusCircle className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">زيادة الصندوق</span>
            </button>
            <button
              onClick={() => setIsExchangeModalOpen(true)}
              className="btn-primary flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4 py-1.5 md:py-2"
            >
              <ArrowRightLeft className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">تحويل عملة</span>
            </button>
          </div>
        }
      />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in">
        {/* Currency Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4">
          <CurrencySelector
            selectedCurrency={selectedCurrency}
            onCurrencyChange={setSelectedCurrency}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
          <StatCard
            title="إجمالي الإيرادات"
            value={selectedCurrency === 'all' ? '-' : formatCurrency(totalRevenue)}
            icon={DollarSign}
            variant="primary"
          />
          <StatCard
            title="صافي الربح"
            value={selectedCurrency === 'all' ? '-' : formatCurrency(netProfit)}
            icon={TrendingUp}
            variant="success"
          />
          <StatCard
            title="الاشتراكات النشطة"
            value={activeSubscriptions.toString()}
            icon={CreditCard}
            variant="default"
          />
          <StatCard
            title="قريبة من الانتهاء"
            value={expiringSoon.toString()}
            icon={AlertTriangle}
            variant="warning"
          />
          <StatCard
            title="إجمالي الخدمات"
            value={totalServices.toString()}
            icon={Package}
            variant="default"
          />
          <StatCard
            title="العملاء"
            value={`${activeCustomers}/${totalCustomers}`}
            icon={Users}
            variant="default"
          />
        </div>

        {/* Currency Balances & Stats - Show when "all" is selected */}
        {selectedCurrency === 'all' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {supportedCurrencies.map((currency) => {
              const stats = totalsByCurrency[currency.code];
              const profit = stats.revenue - stats.cost - stats.expenses;
              const balance = currencyBalances[currency.code] || 0;
              return (
                <div key={currency.code} className="bg-card rounded-xl p-3 md:p-4 border border-border">
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-xs md:text-sm font-bold text-primary">{currency.symbol}</span>
                      </div>
                      <span className="text-sm md:text-base font-medium text-foreground">{currency.name}</span>
                    </div>
                  </div>
                  {/* Current Balance - Highlighted */}
                  <div className="mb-2 md:mb-3 p-2 md:p-3 rounded-lg bg-success/10 border border-success/30">
                    <span className="text-xs md:text-sm text-success">الرصيد الفعلي:</span>
                    <p className="text-base md:text-xl font-bold text-success">
                      {new Intl.NumberFormat('ar-SA').format(balance)} {currency.symbol}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
                    <div>
                      <span className="text-muted-foreground">الإيرادات:</span>
                      <p className="font-bold text-foreground">{new Intl.NumberFormat('ar-SA').format(stats.revenue)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">المصروفات:</span>
                      <p className="font-bold text-destructive">{new Intl.NumberFormat('ar-SA').format(stats.expenses)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">صافي الربح:</span>
                      <p className={`font-bold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {new Intl.NumberFormat('ar-SA').format(profit)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">المديونية:</span>
                      <p className="font-bold text-warning">{new Intl.NumberFormat('ar-SA').format(stats.debt)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Debt & Payment Stats - Show when specific currency selected */}
        {selectedCurrency !== 'all' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <div className="bg-card rounded-xl p-3 md:p-4 border border-border">
              <div className="flex items-center justify-between mb-1 md:mb-2">
                <span className="text-xs md:text-sm text-muted-foreground">إجمالي التكاليف</span>
                <DollarSign className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
              </div>
              <p className="text-base md:text-xl font-bold text-foreground">{formatCurrency(totalCost)}</p>
            </div>
            <div className="bg-card rounded-xl p-3 md:p-4 border border-border">
              <div className="flex items-center justify-between mb-1 md:mb-2">
                <span className="text-xs md:text-sm text-muted-foreground">المصروفات</span>
                <Wallet className="w-3 h-3 md:w-4 md:h-4 text-destructive" />
              </div>
              <p className="text-base md:text-xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="bg-card rounded-xl p-3 md:p-4 border border-border">
              <div className="flex items-center justify-between mb-1 md:mb-2">
                <span className="text-xs md:text-sm text-muted-foreground">هامش الربح</span>
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-success" />
              </div>
              <p className="text-base md:text-xl font-bold text-success">
                {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0'}%
              </p>
            </div>
            <div className={`bg-card rounded-xl p-3 md:p-4 border ${totalDebt > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
              <div className="flex items-center justify-between mb-1 md:mb-2">
                <span className="text-xs md:text-sm text-muted-foreground">إجمالي المديونية</span>
                <AlertCircle className={`w-3 h-3 md:w-4 md:h-4 ${totalDebt > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              </div>
              <p className={`text-base md:text-xl font-bold ${totalDebt > 0 ? 'text-destructive' : 'text-foreground'}`}>
                {formatCurrency(totalDebt)}
              </p>
              {deferredCount > 0 && (
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                  من {deferredCount} اشتراك
                </p>
              )}
            </div>
          </div>
        )}


        {/* Overdue Payments Alert */}
        {overduePayments.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 md:p-4">
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-destructive" />
              <h3 className="font-semibold text-destructive text-sm md:text-base">تنبيه: دفعات متأخرة السداد</h3>
            </div>
            <div className="space-y-2 max-h-[32rem] overflow-y-auto pe-1">
              {overduePayments.map((sub) => {
                const remaining = sub.totalPrice - sub.paidAmount;
                const daysOverdue = sub.dueDate 
                  ? Math.floor((today.getTime() - new Date(sub.dueDate).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;
                return (
                  <div key={sub.id} className="flex items-center justify-between bg-card rounded-lg p-2 md:p-3 border border-border">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                        <span className="text-[10px] md:text-xs font-bold text-destructive">{sub.customerName.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-xs md:text-sm">{sub.customerName}</p>
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                          متأخر {daysOverdue} يوم
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-destructive text-xs md:text-sm">{formatCurrency(remaining, sub.currency)}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        كان موعده: {sub.dueDate?.toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                );
              })}
              {false && overduePayments.length > 5 && (
                <p className="text-xs md:text-sm text-center text-muted-foreground">
                  و {overduePayments.length - 5} دفعات أخرى...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <SubscriptionsPieChart />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <UpcomingRenewals />
          <RecentActivity />
        </div>
      </div>

      {/* Currency Exchange Modal */}
      <CurrencyExchangeModal
        isOpen={isExchangeModalOpen}
        onClose={() => setIsExchangeModalOpen(false)}
        onExchange={handleExchange}
      />

      {/* Add Cash Modal */}
      <AddCashModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
        onAdd={handleAddCash}
      />

      <ResetBalancesModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onReset={handleBalanceReset}
      />
    </MainLayout>
  );
};

export default Dashboard;
