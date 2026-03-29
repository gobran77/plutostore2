import { useEffect, useState } from 'react';
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
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
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
import { getCurrencySymbol } from '@/types/currency';
import { CurrencySelector } from '@/components/dashboard/CurrencySelector';

const SUBSCRIPTIONS_STORAGE_KEY = 'app_subscriptions';
const EXPENSES_STORAGE_KEY = 'app_expenses';

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';

const reportPeriodOptions: Array<{ value: ReportPeriod; label: string }> = [
  { value: 'daily', label: 'يومي' },
  { value: 'weekly', label: 'أسبوعي' },
  { value: 'monthly', label: 'شهري' },
  { value: 'yearly', label: 'سنوي' },
  { value: 'all_time', label: 'من البداية' },
];

const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const isSameDay = (left: Date, right: Date) => left.toDateString() === right.toDateString();

const startOfWeek = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
};

const isDateWithinPeriod = (date: Date, period: ReportPeriod, now: Date) => {
  const target = new Date(date);

  switch (period) {
    case 'daily':
      return isSameDay(target, now);
    case 'weekly': {
      const weekStart = startOfWeek(now);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return target >= weekStart && target < weekEnd;
    }
    case 'monthly':
      return target.getFullYear() === now.getFullYear() && target.getMonth() === now.getMonth();
    case 'yearly':
      return target.getFullYear() === now.getFullYear();
    case 'all_time':
    default:
      return true;
  }
};

