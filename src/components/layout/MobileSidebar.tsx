import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  CreditCard,
  FileText,
  Receipt,
  MessageSquare,
  HeadphonesIcon,
  BarChart3,
  Settings,
  LogOut,
  Zap,
  Package2,
  Wallet,
  Menu,
} from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const menuItems = [
  { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/admin' },
  { icon: ClipboardList, label: 'الطلبات', path: '/requests' },
  { icon: Package2, label: 'الخدمات', path: '/services' },
  { icon: Users, label: 'العملاء', path: '/customers' },
  { icon: CreditCard, label: 'الاشتراكات', path: '/subscriptions' },
  { icon: FileText, label: 'الفواتير', path: '/invoices' },
  { icon: Receipt, label: 'المدفوعات', path: '/payments' },
  { icon: Wallet, label: 'المصروفات', path: '/expenses' },
  { icon: HeadphonesIcon, label: 'تذاكر الدعم', path: '/tickets' },
  { icon: MessageSquare, label: 'الرسائل', path: '/messages' },
  { icon: BarChart3, label: 'التقارير', path: '/reports' },
  { icon: Settings, label: 'الإعدادات', path: '/settings' },
];

export const MobileSidebar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('customer_session');
    localStorage.removeItem('admin_session');
    toast.success('تم تسجيل الخروج بنجاح');
    navigate('/customer');
    setOpen(false);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed top-4 right-4 z-50 bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 p-0 bg-sidebar border-sidebar-border">
        <div className="flex items-center justify-between p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-sidebar-foreground">SubsFlow</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`sidebar-item w-full ${isActive ? 'active' : ''}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-medium text-sidebar-foreground">ج</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">جبران الانسي</p>
              <p className="text-xs text-sidebar-muted">مدير النظام</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-foreground transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
