import { SubscriptionStatus, InvoiceStatus, MessageStatus } from '@/types';

type BadgeStatus = SubscriptionStatus | InvoiceStatus | MessageStatus | 'active' | 'inactive' | 'blocked';

interface StatusBadgeProps {
  status: BadgeStatus;
}

const statusConfig: Record<BadgeStatus, { label: string; className: string }> = {
  active: { label: 'نشط', className: 'status-active' },
  expiring_soon: { label: 'قريب من الانتهاء', className: 'status-expiring' },
  expired: { label: 'منتهي', className: 'status-expired' },
  canceled: { label: 'ملغي', className: 'status-expired' },
  paused: { label: 'متوقف', className: 'status-paused' },
  paid: { label: 'مدفوعة', className: 'status-active' },
  unpaid: { label: 'غير مدفوعة', className: 'status-expired' },
  partially_paid: { label: 'مدفوعة جزئياً', className: 'status-expiring' },
  sent: { label: 'مرسلة', className: 'status-active' },
  failed: { label: 'فشلت', className: 'status-expired' },
  queued: { label: 'في الانتظار', className: 'status-expiring' },
  pending: { label: 'معلقة', className: 'status-paused' },
  inactive: { label: 'غير نشط', className: 'status-paused' },
  blocked: { label: 'محظور', className: 'status-expired' },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status] || { label: status, className: 'status-paused' };

  return (
    <span className={`status-badge ${config.className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
};
