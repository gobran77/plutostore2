import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Subscription } from '@/types';
import { PieChartIcon } from 'lucide-react';

const SUBSCRIPTIONS_STORAGE_KEY = 'app_subscriptions';

export const SubscriptionsPieChart = () => {
  const [data, setData] = useState([
    { name: 'نشط', value: 0, color: 'hsl(160, 84%, 39%)' },
    { name: 'قريب من الانتهاء', value: 0, color: 'hsl(38, 92%, 50%)' },
    { name: 'منتهي', value: 0, color: 'hsl(0, 84%, 60%)' },
    { name: 'متوقف', value: 0, color: 'hsl(215, 16%, 47%)' },
  ]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const savedSubscriptions = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
    if (savedSubscriptions) {
      try {
        const subscriptions: Subscription[] = JSON.parse(savedSubscriptions).map((s: any) => ({
          ...s,
          startDate: new Date(s.startDate),
          endDate: new Date(s.endDate),
        }));

        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const active = subscriptions.filter(s => s.status === 'active' && new Date(s.endDate) > sevenDaysFromNow).length;
        const expiringSoon = subscriptions.filter(s => {
          const endDate = new Date(s.endDate);
          return s.status === 'active' && endDate >= now && endDate <= sevenDaysFromNow;
        }).length;
        const expired = subscriptions.filter(s => s.status === 'expired' || new Date(s.endDate) < now).length;
        const paused = subscriptions.filter(s => s.status === 'paused' || s.status === 'canceled').length;

        const newData = [
          { name: 'نشط', value: active, color: 'hsl(160, 84%, 39%)' },
          { name: 'قريب من الانتهاء', value: expiringSoon, color: 'hsl(38, 92%, 50%)' },
          { name: 'منتهي', value: expired, color: 'hsl(0, 84%, 60%)' },
          { name: 'متوقف', value: paused, color: 'hsl(215, 16%, 47%)' },
        ];

        setData(newData);
        setHasData(newData.some(d => d.value > 0));
      } catch (e) {
        console.error('Error loading subscriptions:', e);
      }
    }
  }, []);

  if (!hasData) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">حالة الاشتراكات</h3>
          <p className="text-sm text-muted-foreground">توزيع الاشتراكات حسب الحالة</p>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <PieChartIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد اشتراكات</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">حالة الاشتراكات</h3>
        <p className="text-sm text-muted-foreground">توزيع الاشتراكات حسب الحالة</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.filter(d => d.value > 0)}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
            >
              {data.filter(d => d.value > 0).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(214, 32%, 91%)',
                borderRadius: '0.75rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number) => [`${value} اشتراك`, '']}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
