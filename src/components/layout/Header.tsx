import { ReactNode } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceRequestsNotification } from '@/components/admin/ServiceRequestsNotification';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showAddButton?: boolean;
  addButtonLabel?: string;
  onAddClick?: () => void;
  action?: ReactNode;
  children?: ReactNode;
}

export const Header = ({ 
  title, 
  subtitle, 
  showAddButton = false, 
  addButtonLabel = 'إضافة',
  onAddClick,
  action,
  children,
}: HeaderProps) => {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 md:px-6 py-3 md:py-4 gap-3 sm:gap-0">
        {/* Title Section */}
        <div className="pr-12 md:pr-0">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          {/* Search */}
          <div className="relative hidden lg:block">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="بحث..."
              className="input-field pr-10 w-64"
            />
          </div>

          {/* Notifications */}
          <ServiceRequestsNotification />

          {/* Add Button */}
          {showAddButton && (
            <Button onClick={onAddClick} className="btn-primary text-sm md:text-base px-3 md:px-5 py-2 md:py-2.5">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{addButtonLabel}</span>
            </Button>
          )}

          {/* Custom Action */}
          {action}
          
          {/* Children */}
          {children}
        </div>
      </div>
    </header>
  );
};
