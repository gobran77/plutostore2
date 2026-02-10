import { supportedCurrencies, getCurrencySymbol } from '@/types/currency';
import { DollarSign } from 'lucide-react';

interface CurrencySelectorProps {
  selectedCurrency: string | 'all';
  onCurrencyChange: (currency: string | 'all') => void;
}

export const CurrencySelector = ({ selectedCurrency, onCurrencyChange }: CurrencySelectorProps) => {
  return (
    <div className="flex items-center gap-2 bg-card rounded-xl border border-border p-1">
      <button
        onClick={() => onCurrencyChange('all')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          selectedCurrency === 'all'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted'
        }`}
      >
        الكل
      </button>
      {supportedCurrencies.map((currency) => (
        <button
          key={currency.code}
          onClick={() => onCurrencyChange(currency.code)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
            selectedCurrency === currency.code
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <span>{currency.symbol}</span>
          <span className="hidden sm:inline">{currency.name}</span>
        </button>
      ))}
    </div>
  );
};
