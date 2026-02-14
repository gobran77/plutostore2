import { useState, useEffect } from 'react';
import { X, ArrowRight, Calculator, Divide, AlertCircle } from 'lucide-react';
import { supportedCurrencies, getCurrencySymbol, getCurrencyName, CurrencyExchange, loadCurrencyBalances, processCurrencyExchange } from '@/types/currency';

interface CurrencyExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExchange: (exchange: Omit<CurrencyExchange, 'id' | 'createdAt'>) => void;
}

export const CurrencyExchangeModal = ({ isOpen, onClose, onExchange }: CurrencyExchangeModalProps) => {
  const [fromCurrency, setFromCurrency] = useState('SAR');
  const [toCurrency, setToCurrency] = useState('YER');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [operation, setOperation] = useState<'multiply' | 'divide'>('multiply');
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  // Load balances when modal opens
  useEffect(() => {
    if (isOpen) {
      setBalances(loadCurrencyBalances());
      setError(null);
    }
  }, [isOpen]);

  const result = amount && rate 
    ? operation === 'multiply' 
      ? parseFloat(amount) * parseFloat(rate) 
      : parseFloat(amount) / parseFloat(rate)
    : 0;

  const handleSubmit = () => {
    if (!amount || !rate) return;
    
    const amountNum = parseFloat(amount);
    
    // Process the exchange - deduct from source, add to destination
    const exchangeResult = processCurrencyExchange(fromCurrency, toCurrency, amountNum, result);
    
    if (!exchangeResult.success) {
      setError(exchangeResult.error || 'فشل في عملية التحويل');
      return;
    }
    
    onExchange({
      fromCurrency,
      toCurrency,
      rate: parseFloat(rate),
      amount: amountNum,
      result,
      operation,
      date: new Date(),
    });
    
    setAmount('');
    setRate('');
    setError(null);
    onClose();
  };

  const handleClose = () => {
    setAmount('');
    setRate('');
    setError(null);
    onClose();
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" 
        onClick={handleClose} 
      />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">تحويل العملات</h2>
          <button 
            onClick={handleClose} 
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Current Balances */}
          <div className="grid grid-cols-3 gap-2">
            {supportedCurrencies.map((c) => (
              <div key={c.code} className={`p-3 rounded-lg border text-center ${
                fromCurrency === c.code ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <p className="text-xs text-muted-foreground">{c.name}</p>
                <p className="font-bold text-foreground">
                  {new Intl.NumberFormat('ar-SA').format(balances[c.code] || 0)} {c.symbol}
                </p>
              </div>
            ))}
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Currency Selection */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">من</label>
              <select
                value={fromCurrency}
                onChange={(e) => {
                  setFromCurrency(e.target.value);
                  setError(null);
                }}
                className="input-field"
              >
                {supportedCurrencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} - {c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                الرصيد: {new Intl.NumberFormat('ar-SA').format(balances[fromCurrency] || 0)}
              </p>
            </div>
            <button
              onClick={swapCurrencies}
              className="mt-3 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">إلى</label>
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="input-field"
              >
                {supportedCurrencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} - {c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                الرصيد: {new Intl.NumberFormat('ar-SA').format(balances[toCurrency] || 0)}
              </p>
            </div>
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">
                المبلغ <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  المتاح: <span className="font-bold text-foreground">{new Intl.NumberFormat('ar-SA').format(balances[fromCurrency] || 0)}</span> {getCurrencySymbol(fromCurrency)}
                </span>
                <button
                  type="button"
                  onClick={() => setAmount(String(balances[fromCurrency] || 0))}
                  disabled={!balances[fromCurrency] || balances[fromCurrency] <= 0}
                  className="px-2 py-1 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  الكل
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="أدخل المبلغ"
                className="input-field pl-12"
                min="0"
                max={balances[fromCurrency] || 0}
                step="0.01"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {getCurrencySymbol(fromCurrency)}
              </span>
            </div>
            {amount && parseFloat(amount) > (balances[fromCurrency] || 0) && (
              <p className="text-xs text-destructive mt-1">
                المبلغ المدخل أكبر من الرصيد المتاح!
              </p>
            )}
          </div>

          {/* Operation Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              نوع العملية
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOperation('multiply')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                  operation === 'multiply'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-muted-foreground'
                }`}
              >
                <span className="text-lg font-bold">×</span>
                <span className="font-medium">ضرب</span>
              </button>
              <button
                type="button"
                onClick={() => setOperation('divide')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                  operation === 'divide'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-muted-foreground'
                }`}
              >
                <Divide className="w-5 h-5" />
                <span className="font-medium">قسمة</span>
              </button>
            </div>
          </div>

          {/* Exchange Rate */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              سعر الصرف <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder={`1 ${getCurrencySymbol(fromCurrency)} = ؟ ${getCurrencySymbol(toCurrency)}`}
              className="input-field"
              min="0"
              step="0.0001"
            />
          </div>

          {/* Result */}
          {amount && rate && (
            <div className="bg-success/10 border border-success/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-success">الناتج</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 }).format(result)} {getCurrencySymbol(toCurrency)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {amount} {getCurrencySymbol(fromCurrency)} {operation === 'multiply' ? '×' : '÷'} {rate} = {result.toFixed(2)} {getCurrencySymbol(toCurrency)}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            <button 
              onClick={handleSubmit} 
              className="btn-primary flex-1"
              disabled={!amount || !rate}
            >
              تأكيد التحويل
            </button>
            <button onClick={handleClose} className="btn-secondary">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
