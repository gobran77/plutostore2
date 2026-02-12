import { useState } from 'react';
import { Settings, Wallet, Trash2, Edit, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { getCurrencySymbol } from '@/types/currency';
import { CUSTOMER_ACCOUNTS_KEY, LocalCustomerAccount } from '@/hooks/useCustomerPassword';
import { updateCustomerAccountRecord } from '@/lib/customerAccountsStorage';
import { addCustomerActivity } from '@/lib/customerActivityLog';

interface Subscription {
  id: string;
  service_name: string;
  price: number;
  currency: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface CustomerBalances {
  balance_sar: number;
  balance_yer: number;
  balance_usd: number;
}

interface AdminCustomerControlsProps {
  customerId: string;
  customerName: string;
  balances: CustomerBalances;
  subscriptions: Subscription[];
  onUpdate: () => void;
}

type ModalType = 'balance' | 'editSubscription' | 'resetStats' | null;

export function AdminCustomerControls({
  customerId,
  customerName,
  balances,
  subscriptions,
  onUpdate,
}: AdminCustomerControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Balance adjustment state
  const [selectedCurrency, setSelectedCurrency] = useState<'SAR' | 'YER' | 'USD'>('SAR');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set'>('add');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');

  // Edit subscription state
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [editServiceName, setEditServiceName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  const getCurrentBalance = (currency: 'SAR' | 'YER' | 'USD') => {
    switch (currency) {
      case 'SAR': return balances.balance_sar;
      case 'YER': return balances.balance_yer;
      case 'USD': return balances.balance_usd;
    }
  };

  const getBalanceField = (currency: 'SAR' | 'YER' | 'USD') => {
    switch (currency) {
      case 'SAR': return 'balance_sar';
      case 'YER': return 'balance_yer';
      case 'USD': return 'balance_usd';
    }
  };

  const loadAccounts = (): LocalCustomerAccount[] => {
    try {
      const raw = localStorage.getItem(CUSTOMER_ACCOUNTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveAccounts = (accounts: LocalCustomerAccount[]) => {
    localStorage.setItem(CUSTOMER_ACCOUNTS_KEY, JSON.stringify(accounts));
  };

  const adjustAccountBalance = (currency: 'SAR' | 'YER' | 'USD', newBalance: number) => {
    const accounts = loadAccounts();
    const idx = accounts.findIndex((a) => a.id === customerId);
    if (idx === -1) return false;
    const field = getBalanceField(currency);
    (accounts[idx] as any)[field] = newBalance;
    saveAccounts(accounts);
    return true;
  };

  const updateLocalSubscription = (subId: string, patch: { service_name?: string; price?: number; end_date?: string }) => {
    try {
      const raw = localStorage.getItem('app_subscriptions');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return false;
      const updated = parsed.map((s: any) => {
        if (String(s?.id || '') !== subId) return s;
        const next: any = { ...s };
        if (patch.service_name) {
          // Update service name for display only; keep services array if present.
          if (Array.isArray(next.services) && next.services.length > 0) {
            next.services = next.services.map((x: any) => ({ ...x, serviceName: patch.service_name }));
          }
          next.service_name = patch.service_name;
        }
        if (typeof patch.price === 'number') {
          next.totalPrice = patch.price;
          if (Array.isArray(next.services) && next.services.length > 0) {
            next.services = next.services.map((x: any) => ({ ...x, price: patch.price }));
          }
        }
        if (patch.end_date) {
          next.endDate = patch.end_date;
          next.end_date = patch.end_date;
        }
        return next;
      });
      localStorage.setItem('app_subscriptions', JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  };

  const deleteLocalSubscription = (subId: string) => {
    try {
      const raw = localStorage.getItem('app_subscriptions');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const updated = parsed.filter((s: any) => String(s?.id || '') !== subId);
      localStorage.setItem('app_subscriptions', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleAdjustBalance = async () => {
    if (!adjustmentAmount || isNaN(Number(adjustmentAmount))) {
      toast.error('أدخل مبلغ صحيح');
      return;
    }

    setIsLoading(true);
    try {
      const currentBalance = getCurrentBalance(selectedCurrency);
      let newBalance = currentBalance;
      const amount = Number(adjustmentAmount);

      if (adjustmentType === 'add') {
        newBalance = currentBalance + amount;
      } else if (adjustmentType === 'subtract') {
        newBalance = currentBalance - amount;
      } else {
        newBalance = amount;
      }

      const ok = adjustAccountBalance(selectedCurrency, newBalance);
      if (!ok) throw new Error('account_not_found');
      addCustomerActivity({
        customerId,
        type: adjustmentType === 'add' ? 'balance_add' : adjustmentType === 'subtract' ? 'balance_subtract' : 'balance_set',
        title:
          adjustmentType === 'add'
            ? 'تمت إضافة رصيد'
            : adjustmentType === 'subtract'
            ? 'تم خصم رصيد'
            : 'تم تعيين الرصيد',
        description: `الرصيد الجديد: ${newBalance.toLocaleString()} ${selectedCurrency}`,
        amount,
        currency: selectedCurrency,
      });

      toast.success(`تم تعديل رصيد ${getCurrencySymbol(selectedCurrency)} بنجاح`);
      setActiveModal(null);
      setAdjustmentAmount('');
      onUpdate();
    } catch (err) {
      console.error('Error adjusting balance:', err);
      toast.error('حدث خطأ في تعديل الرصيد');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاشتراك؟')) return;

    setIsLoading(true);
    try {
      deleteLocalSubscription(subscriptionId);

      toast.success('تم حذف الاشتراك بنجاح');
      onUpdate();
    } catch (err) {
      console.error('Error deleting subscription:', err);
      toast.error('حدث خطأ في حذف الاشتراك');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditSubscription = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setEditServiceName(sub.service_name);
    setEditPrice(String(sub.price));
    setEditEndDate(sub.end_date.split('T')[0]);
    setActiveModal('editSubscription');
  };

  const handleEditSubscription = async () => {
    if (!selectedSubscription) return;

    setIsLoading(true);
    try {
      const ok = updateLocalSubscription(selectedSubscription.id, {
        service_name: editServiceName,
        price: Number(editPrice),
        end_date: new Date(editEndDate).toISOString(),
      });
      if (!ok) throw new Error('subscription_not_found');

      toast.success('تم تعديل الاشتراك بنجاح');
      setActiveModal(null);
      setSelectedSubscription(null);
      onUpdate();
    } catch (err) {
      console.error('Error editing subscription:', err);
      toast.error('حدث خطأ في تعديل الاشتراك');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetStats = async () => {
    setIsLoading(true);
    try {
      await updateCustomerAccountRecord(customerId, {
        balance_sar: 0,
        balance_yer: 0,
        balance_usd: 0,
        balance: 0,
      } as any);

      adjustAccountBalance('SAR', 0);
      adjustAccountBalance('YER', 0);
      adjustAccountBalance('USD', 0);

      // Delete all subscriptions for this customer
      try {
        const raw = localStorage.getItem('app_subscriptions');
        const parsed = raw ? JSON.parse(raw) : [];
        let deletedSubscriptionIds: string[] = [];
        if (Array.isArray(parsed)) {
          deletedSubscriptionIds = parsed
            .filter((s: any) => String(s?.customerId || '') === customerId)
            .map((s: any) => String(s?.id || ''))
            .filter((id: string) => id.length > 0);

          const updated = parsed.filter((s: any) => String(s?.customerId || '') !== customerId);
          localStorage.setItem('app_subscriptions', JSON.stringify(updated));
        }

        // Delete related invoices for this customer/subscriptions
        const rawInvoices = localStorage.getItem('app_invoices');
        const parsedInvoices = rawInvoices ? JSON.parse(rawInvoices) : [];
        if (Array.isArray(parsedInvoices)) {
          const updatedInvoices = parsedInvoices.filter((inv: any) => {
            const byCustomer = String(inv?.customerId || '') === customerId;
            const bySubscription = deletedSubscriptionIds.includes(String(inv?.subscriptionId || ''));
            return !byCustomer && !bySubscription;
          });
          localStorage.setItem('app_invoices', JSON.stringify(updatedInvoices));
        }

        // Delete related payments for this customer/subscriptions
        const rawPayments = localStorage.getItem('app_payments');
        const parsedPayments = rawPayments ? JSON.parse(rawPayments) : [];
        if (Array.isArray(parsedPayments)) {
          const updatedPayments = parsedPayments.filter((pay: any) => {
            const byCustomerName = String(pay?.customerName || '') === customerName;
            const bySubscription = deletedSubscriptionIds.includes(String(pay?.invoiceId || ''));
            return !byCustomerName && !bySubscription;
          });
          localStorage.setItem('app_payments', JSON.stringify(updatedPayments));
        }
      } catch {
        // ignore
      }
      addCustomerActivity({
        customerId,
        type: 'reset',
        title: 'تم تصفير بيانات الحساب',
        description: 'تمت إزالة الاشتراكات والفواتير والمدفوعات وتصفير الأرصدة',
      });

      toast.success('تم تصفير جميع البيانات بنجاح');
      setActiveModal(null);
      onUpdate();
    } catch (err) {
      console.error('Error resetting stats:', err);
      toast.error('حدث خطأ في تصفير البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  const currentBalance = getCurrentBalance(selectedCurrency);

  return (
    <>
      {/* Admin Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 left-4 z-50 w-12 h-12 rounded-full bg-destructive text-white shadow-lg flex items-center justify-center hover:bg-destructive/90 transition-colors"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Admin Panel */}
      {isOpen && (
        <div className="fixed bottom-40 left-4 z-50 bg-card border border-border rounded-xl shadow-xl p-4 w-80 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Settings className="w-4 h-4" />
              أدوات الأدمن
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Balances Display */}
          <div className="mb-3 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs text-muted-foreground mb-2">الأرصدة الحالية:</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className={`text-center p-2 rounded ${balances.balance_sar < 0 ? 'bg-destructive/20' : 'bg-success/10'}`}>
                <p className="font-bold">{balances.balance_sar.toLocaleString()}</p>
                <p className="text-muted-foreground">SAR</p>
              </div>
              <div className={`text-center p-2 rounded ${balances.balance_yer < 0 ? 'bg-destructive/20' : 'bg-success/10'}`}>
                <p className="font-bold">{balances.balance_yer.toLocaleString()}</p>
                <p className="text-muted-foreground">YER</p>
              </div>
              <div className={`text-center p-2 rounded ${balances.balance_usd < 0 ? 'bg-destructive/20' : 'bg-success/10'}`}>
                <p className="font-bold">{balances.balance_usd.toLocaleString()}</p>
                <p className="text-muted-foreground">USD</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {/* Adjust Balance */}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setActiveModal('balance')}
            >
              <Wallet className="w-4 h-4 ml-2" />
              تعديل الرصيد
            </Button>

            {/* Subscriptions List */}
            {subscriptions.length > 0 && (
              <div className="border rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                <p className="text-xs text-muted-foreground mb-2">الاشتراكات:</p>
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between bg-muted/50 rounded p-2 text-xs">
                    <span className="truncate flex-1">{sub.service_name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditSubscription(sub)}
                        className="p-1 hover:bg-primary/10 rounded text-primary"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteSubscription(sub.id)}
                        className="p-1 hover:bg-destructive/10 rounded text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reset All */}
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => setActiveModal('resetStats')}
            >
              <RotateCcw className="w-4 h-4 ml-2" />
              تصفير جميع البيانات
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground mt-3 text-center">
            أنت تتحكم في حساب: {customerName}
          </p>
        </div>
      )}

      {/* Balance Adjustment Modal */}
      <Dialog open={activeModal === 'balance'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              تعديل رصيد العميل
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Currency Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">اختر العملة</label>
              <Select value={selectedCurrency} onValueChange={(v: 'SAR' | 'YER' | 'USD') => setSelectedCurrency(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                  <SelectItem value="YER">ريال يمني (YER)</SelectItem>
                  <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">الرصيد الحالي - {getCurrencySymbol(selectedCurrency)}</p>
              <p className={`text-2xl font-bold ${currentBalance < 0 ? 'text-destructive' : 'text-foreground'}`}>
                {currentBalance.toLocaleString()} {getCurrencySymbol(selectedCurrency)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">نوع العملية</label>
              <Select value={adjustmentType} onValueChange={(v: 'add' | 'subtract' | 'set') => setAdjustmentType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">إضافة للرصيد</SelectItem>
                  <SelectItem value="subtract">خصم من الرصيد</SelectItem>
                  <SelectItem value="set">تعيين رصيد جديد</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">المبلغ</label>
              <Input
                type="number"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
                placeholder="0"
                dir="ltr"
              />
            </div>

            {adjustmentAmount && (
              <div className="text-center p-3 bg-primary/5 rounded-lg">
                <p className="text-sm text-muted-foreground">الرصيد الجديد</p>
                <p className="text-xl font-bold text-primary">
                  {adjustmentType === 'add'
                    ? (currentBalance + Number(adjustmentAmount)).toLocaleString()
                    : adjustmentType === 'subtract'
                    ? (currentBalance - Number(adjustmentAmount)).toLocaleString()
                    : Number(adjustmentAmount).toLocaleString()
                  } {getCurrencySymbol(selectedCurrency)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              إلغاء
            </Button>
            <Button onClick={handleAdjustBalance} disabled={isLoading}>
              {isLoading ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Modal */}
      <Dialog open={activeModal === 'editSubscription'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              تعديل الاشتراك
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">اسم الخدمة</label>
              <Input
                value={editServiceName}
                onChange={(e) => setEditServiceName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">السعر</label>
              <Input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">تاريخ الانتهاء</label>
              <Input
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                dir="ltr"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              إلغاء
            </Button>
            <Button onClick={handleEditSubscription} disabled={isLoading}>
              {isLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Stats Confirmation Modal */}
      <Dialog open={activeModal === 'resetStats'} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <RotateCcw className="w-5 h-5" />
              تصفير بيانات العميل
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
              <p className="text-destructive font-medium">
                ⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه!
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                سيتم حذف جميع اشتراكات العميل وتصفير جميع أرصدته
              </p>
            </div>

            <div className="mt-4 p-3 bg-muted rounded-lg space-y-1">
              <p className="text-sm">
                <strong>العميل:</strong> {customerName}
              </p>
              <p className="text-sm">
                <strong>الأرصدة:</strong>
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs mt-1">
                <span>{balances.balance_sar} SAR</span>
                <span>{balances.balance_yer} YER</span>
                <span>{balances.balance_usd} USD</span>
              </div>
              <p className="text-sm mt-2">
                <strong>عدد الاشتراكات:</strong> {subscriptions.length}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleResetStats} disabled={isLoading}>
              {isLoading ? 'جاري التصفير...' : 'تأكيد التصفير'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
