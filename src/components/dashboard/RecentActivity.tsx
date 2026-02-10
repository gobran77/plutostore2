import { useState, useEffect } from 'react';
import { CreditCard, UserPlus, Bell, Receipt, MessageSquare, Package, AlertCircle } from 'lucide-react';
import { Subscription, Customer } from '@/types';

interface Activity {
  id: string;
  icon: any;
  title: string;
  description: string;
  time: string;
  iconBg: string;
  timestamp: Date;
}

const CUSTOMERS_STORAGE_KEY = 'app_customers';
const SUBSCRIPTIONS_STORAGE_KEY = 'app_subscriptions';

export const RecentActivity = () => {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const allActivities: Activity[] = [];
    const now = new Date();

    // Load customers
    const savedCustomers = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (savedCustomers) {
      try {
        const customers: Customer[] = JSON.parse(savedCustomers).map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
        }));
        
        customers.forEach((customer) => {
          allActivities.push({
            id: `customer-${customer.id}`,
            icon: UserPlus,
            title: 'عميل جديد',
            description: `تم إضافة ${customer.name}`,
            time: getRelativeTime(customer.createdAt, now),
            iconBg: 'bg-primary/10 text-primary',
            timestamp: customer.createdAt,
          });
        });
      } catch (e) {
        console.error('Error loading customers:', e);
      }
    }

    // Load subscriptions
    const savedSubscriptions = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
    if (savedSubscriptions) {
      try {
        const subscriptions: Subscription[] = JSON.parse(savedSubscriptions).map((s: any) => ({
          ...s,
          startDate: new Date(s.startDate),
          endDate: new Date(s.endDate),
          dueDate: s.dueDate ? new Date(s.dueDate) : undefined,
        }));
        
        subscriptions.forEach((sub) => {
          // New subscription activity
          allActivities.push({
            id: `sub-${sub.id}`,
            icon: CreditCard,
            title: 'اشتراك جديد',
            description: `${sub.customerName} - ${sub.services.map(s => s.serviceName).join(', ')}`,
            time: getRelativeTime(sub.startDate, now),
            iconBg: 'bg-success/10 text-success',
            timestamp: sub.startDate,
          });

          // Expiring soon notifications
          const daysToExpiry = Math.floor((new Date(sub.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysToExpiry >= 0 && daysToExpiry <= 7 && sub.status === 'active') {
            allActivities.push({
              id: `expiry-${sub.id}`,
              icon: Bell,
              title: 'تنبيه انتهاء',
              description: `اشتراك ${sub.customerName} سينتهي خلال ${daysToExpiry} يوم`,
              time: 'قريباً',
              iconBg: 'bg-warning/10 text-warning',
              timestamp: new Date(now.getTime() - daysToExpiry * 24 * 60 * 60 * 1000),
            });
          }

          // Overdue payment notifications
          if (sub.paymentStatus !== 'paid' && sub.dueDate && new Date(sub.dueDate) < now) {
            allActivities.push({
              id: `overdue-${sub.id}`,
              icon: AlertCircle,
              title: 'دفعة متأخرة',
              description: `${sub.customerName} - ${(sub.totalPrice - sub.paidAmount).toLocaleString()} ${sub.currency}`,
              time: 'يحتاج متابعة',
              iconBg: 'bg-destructive/10 text-destructive',
              timestamp: new Date(sub.dueDate),
            });
          }
        });
      } catch (e) {
        console.error('Error loading subscriptions:', e);
      }
    }

    // Sort by timestamp (most recent first) and take top 10
    const sortedActivities = allActivities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    setActivities(sortedActivities);
  }, []);

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-foreground">النشاط الأخير</h3>
          <p className="text-sm text-muted-foreground">آخر الأحداث والتحديثات</p>
        </div>
      </div>
      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا يوجد نشاط حتى الآن</p>
            <p className="text-sm mt-1">أضف عملاء واشتراكات لتظهر هنا</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className={`p-2.5 rounded-xl ${activity.iconBg}`}>
                <activity.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{activity.title}</p>
                <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {activity.time}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

function getRelativeTime(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 7) return `منذ ${diffDays} يوم`;
  if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسبوع`;
  return date.toLocaleDateString('ar-SA');
}
