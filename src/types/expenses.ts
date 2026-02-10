// Expense types
export interface ExpenseCategory {
  id: string;
  name: string;
  type: 'transfers' | 'purchases' | 'subscriptions' | 'ads' | 'other';
  description?: string;
  createdAt: Date;
}

export interface Expense {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  currency: string;
  description: string;
  date: Date;
  createdAt: Date;
}

export const defaultExpenseCategories: ExpenseCategory[] = [
  { id: '1', name: 'تحويلات', type: 'transfers', createdAt: new Date() },
  { id: '2', name: 'مشتريات', type: 'purchases', createdAt: new Date() },
  { id: '3', name: 'اشتراكات مواقع', type: 'subscriptions', createdAt: new Date() },
  { id: '4', name: 'إعلانات ممولة', type: 'ads', createdAt: new Date() },
  { id: '5', name: 'أخرى', type: 'other', createdAt: new Date() },
];