const Reports = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string | 'all'>('SAR');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('monthly');

  useEffect(() => {
    const savedSubscriptions = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
    if (savedSubscriptions) {
      try {
        const parsed = JSON.parse(savedSubscriptions);
        setSubscriptions(
          parsed.map((s: any) => ({
            ...s,
            startDate: new Date(s.startDate),
            endDate: new Date(s.endDate),
            dueDate: s.dueDate ? new Date(s.dueDate) : undefined,
          }))
        );
      } catch (e) {
        console.error('Error loading subscriptions:', e);
      }
    }

    const savedExpenses = localStorage.getItem(EXPENSES_STORAGE_KEY);
    if (savedExpenses) {
      try {
        const parsed = JSON.parse(savedExpenses);
        setExpenses(
          parsed.map((e: any) => ({
            ...e,
            date: new Date(e.date),
            createdAt: new Date(e.createdAt),
          }))
        );
      } catch (e) {
        console.error('Error loading expenses:', e);
      }
    }
  }, []);

  const today = new Date();

  const currencyFilteredSubs =
    selectedCurrency === 'all'
      ? subscriptions
      : subscriptions.filter((s) => s.currency === selectedCurrency);

  const currencyFilteredExp =
    selectedCurrency === 'all'
      ? expenses
      : expenses.filter((e) => e.currency === selectedCurrency);

  const filteredSubs = currencyFilteredSubs.filter((s) =>
    isDateWithinPeriod(new Date(s.startDate), reportPeriod, today)
  );

  const filteredExp = currencyFilteredExp.filter((e) =>
    isDateWithinPeriod(new Date(e.date), reportPeriod, today)
  );

  const totalRevenue = filteredSubs.reduce((sum, s) => sum + s.totalPrice, 0);
  const totalCosts = filteredSubs.reduce((sum, s) => sum + s.totalCost, 0);
  const totalExpenses = filteredExp.reduce((sum, e) => sum + e.amount, 0);
  const totalProfit = totalRevenue - totalCosts - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  const overduePayments = currencyFilteredSubs.filter((s) => {
    if (s.paymentStatus === 'paid') return false;
    if (!s.dueDate) return false;
    return new Date(s.dueDate) < today;
  });

  const chartData = (() => {
    if (reportPeriod === 'daily') {
      return Array.from({ length: 7 }, (_, index) => {
        const pointDate = new Date(today);
        pointDate.setDate(today.getDate() - (6 - index));
        pointDate.setHours(0, 0, 0, 0);

        const revenue = currencyFilteredSubs
          .filter((s) => isSameDay(new Date(s.startDate), pointDate))
          .reduce((sum, s) => sum + s.totalPrice, 0);
        const costs =
          currencyFilteredSubs
            .filter((s) => isSameDay(new Date(s.startDate), pointDate))
            .reduce((sum, s) => sum + s.totalCost, 0) +
          currencyFilteredExp
            .filter((e) => isSameDay(new Date(e.date), pointDate))
            .reduce((sum, e) => sum + e.amount, 0);

        return {
          label: pointDate.toLocaleDateString('ar-SA', { weekday: 'short' }),
          revenue,
          costs,
          profit: revenue - costs,
        };
      });
    }

    if (reportPeriod === 'weekly') {
      return Array.from({ length: 8 }, (_, index) => {
        const weekStart = startOfWeek(today);
        weekStart.setDate(weekStart.getDate() - (7 * (7 - index)));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const revenue = currencyFilteredSubs
          .filter((s) => {
            const date = new Date(s.startDate);
            return date >= weekStart && date < weekEnd;
          })
          .reduce((sum, s) => sum + s.totalPrice, 0);
        const costs =
          currencyFilteredSubs
            .filter((s) => {
              const date = new Date(s.startDate);
              return date >= weekStart && date < weekEnd;
            })
            .reduce((sum, s) => sum + s.totalCost, 0) +
          currencyFilteredExp
            .filter((e) => {
              const date = new Date(e.date);
              return date >= weekStart && date < weekEnd;
            })
            .reduce((sum, e) => sum + e.amount, 0);

        return {
          label: `أسبوع ${index + 1}`,
          revenue,
          costs,
          profit: revenue - costs,
        };
      });
    }

    if (reportPeriod === 'yearly' || reportPeriod === 'all_time') {
      const allYears = [
        ...currencyFilteredSubs.map((s) => new Date(s.startDate).getFullYear()),
        ...currencyFilteredExp.map((e) => new Date(e.date).getFullYear()),
        today.getFullYear(),
      ];
      const minYear = Math.min(...allYears);
      const maxYear = today.getFullYear();
      const years =
        reportPeriod === 'yearly'
          ? Array.from({ length: 6 }, (_, index) => maxYear - (5 - index))
          : Array.from(
              { length: Math.max(1, Math.min(6, maxYear - minYear + 1)) },
              (_, index, arr) => maxYear - (arr.length - 1 - index)
            );

      return years.map((year) => {
        const revenue = currencyFilteredSubs
          .filter((s) => new Date(s.startDate).getFullYear() === year)
          .reduce((sum, s) => sum + s.totalPrice, 0);
        const costs =
          currencyFilteredSubs
            .filter((s) => new Date(s.startDate).getFullYear() === year)
            .reduce((sum, s) => sum + s.totalCost, 0) +
          currencyFilteredExp
            .filter((e) => new Date(e.date).getFullYear() === year)
            .reduce((sum, e) => sum + e.amount, 0);

        return {
          label: year.toString(),
          revenue,
          costs,
          profit: revenue - costs,
        };
      });
    }

    return Array.from({ length: 6 }, (_, index) => {
      const pointDate = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
      const month = pointDate.getMonth();
      const year = pointDate.getFullYear();

      const revenue = currencyFilteredSubs
        .filter((s) => {
          const date = new Date(s.startDate);
          return date.getMonth() === month && date.getFullYear() === year;
        })
        .reduce((sum, s) => sum + s.totalPrice, 0);
      const costs =
        currencyFilteredSubs
          .filter((s) => {
            const date = new Date(s.startDate);
            return date.getMonth() === month && date.getFullYear() === year;
          })
          .reduce((sum, s) => sum + s.totalCost, 0) +
        currencyFilteredExp
          .filter((e) => {
            const date = new Date(e.date);
            return date.getMonth() === month && date.getFullYear() === year;
          })
          .reduce((sum, e) => sum + e.amount, 0);

      return {
        label: monthNames[month],
        revenue,
        costs,
        profit: revenue - costs,
      };
    });
  })();

  const serviceStats: Record<string, { name: string; count: number; revenue: number }> = {};
  filteredSubs.forEach((sub) => {
    sub.services.forEach((service) => {
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
  const hasChartData = chartData.some((item) => item.revenue > 0 || item.costs > 0);

  return (
    <MainLayout>
      <Header
        title="التقارير المحاسبية"
        subtitle="نظرة شاملة على الأداء المالي"
      />

      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <CurrencySelector
              selectedCurrency={selectedCurrency}
              onCurrencyChange={setSelectedCurrency}
            />
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-1">
              <Calendar className="mx-2 h-4 w-4 text-muted-foreground" />
              {reportPeriodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setReportPeriod(option.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    reportPeriod === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-ghost">
            <Download className="w-4 h-4" />
            تصدير التقرير
          </button>
        </div>

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

        {selectedCurrency !== 'all' && hasChartData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                الإيرادات والتكاليف
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(215, 16%, 47%)' }} />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'hsl(215, 16%, 47%)' }}
                      tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
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

            <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4">تطور الأرباح</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(215, 16%, 47%)' }} />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'hsl(215, 16%, 47%)' }}
                      tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
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

        {(selectedCurrency === 'all' || !hasChartData) && (
          <div className="bg-card rounded-xl p-12 border border-border text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">لا توجد بيانات كافية</h3>
            <p className="text-muted-foreground">
              {selectedCurrency === 'all'
                ? 'اختر عملة محددة لعرض الرسوم البيانية'
                : 'أضف اشتراكات ومصروفات ضمن الفترة المحددة لعرض التقارير'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">أفضل الخدمات مبيعًا</h3>
            {topServices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا توجد بيانات</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topServices.map((service, index) => (
                  <div key={service.name} className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-muted-foreground w-8">{index + 1}</span>
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

          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h3 className="text-lg font-semibold text-foreground">العملاء المتأخرون</h3>
            </div>
            {overduePayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا توجد دفعات متأخرة</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[28rem] overflow-y-auto pe-1">
                {overduePayments.map((sub) => {
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
                        <p className="text-sm text-muted-foreground">متأخر {daysOverdue} يوم</p>
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
