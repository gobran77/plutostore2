import { useState, useEffect } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { Subscription } from '@/types';
import { getCurrencySymbol } from '@/types/currency';

const SUBSCRIPTIONS_STORAGE_KEY = 'app_subscriptions';

interface Renewal {
  id: string;
  customerName: string;
  serviceName: string;
  daysLeft: number;
  amount: number;
  currency: string;
  status: 'urgent' | 'warning' | 'normal';
}

export const UpcomingRenewals = () => {
  const [renewals, setRenewals] = useState<Renewal[]>([]);

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
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const upcomingRenewals: Renewal[] = subscriptions
          .filter(s => {
            const endDate = new Date(s.endDate);
            return s.status === 'active' && endDate >= now && endDate <= thirtyDaysFromNow;
          })
          .map(s => {
            const endDate = new Date(s.endDate);
            const daysLeft = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            let status: 'urgent' | 'warning' | 'normal' = 'normal';
            if (daysLeft <= 3) status = 'urgent';
            else if (daysLeft <= 7) status = 'warning';

            return {
              id: s.id,
              customerName: s.customerName,
              serviceName: s.services.map(srv => srv.serviceName).join(', '),
              daysLeft,
              amount: s.totalPrice,
              currency: s.currency,
              status,
            };
          })
          .sort((a, b) => a.daysLeft - b.daysLeft)
          .slice(0, 5);

        setRenewals(upcomingRenewals);
      } catch (e) {
        console.error('Error loading subscriptions:', e);
      }
    }
  }, []);

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-foreground">التجديدات القادمة</h3>
          <p className="text-sm text-muted-foreground">الاشتراكات التي ستنتهي قريباً</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">{renewals.length} تجديدات</span>
        </div>
      </div>
      <div className="space-y-3">
        {renewals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد تجديدات قادمة</p>
            <p className="text-sm mt-1">الاشتراكات القريبة من الانتهاء ستظهر هنا</p>
          </div>
        ) : (
          renewals.map((renewal) => (
            <div
              key={renewal.id}
              className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    renewal.status === 'urgent'
                      ? 'bg-destructive/10 text-destructive'
                      : renewal.status === 'warning'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-success/10 text-success'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{renewal.customerName}</p>
                  <p className="text-sm text-muted-foreground">{renewal.serviceName}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">
                  {renewal.amount.toLocaleString()} {getCurrencySymbol(renewal.currency)}
                </p>
                <p
                  className={`text-sm ${
                    renewal.status === 'urgent'
                      ? 'text-destructive'
                      : renewal.status === 'warning'
                      ? 'text-warning'
                      : 'text-muted-foreground'
                  }`}
                >
                  {renewal.daysLeft === 0 ? 'اليوم' : renewal.daysLeft === 1 ? 'غداً' : `${renewal.daysLeft} أيام متبقية`}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
