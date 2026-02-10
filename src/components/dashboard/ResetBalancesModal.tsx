import { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CalendarIcon, AlertTriangle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supportedCurrencies, saveCurrencyBalances } from '@/types/currency';

interface ResetBalancesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
}

type ResetType = 'all' | 'before_date';

export const ResetBalancesModal = ({ isOpen, onClose, onReset }: ResetBalancesModalProps) => {
  const [resetType, setResetType] = useState<ResetType>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isConfirming, setIsConfirming] = useState(false);

  const handleReset = () => {
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    if (resetType === 'all') {
      // Reset all balances to zero
      const zeroed: Record<string, number> = {};
      supportedCurrencies.forEach(c => zeroed[c.code] = 0);
      saveCurrencyBalances(zeroed);
      
      // Clear all related data
      localStorage.removeItem('app_payments');
      localStorage.removeItem('app_invoices');
      localStorage.removeItem('app_subscriptions');
      localStorage.removeItem('app_cash_additions');
      localStorage.removeItem('app_expenses');
      localStorage.removeItem('app_currency_exchanges');
    } else if (resetType === 'before_date' && selectedDate) {
      // Filter and keep only data after the selected date
      const cutoffDate = selectedDate.getTime();

      // Filter payments
      const paymentsData = localStorage.getItem('app_payments');
      if (paymentsData) {
        const payments = JSON.parse(paymentsData);
        const filtered = payments.filter((p: any) => new Date(p.paidAt).getTime() >= cutoffDate);
        if (filtered.length === 0) {
          localStorage.removeItem('app_payments');
        } else {
          localStorage.setItem('app_payments', JSON.stringify(filtered));
        }
      }

      // Filter invoices
      const invoicesData = localStorage.getItem('app_invoices');
      if (invoicesData) {
        const invoices = JSON.parse(invoicesData);
        const filtered = invoices.filter((i: any) => new Date(i.issuedAt).getTime() >= cutoffDate);
        if (filtered.length === 0) {
          localStorage.removeItem('app_invoices');
        } else {
          localStorage.setItem('app_invoices', JSON.stringify(filtered));
        }
      }

      // Filter subscriptions
      const subscriptionsData = localStorage.getItem('app_subscriptions');
      if (subscriptionsData) {
        const subscriptions = JSON.parse(subscriptionsData);
        const filtered = subscriptions.filter((s: any) => new Date(s.startDate).getTime() >= cutoffDate);
        if (filtered.length === 0) {
          localStorage.removeItem('app_subscriptions');
        } else {
          localStorage.setItem('app_subscriptions', JSON.stringify(filtered));
        }
      }

      // Filter cash additions
      const cashData = localStorage.getItem('app_cash_additions');
      if (cashData) {
        const additions = JSON.parse(cashData);
        const filtered = additions.filter((a: any) => new Date(a.createdAt).getTime() >= cutoffDate);
        if (filtered.length === 0) {
          localStorage.removeItem('app_cash_additions');
        } else {
          localStorage.setItem('app_cash_additions', JSON.stringify(filtered));
        }
      }

      // Filter expenses
      const expensesData = localStorage.getItem('app_expenses');
      if (expensesData) {
        const expenses = JSON.parse(expensesData);
        const filtered = expenses.filter((e: any) => new Date(e.date).getTime() >= cutoffDate);
        if (filtered.length === 0) {
          localStorage.removeItem('app_expenses');
        } else {
          localStorage.setItem('app_expenses', JSON.stringify(filtered));
        }
      }

      // Filter exchanges
      const exchangesData = localStorage.getItem('app_currency_exchanges');
      if (exchangesData) {
        const exchanges = JSON.parse(exchangesData);
        const filtered = exchanges.filter((e: any) => new Date(e.date).getTime() >= cutoffDate);
        if (filtered.length === 0) {
          localStorage.removeItem('app_currency_exchanges');
        } else {
          localStorage.setItem('app_currency_exchanges', JSON.stringify(filtered));
        }
      }
    }

    onReset();
    handleClose();
  };

  const handleClose = () => {
    setIsConfirming(false);
    setResetType('all');
    setSelectedDate(new Date());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            تصفير الأرصدة
          </DialogTitle>
          <DialogDescription>
            هذا الإجراء سيحذف البيانات المحددة ولا يمكن التراجع عنه
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reset Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">نوع التصفير</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setResetType('all')}
                className={cn(
                  "p-3 rounded-lg border text-sm font-medium transition-colors",
                  resetType === 'all'
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border hover:bg-muted"
                )}
              >
                <Trash2 className="w-4 h-4 mx-auto mb-1" />
                حذف الكل
              </button>
              <button
                type="button"
                onClick={() => setResetType('before_date')}
                className={cn(
                  "p-3 rounded-lg border text-sm font-medium transition-colors",
                  resetType === 'before_date'
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border hover:bg-muted"
                )}
              >
                <CalendarIcon className="w-4 h-4 mx-auto mb-1" />
                قبل تاريخ معين
              </button>
            </div>
          </div>

          {/* Date Picker - Show only when before_date is selected */}
          {resetType === 'before_date' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">حذف البيانات قبل تاريخ</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-right font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: ar }) : "اختر تاريخ"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                سيتم حذف جميع البيانات (اشتراكات، مدفوعات، فواتير، مصروفات) التي تمت قبل هذا التاريخ
              </p>
            </div>
          )}

          {/* Confirmation Warning */}
          {isConfirming && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-sm text-destructive font-medium">
                ⚠️ هل أنت متأكد؟ اضغط مرة أخرى للتأكيد
              </p>
              <p className="text-xs text-destructive/80 mt-1">
                {resetType === 'all' 
                  ? 'سيتم حذف جميع البيانات المالية نهائياً'
                  : `سيتم حذف البيانات قبل ${selectedDate ? format(selectedDate, "PPP", { locale: ar }) : ''}`
                }
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            إلغاء
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleReset}
            disabled={resetType === 'before_date' && !selectedDate}
          >
            {isConfirming ? 'تأكيد الحذف' : 'تصفير'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
