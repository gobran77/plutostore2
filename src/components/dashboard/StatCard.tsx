import { ReactNode } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20',
  success: 'bg-gradient-to-br from-success/10 to-success/5 border-success/20',
  warning: 'bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20',
  danger: 'bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20',
};

const iconVariantStyles = {
  default: 'bg-secondary text-foreground',
  primary: 'bg-primary text-primary-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  danger: 'bg-destructive text-destructive-foreground',
};

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
}: StatCardProps) => {
  return (
    <div className={`metric-card ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 truncate">{title}</p>
          <p className="text-xl md:text-3xl font-bold text-foreground truncate">{value}</p>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-success" />
              ) : (
                <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-destructive" />
              )}
              <span
                className={`text-xs md:text-sm font-medium ${
                  trend.isPositive ? 'text-success' : 'text-destructive'
                }`}
              >
                {trend.value}%
              </span>
              <span className="text-[10px] md:text-xs text-muted-foreground">من الشهر الماضي</span>
            </div>
          )}
        </div>
        <div className={`p-2 md:p-3 rounded-xl ${iconVariantStyles[variant]} flex-shrink-0`}>
          <Icon className="w-4 h-4 md:w-6 md:h-6" />
        </div>
      </div>
    </div>
  );
};
