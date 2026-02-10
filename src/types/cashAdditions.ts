// Cash Additions types - زيادات الصندوق

export interface CashAddition {
  id: string;
  amount: number;
  currency: string;
  reason: string;
  notes?: string;
  createdAt: Date;
}

export const CASH_ADDITIONS_STORAGE_KEY = 'app_cash_additions';

// Load cash additions from localStorage
export const loadCashAdditions = (): CashAddition[] => {
  const saved = localStorage.getItem(CASH_ADDITIONS_STORAGE_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return parsed.map((item: any) => ({
      ...item,
      createdAt: new Date(item.createdAt),
    }));
  } catch (e) {
    console.error('Error loading cash additions:', e);
    return [];
  }
};

// Save cash additions to localStorage
export const saveCashAdditions = (additions: CashAddition[]): void => {
  localStorage.setItem(CASH_ADDITIONS_STORAGE_KEY, JSON.stringify(additions));
};

// Add new cash addition
export const addCashAddition = (addition: CashAddition): void => {
  const additions = loadCashAdditions();
  additions.unshift(addition);
  saveCashAdditions(additions);
};

// Delete cash addition
export const deleteCashAddition = (id: string): void => {
  const additions = loadCashAdditions().filter(a => a.id !== id);
  if (additions.length === 0) {
    localStorage.removeItem(CASH_ADDITIONS_STORAGE_KEY);
  } else {
    saveCashAdditions(additions);
  }
};
