import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  Download,
  Calendar,
  Wallet,
  BarChart3,
} from 'lucide-react';
import { Subscription } from '@/types';
import { Expense } from '@/types/expenses';
import { supportedCurrencies, getCurrencySymbol } from '@/types/currency';
import { CurrencySelector } from '@/components/dashboard/CurrencySelector';

const SUBSCRIPTIONS_STORAGE_KEY = 'app_subscriptions';
const EXPENSES_STORAGE_KEY = 'app_expenses';

const Reports = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string | 'all'>('SAR');

  // Load data
  useEffect(() => {
    const savedSubscriptions = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
    if (savedSubscriptions) {
      try {
        const parsed = JSON.parse(savedSubscriptions);
        setSubscriptions(parsed.map((s: any) => ({
          ...s,
          startDate: new Date(s.startDate),
          endDate: new Date(s.endDate),
          dueDate: s.dueDate ? new Date(s.dueDate) : undefined,
        })));
      } catch (e) {
        console.error('Error loading subscriptions:', e);
      }
    }

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
  }, []);

  // Filter by currency
  const filteredSubs = selectedCurrency === 'all' 
    ? subscriptions 
    : subscriptions.filter(s => s.currency === selectedCurrency);
  
  const filteredExp = selectedCurrency === 'all'
    ? expenses
    : expenses.filter(e => e.currency === selectedCurrency);

  // Calculate totals
  const totalRevenue = filteredSubs.reduce((sum, s) => sum + s.totalPrice, 0);
  const totalCosts = filteredSubs.reduce((sum, s) => sum + s.totalCost, 0);
  const totalExpenses = filteredExp.reduce((sum, e) => sum + e.amount, 0);
  const totalProfit = totalRevenue - totalCosts - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  // Get overdue payments
  const today = new Date();
  const overduePayments = filteredSubs.filter(s => {
    if (s.paymentStatus === 'paid') return false;
    if (!s.dueDate) return false;
    return new Date(s.dueDate) < today;
  });

  // Generate monthly data from real subscriptions
  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const currentMonth = today.getMonth();
  const monthlyData = [];
  
  for (let i = 5; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    const monthSubs = filteredSubs.filter(s => {
      const subMonth = new Date(s.startDate).getMonth();
      return subMonth === monthIndex;
    });
    const monthExp = filteredExp.filter(e => {
      const expMonth = new Date(e.date).getMonth();
      return expMonth === monthIndex;
    });
    
    const revenue = monthSubs.reduce((sum, s) => sum + s.totalPrice, 0);
    const costs = monthSubs.reduce((sum, s) => sum + s.totalCost, 0) + monthExp.reduce((sum, e) => sum + e.amount, 0);
    
    monthlyData.push({
      month: monthNames[monthIndex],
      revenue,
      costs,
      profit: revenue - costs,
    });
  }

  // Services stats from subscriptions
  const serviceStats: Record<string, { name: string; count: number; revenue: number }> = {};
  filteredSubs.forEach(sub => {
    sub.services.forEach(service => {
      if (!serviceStats[service.serviceName]) {
        serviceStats[service.serviceName] = { name: service.serviceName, count: 0, revenue: 0 };
      }
      serviceStats[service.serviceName].count++;
      serviceStats[service.serviceName].revenue += service.price;
    });
  });
  const topServices = Object.values(serviceStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const currencySymbol = selectedCurrency === 'all' ? '' : getCurrencySymbol(selectedCurrency);

  return (
    <MainLayout>
      <Header
        title="التقارير المحاسبية"
        subtitle="نظرة شاملة على الأداء المالي"
      />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CurrencySelector
            selectedCurrency={selectedCurrency}
            onCurrencyChange={setSelectedCurrency}
          />
          <button className="btn-ghost">
            <Download className="w-4 h-4" />
            تصدير التقرير
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {selectedCurrency === 'all' ? '-' : totalRevenue.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">{currencySymbol}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                <p className="text-3xl font-bold text-destructive mt-1">
                  {selectedCurrency === 'all' ? '-' : (totalCosts + totalExpenses).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">{currencySymbol}</p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10">
                <Wallet className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">صافي الربح</p>
                <p className={`text-3xl font-bold mt-1 ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {selectedCurrency === 'all' ? '-' : totalProfit.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">{currencySymbol}</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">هامش الربح</p>
                <p className="text-3xl font-bold text-foreground mt-1">{profitMargin}%</p>
                <p className="text-sm text-muted-foreground">نسبة</p>
              </div>
              <div className="p-3 rounded-xl bg-accent/10">
                <ArrowUpRight className="w-6 h-6 text-accent" />
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-success rounded-full"
                  style={{ width: `${Math.min(parseFloat(profitMargin), 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        {selectedCurrency !== 'all' && monthlyData.some(m => m.revenue > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue Chart */}
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                الإيرادات والتكاليف الشهرية
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: 'hsl(215, 16%, 47%)' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'hsl(215, 16%, 47%)' }}
                      tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(0, 0%, 100%)',
                        border: '1px solid hsl(214, 32%, 91%)',
                        borderRadius: '0.75rem',
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()} ${currencySymbol}`, '']}
                    />
                    <Bar dataKey="revenue" fill="hsl(217, 91%, 50%)" radius={[4, 4, 0, 0]} name="الإيرادات" />
                    <Bar dataKey="costs" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="التكاليف" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Profit Trend */}
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4">تطور الأرباح</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: 'hsl(215, 16%, 47%)' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'hsl(215, 16%, 47%)' }}
                      tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(0, 0%, 100%)',
                        border: '1px solid hsl(214, 32%, 91%)',
                        borderRadius: '0.75rem',
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()} ${currencySymbol}`, '']}
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="hsl(160, 84%, 39%)"
                      strokeWidth={3}
                      dot={{ fill: 'hsl(160, 84%, 39%)', strokeWidth: 2, r: 4 }}
                      name="الربح"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Empty state for charts */}
        {(selectedCurrency === 'all' || !monthlyData.some(m => m.revenue > 0)) && (
          <div className="bg-card rounded-xl p-12 border border-border text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">لا توجد بيانات كافية</h3>
            <p className="text-muted-foreground">
              {selectedCurrency === 'all' 
                ? 'اختر عملة محددة لعرض الرسوم البيانية'
                : 'أضف اشتراكات ومصروفات لعرض التقارير'
              }
            </p>
          </div>
        )}

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Services */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              أفضل الخدمات مبيعاً
            </h3>
            {topServices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا توجد بيانات</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topServices.map((service, index) => (
                  <div key={service.name} className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-muted-foreground w-8">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.count} اشتراك • {service.revenue.toLocaleString()} {currencySymbol}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Late Payments */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h3 className="text-lg font-semibold text-foreground">
                العملاء المتأخرون
              </h3>
            </div>
            {overduePayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا توجد دفعات متأخرة 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overduePayments.slice(0, 5).map((sub) => {
                  const remaining = sub.totalPrice - sub.paidAmount;
                  const daysOverdue = sub.dueDate 
                    ? Math.floor((today.getTime() - new Date(sub.dueDate).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;
                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10"
                    >
                      <div>
                        <p className="font-medium text-foreground">{sub.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          متأخر {daysOverdue} يوم
                        </p>
                      </div>
                      <span className="font-bold text-destructive">
                        {remaining.toLocaleString()} {getCurrencySymbol(sub.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Reports;
