import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  Receipt,
  MessageSquare,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
  Package2,
  Wallet,
  ClipboardList,
  HeadphonesIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useServiceRequests } from '@/hooks/useServiceRequests';
import { useSupportTickets } from '@/hooks/useSupportTickets';

const menuItems = [
  { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/' },
  { icon: ClipboardList, label: 'الطلبات', path: '/requests', badgeKey: 'requests' },
  { icon: Package2, label: 'الخدمات', path: '/services' },
  { icon: Users, label: 'العملاء', path: '/customers' },
  { icon: CreditCard, label: 'الاشتراكات', path: '/subscriptions' },
  { icon: FileText, label: 'الفواتير', path: '/invoices' },
  { icon: Receipt, label: 'المدفوعات', path: '/payments' },
  { icon: Wallet, label: 'المصروفات', path: '/expenses' },
  { icon: HeadphonesIcon, label: 'تذاكر الدعم', path: '/tickets', badgeKey: 'tickets' },
  { icon: MessageSquare, label: 'الرسائل', path: '/messages' },
  { icon: BarChart3, label: 'التقارير', path: '/reports' },
  { icon: Settings, label: 'الإعدادات', path: '/settings' },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { pendingCount: requestsCount } = useServiceRequests();
  const { openCount: ticketsCount } = useSupportTickets();

  const handleLogout = () => {
    // Clear any session data
    localStorage.removeItem('customer_session');
    localStorage.removeItem('admin_session');
    toast.success('تم تسجيل الخروج بنجاح');
    navigate('/customer');
  };

  return (
    <aside
      className={`hidden md:flex fixed right-0 top-0 h-screen bg-sidebar transition-all duration-300 z-50 flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-5 border-b border-sidebar-border">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg text-sidebar-foreground">SubsFlow</span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-foreground transition-colors ${
            collapsed ? 'hidden' : ''
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="p-3 mx-auto mt-2 rounded-lg hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const badgeKey = (item as any).badgeKey;
          const badgeCount = badgeKey === 'requests' ? requestsCount : badgeKey === 'tickets' ? ticketsCount : 0;
          const showBadge = badgeKey && badgeCount > 0;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${isActive ? 'active' : ''} ${
                collapsed ? 'justify-center px-3' : ''
              } relative`}
              title={collapsed ? item.label : undefined}
            >
              <div className="relative">
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {showBadge && collapsed && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
                )}
              </div>
              {!collapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>{item.label}</span>
                  {showBadge && (
                    <span className="bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {badgeCount}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-foreground">ج</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">جبران الانسي</p>
              <p className="text-xs text-sidebar-muted">مدير النظام</p>
            </div>
          )}
          {!collapsed && (
            <button 
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-foreground transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
