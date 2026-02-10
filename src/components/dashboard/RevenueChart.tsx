import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Subscription } from '@/types';
import { Expense } from '@/types/expenses';
import { BarChart3 } from 'lucide-react';

const SUBSCRIPTIONS_STORAGE_KEY = 'app_subscriptions';
const EXPENSES_STORAGE_KEY = 'app_expenses';

export const RevenueChart = () => {
  const [chartData, setChartData] = useState<{ month: string; revenue: number; costs: number }[]>([]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const now = new Date();
    const currentMonth = now.getMonth();
    
    let subscriptions: Subscription[] = [];
    let expenses: Expense[] = [];

    // Load subscriptions
    const savedSubscriptions = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
    if (savedSubscriptions) {
      try {
        subscriptions = JSON.parse(savedSubscriptions).map((s: any) => ({
          ...s,
          startDate: new Date(s.startDate),
          endDate: new Date(s.endDate),
        }));
      } catch (e) {
        console.error('Error loading subscriptions:', e);
      }
    }

    // Load expenses
    const savedExpenses = localStorage.getItem(EXPENSES_STORAGE_KEY);
    if (savedExpenses) {
      try {
        expenses = JSON.parse(savedExpenses).map((e: any) => ({
          ...e,
          date: new Date(e.date),
          createdAt: new Date(e.createdAt),
        }));
      } catch (e) {
        console.error('Error loading expenses:', e);
      }
    }

    // Generate monthly data for last 7 months
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthSubs = subscriptions.filter(s => {
        const subMonth = new Date(s.startDate).getMonth();
        return subMonth === monthIndex;
      });
      const monthExp = expenses.filter(e => {
        const expMonth = new Date(e.date).getMonth();
        return expMonth === monthIndex;
      });
      
      const revenue = monthSubs.reduce((sum, s) => sum + s.totalPrice, 0);
      const costs = monthSubs.reduce((sum, s) => sum + s.totalCost, 0) + monthExp.reduce((sum, e) => sum + e.amount, 0);
      
      data.push({
        month: monthNames[monthIndex],
        revenue,
        costs,
      });
    }

    setChartData(data);
    setHasData(data.some(d => d.revenue > 0 || d.costs > 0));
  }, []);

  if (!hasData) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">الإيرادات والتكاليف</h3>
            <p className="text-sm text-muted-foreground">آخر 7 أشهر</p>
          </div>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد بيانات لعرضها</p>
            <p className="text-sm mt-1">أضف اشتراكات لعرض الرسم البياني</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">الإيرادات والتكاليف</h3>
          <p className="text-sm text-muted-foreground">آخر 7 أشهر</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">الإيرادات</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-sm text-muted-foreground">التكاليف</span>
          </div>
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217, 91%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217, 91%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: 'hsl(215, 16%, 47%)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'hsl(215, 16%, 47%)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(214, 32%, 91%)',
                borderRadius: '0.75rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number) => [`${value.toLocaleString()}`, '']}
              labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(217, 91%, 50%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
              name="الإيرادات"
            />
            <Area
              type="monotone"
              dataKey="costs"
              stroke="hsl(38, 92%, 50%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCosts)"
              name="التكاليف"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
