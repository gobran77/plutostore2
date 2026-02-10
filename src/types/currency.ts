// Currency types
export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface CurrencyExchange {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  amount: number;
  result: number;
  operation: 'multiply' | 'divide';
  date: Date;
  createdAt: Date;
}

// Currency balance tracking - represents actual cash/balance in each currency
export interface CurrencyBalance {
  currency: string;
  balance: number;
  lastUpdated: Date;
}

export const supportedCurrencies: Currency[] = [
  { code: 'SAR', name: 'ريال سعودي', symbol: 'ر.س' },
  { code: 'YER', name: 'ريال يمني', symbol: 'ر.ي' },
  { code: 'USD', name: 'دولار أمريكي', symbol: '$' },
];

export const getCurrencySymbol = (code: string): string => {
  const currency = supportedCurrencies.find(c => c.code === code);
  return currency?.symbol || code;
};

export const getCurrencyName = (code: string): string => {
  const currency = supportedCurrencies.find(c => c.code === code);
  return currency?.name || code;
};

// Storage key for balances
const BALANCES_STORAGE_KEY = 'app_currency_balances';

// Load currency balances
export const loadCurrencyBalances = (): Record<string, number> => {
  const saved = localStorage.getItem(BALANCES_STORAGE_KEY);
  if (!saved) {
    // Initialize with zero balances
    const initial: Record<string, number> = {};
    supportedCurrencies.forEach(c => initial[c.code] = 0);
    return initial;
  }
  try {
    return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading balances:', e);
    const initial: Record<string, number> = {};
    supportedCurrencies.forEach(c => initial[c.code] = 0);
    return initial;
  }
};

// Save currency balances
export const saveCurrencyBalances = (balances: Record<string, number>): void => {
  localStorage.setItem(BALANCES_STORAGE_KEY, JSON.stringify(balances));
};

// Add to currency balance (when receiving payment)
export const addToBalance = (currency: string, amount: number): void => {
  const balances = loadCurrencyBalances();
  balances[currency] = (balances[currency] || 0) + amount;
  saveCurrencyBalances(balances);
};

// Subtract from currency balance (when paying expense or exchanging)
export const subtractFromBalance = (currency: string, amount: number): boolean => {
  const balances = loadCurrencyBalances();
  const currentBalance = balances[currency] || 0;
  
  if (currentBalance < amount) {
    return false; // Insufficient balance
  }
  
  balances[currency] = currentBalance - amount;
  saveCurrencyBalances(balances);
  return true;
};

// Process currency exchange - deduct from source, add to destination
export const processCurrencyExchange = (
  fromCurrency: string, 
  toCurrency: string, 
  amount: number, 
  result: number
): { success: boolean; error?: string } => {
  const balances = loadCurrencyBalances();
  const sourceBalance = balances[fromCurrency] || 0;
  
  if (sourceBalance < amount) {
    return { 
      success: false, 
      error: `رصيد ${getCurrencyName(fromCurrency)} غير كافٍ. الرصيد الحالي: ${sourceBalance.toLocaleString()}` 
    };
  }
  
  // Deduct from source
  balances[fromCurrency] = sourceBalance - amount;
  // Add to destination
  balances[toCurrency] = (balances[toCurrency] || 0) + result;
  
  saveCurrencyBalances(balances);
  return { success: true };
};

// Reset all balances to zero
export const resetAllBalances = (): void => {
  const zeroed: Record<string, number> = {};
  supportedCurrencies.forEach(c => zeroed[c.code] = 0);
  saveCurrencyBalances(zeroed);
};

// Recalculate balances from all sources (payments + cash additions - expenses exchanges)
export const recalculateBalances = (): Record<string, number> => {
  const balances: Record<string, number> = {};
  supportedCurrencies.forEach(c => balances[c.code] = 0);
  
  // Add from payments
  const paymentsData = localStorage.getItem('app_payments');
  if (paymentsData) {
    try {
      const payments = JSON.parse(paymentsData);
      payments.forEach((p: any) => {
        if (p.currency && p.amount) {
          balances[p.currency] = (balances[p.currency] || 0) + p.amount;
        }
      });
    } catch (e) {
      console.error('Error parsing payments:', e);
    }
  }
  
  // Add from cash additions
  const cashData = localStorage.getItem('app_cash_additions');
  if (cashData) {
    try {
      const additions = JSON.parse(cashData);
      additions.forEach((a: any) => {
        if (a.currency && a.amount) {
          balances[a.currency] = (balances[a.currency] || 0) + a.amount;
        }
      });
    } catch (e) {
      console.error('Error parsing cash additions:', e);
    }
  }
  
  // Subtract expenses
  const expensesData = localStorage.getItem('app_expenses');
  if (expensesData) {
    try {
      const expenses = JSON.parse(expensesData);
      expenses.forEach((e: any) => {
        if (e.currency && e.amount) {
          balances[e.currency] = (balances[e.currency] || 0) - e.amount;
        }
      });
    } catch (e) {
      console.error('Error parsing expenses:', e);
    }
  }
  
  // Apply currency exchanges
  const exchangesData = localStorage.getItem('app_currency_exchanges');
  if (exchangesData) {
    try {
      const exchanges = JSON.parse(exchangesData);
      exchanges.forEach((ex: any) => {
        if (ex.fromCurrency && ex.toCurrency && ex.amount && ex.result) {
          balances[ex.fromCurrency] = (balances[ex.fromCurrency] || 0) - ex.amount;
          balances[ex.toCurrency] = (balances[ex.toCurrency] || 0) + ex.result;
        }
      });
    } catch (e) {
      console.error('Error parsing exchanges:', e);
    }
  }
  
  saveCurrencyBalances(balances);
  return balances;
};
