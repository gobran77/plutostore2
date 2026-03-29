import { useState } from 'react';
import { X, Plus, Minus, Wallet, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { getCurrencySymbol } from '@/types/currency';
import { updateCustomerAccountRecord } from '@/lib/customerAccountsStorage';

interface CustomerBalances {
  balance_sar: number;
  balance_yer: number;
  balance_usd: number;
}

interface AdjustBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    name: string;
    balance: number;
    currency: string;
    balances?: CustomerBalances;
  } | null;
  onSuccess: () => void;
}

export const AdjustBalanceModal = ({ 
  isOpen, 
  onClose, 
  customer, 
  onSuccess 
}: AdjustBalanceModalProps) => {
  const [selectedCurrency, setSelectedCurrency] = useState<'SAR' | 'YER' | 'USD'>('SAR');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !customer) return null;

  const getCurrentBalance = () => {
    if (!customer.balances) return customer.balance || 0;
    switch (selectedCurrency) {
      case 'SAR': return customer.balances.balance_sar || 0;
      case 'YER': return customer.balances.balance_yer || 0;
      case 'USD': return customer.balances.balance_usd || 0;
    }
  };

  const getBalanceField = () => {
    switch (selectedCurrency) {
      case 'SAR': return 'balance_sar';
      case 'YER': return 'balance_yer';
      case 'USD': return 'balance_usd';
    }
  };

  const currentBalance = getCurrentBalance();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const adjustAmount = parseFloat(amount);
    if (isNaN(adjustAmount) || adjustAmount <= 0) {
      toast.error('الرجاء إدخال مبلغ صحيح');
      return;
    }

    setIsLoading(true);
    try {
      const newBalance = adjustmentType === 'add' 
        ? currentBalance + adjustAmount
        : currentBalance - adjustAmount;

      const balanceField = getBalanceField();
      const updated = await updateCustomerAccountRecord(String(customer.id), { [balanceField]: newBalance } as any);
      if (!updated) throw new Error('account_not_found');

      toast.success(
        adjustmentType === 'add' 
          ? `تم إضافة ${adjustAmount} ${getCurrencySymbol(selectedCurrency)} لرصيد ${customer.name}`
          : `تم خصم ${adjustAmount} ${getCurrencySymbol(selectedCurrency)} من رصيد ${customer.name}`
      );
      
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Error adjusting balance:', err);
      toast.error('حدث خطأ في تعديل الرصيد');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setNote('');
    setAdjustmentType('add');
    setSelectedCurrency('SAR');
    onClose();
  };

  const newBalance = amount 
    ? adjustmentType === 'add' 
      ? currentBalance + parseFloat(amount || '0')
      : currentBalance - parseFloat(amount || '0')
    : currentBalance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            تعديل رصيد العميل
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Info */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground mb-1">العميل</p>
            <p className="font-semibold text-lg">{customer.name}</p>
            
            {/* All Balances Display */}
            {customer.balances && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className={`text-center p-2 rounded ${customer.balances.balance_sar < 0 ? 'bg-destructive/10' : 'bg-success/10'}`}>
                  <p className={`font-bold ${customer.balances.balance_sar < 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {customer.balances.balance_sar.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">SAR</p>
                </div>
                <div className={`text-center p-2 rounded ${customer.balances.balance_yer < 0 ? 'bg-destructive/10' : 'bg-success/10'}`}>
                  <p className={`font-bold ${customer.balances.balance_yer < 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {customer.balances.balance_yer.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">YER</p>
                </div>
                <div className={`text-center p-2 rounded ${customer.balances.balance_usd < 0 ? 'bg-destructive/10' : 'bg-success/10'}`}>
                  <p className={`font-bold ${customer.balances.balance_usd < 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {customer.balances.balance_usd.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">USD</p>
                </div>
              </div>
            )}
          </div>

          {/* Currency Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              اختر العملة
            </label>
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

          {/* Adjustment Type */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAdjustmentType('add')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                adjustmentType === 'add'
                  ? 'bg-success/10 border-success text-success'
                  : 'border-border text-muted-foreground hover:border-success/50'
              }`}
            >
              <Plus className="w-6 h-6" />
              <span className="font-medium">إضافة رصيد</span>
            </button>
            <button
              type="button"
              onClick={() => setAdjustmentType('subtract')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                adjustmentType === 'subtract'
                  ? 'bg-destructive/10 border-destructive text-destructive'
                  : 'border-border text-muted-foreground hover:border-destructive/50'
              }`}
            >
              <Minus className="w-6 h-6" />
              <span className="font-medium">خصم / مديونية</span>
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              المبلغ ({getCurrencySymbol(selectedCurrency)})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              className="input-field text-xl font-bold text-center"
              required
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              ملاحظة (اختياري)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="سبب التعديل..."
              rows={2}
              className="input-field resize-none"
            />
          </div>

          {/* Preview */}
          {amount && (
            <div className={`p-4 rounded-xl border-2 ${
              newBalance < 0 
                ? 'bg-destructive/10 border-destructive/30' 
                : 'bg-success/10 border-success/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">الرصيد الجديد - {getCurrencySymbol(selectedCurrency)}</span>
                {newBalance < 0 && (
                  <span className="flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="w-3 h-3" />
                    مديونية
                  </span>
                )}
              </div>
              <p className={`font-bold text-2xl mt-1 ${
                newBalance < 0 ? 'text-destructive' : 'text-success'
              }`}>
                {newBalance.toLocaleString()} {getCurrencySymbol(selectedCurrency)}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !amount}
              className={`flex-1 ${
                adjustmentType === 'add' 
                  ? 'bg-success hover:bg-success/90' 
                  : 'bg-destructive hover:bg-destructive/90'
              }`}
            >
              {isLoading ? (
                <span className="animate-spin">⏳</span>
              ) : adjustmentType === 'add' ? (
                'إضافة الرصيد'
              ) : (
                'خصم المبلغ'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
