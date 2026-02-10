import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { DataTable } from '@/components/common/DataTable';
import { ActionsMenu } from '@/components/common/ActionsMenu';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { Plus, Edit, Trash2, Receipt, Tag, Wallet, ShoppingCart, Globe, Megaphone, MoreHorizontal, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Expense, ExpenseCategory, defaultExpenseCategories } from '@/types/expenses';
import { supportedCurrencies, getCurrencySymbol, loadCurrencyBalances, subtractFromBalance, addToBalance } from '@/types/currency';

const EXPENSES_STORAGE_KEY = 'app_expenses';
const EXPENSE_CATEGORIES_STORAGE_KEY = 'app_expense_categories';

const getCategoryIcon = (type: string) => {
  switch (type) {
    case 'transfers': return Wallet;
    case 'purchases': return ShoppingCart;
    case 'subscriptions': return Globe;
    case 'ads': return Megaphone;
    default: return MoreHorizontal;
  }
};

const getCategoryColor = (type: string) => {
  switch (type) {
    case 'transfers': return 'text-primary bg-primary/10';
    case 'purchases': return 'text-success bg-success/10';
    case 'subscriptions': return 'text-warning bg-warning/10';
    case 'ads': return 'text-destructive bg-destructive/10';
    default: return 'text-muted-foreground bg-muted';
  }
};

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'expense' | 'category'; id: string; name: string } | null>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [expenseError, setExpenseError] = useState<string | null>(null);

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    categoryId: '',
    amount: '',
    currency: 'SAR',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    type: 'other' as ExpenseCategory['type'],
    description: '',
  });

  // Load data
  useEffect(() => {
    const savedExpenses = localStorage.getItem(EXPENSES_STORAGE_KEY);
    if (savedExpenses) {
      try {
        const parsed = JSON.parse(savedExpenses);
        setExpenses(parsed.map((e: any) => ({
          ...e,
          date: new Date(e.date),
          createdAt: new Date(e.createdAt),
        })));
      } catch (e) {
        console.error('Error loading expenses:', e);
      }
    }

    const savedCategories = localStorage.getItem(EXPENSE_CATEGORIES_STORAGE_KEY);
    if (savedCategories) {
      try {
        const parsed = JSON.parse(savedCategories);
        setCategories(parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
        })));
      } catch (e) {
        console.error('Error loading expense categories:', e);
        setCategories(defaultExpenseCategories);
        localStorage.setItem(EXPENSE_CATEGORIES_STORAGE_KEY, JSON.stringify(defaultExpenseCategories));
      }
    } else {
      setCategories(defaultExpenseCategories);
      localStorage.setItem(EXPENSE_CATEGORIES_STORAGE_KEY, JSON.stringify(defaultExpenseCategories));
    }

    // Load balances
    setBalances(loadCurrencyBalances());
  }, []);

  // Save data
  useEffect(() => {
    if (expenses.length > 0) {
      localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
    }
  }, [expenses]);

  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem(EXPENSE_CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    }
  }, [categories]);

  // Handlers
  const handleAddExpense = () => {
    if (!expenseForm.categoryId || !expenseForm.amount) return;

    const category = categories.find(c => c.id === expenseForm.categoryId);
    if (!category) return;

    const amount = parseFloat(expenseForm.amount);
    const currency = expenseForm.currency;

    // Check if balance is sufficient
    const currentBalance = balances[currency] || 0;
    if (currentBalance < amount) {
      setExpenseError(`رصيد ${getCurrencySymbol(currency)} غير كافٍ. الرصيد الحالي: ${currentBalance.toLocaleString()}`);
      return;
    }

    // Deduct from balance
    const success = subtractFromBalance(currency, amount);
    if (!success) {
      setExpenseError('فشل في خصم المبلغ من الرصيد');
      return;
    }

    const newExpense: Expense = {
      id: Date.now().toString(),
      categoryId: expenseForm.categoryId,
      categoryName: category.name,
      amount: amount,
      currency: currency,
      description: expenseForm.description,
      date: new Date(expenseForm.date),
      createdAt: new Date(),
    };

    setExpenses([newExpense, ...expenses]);
    setExpenseForm({
      categoryId: '',
      amount: '',
      currency: 'SAR',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setIsAddModalOpen(false);
    setExpenseError(null);
    
    // Reload balances
    setBalances(loadCurrencyBalances());
    
    toast.success('تمت إضافة المصروف وخصمه من الرصيد');
  };

  const handleAddCategory = () => {
    if (!categoryForm.name.trim()) return;

    const newCategory: ExpenseCategory = {
      id: Date.now().toString(),
      name: categoryForm.name,
      type: categoryForm.type,
      description: categoryForm.description,
      createdAt: new Date(),
    };

    setCategories([...categories, newCategory]);
    setCategoryForm({ name: '', type: 'other', description: '' });
    setIsAddCategoryModalOpen(false);
    toast.success('تمت إضافة التصنيف بنجاح');
  };

  const handleDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'expense') {
      const expense = expenses.find(e => e.id === deleteTarget.id);
      if (expense) {
        // Refund the amount back to balance
        addToBalance(expense.currency, expense.amount);
        setBalances(loadCurrencyBalances());
      }
      
      const updated = expenses.filter(e => e.id !== deleteTarget.id);
      setExpenses(updated);
      if (updated.length === 0) {
        localStorage.removeItem(EXPENSES_STORAGE_KEY);
      }
      toast.success('تم حذف المصروف وإرجاع المبلغ للرصيد');
    } else {
      setCategories(categories.filter(c => c.id !== deleteTarget.id));
      toast.success('تم حذف التصنيف');
    }

    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  // Calculate totals by currency
  const totalsByCurrency = supportedCurrencies.reduce((acc, curr) => {
    acc[curr.code] = expenses
      .filter(e => e.currency === curr.code)
      .reduce((sum, e) => sum + e.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  const columns = [
    {
      key: 'category',
      header: 'التصنيف',
      render: (expense: Expense) => {
        const category = categories.find(c => c.id === expense.categoryId);
        const Icon = getCategoryIcon(category?.type || 'other');
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getCategoryColor(category?.type || 'other')}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="font-medium text-foreground">{expense.categoryName}</span>
          </div>
        );
      },
    },
    {
      key: 'description',
      header: 'الوصف',
      render: (expense: Expense) => (
        <span className="text-muted-foreground">{expense.description || '-'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'المبلغ',
      render: (expense: Expense) => (
        <span className="font-bold text-destructive">
          {new Intl.NumberFormat('ar-SA').format(expense.amount)} {getCurrencySymbol(expense.currency)}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'التاريخ',
      render: (expense: Expense) => (
        <span className="text-muted-foreground text-sm">
          {expense.date.toLocaleDateString('ar-SA')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (expense: Expense) => (
        <ActionsMenu
          items={[
            {
              label: 'حذف',
              icon: Trash2,
              onClick: () => {
                setDeleteTarget({ type: 'expense', id: expense.id, name: expense.categoryName });
                setIsDeleteModalOpen(true);
              },
              variant: 'danger',
            },
          ]}
        />
      ),
      className: 'w-16',
    },
  ];

  return (
    <MainLayout>
      <Header
        title="المصروفات"
        subtitle="إدارة وتتبع المصروفات والنفقات"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddCategoryModalOpen(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Tag className="w-4 h-4" />
              <span>تصنيف جديد</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مصروف</span>
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Totals by Currency */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {supportedCurrencies.map((currency) => (
            <div key={currency.code} className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">إجمالي المصروفات ({currency.symbol})</span>
                <Receipt className="w-4 h-4 text-destructive" />
              </div>
              <p className="text-xl font-bold text-destructive">
                {new Intl.NumberFormat('ar-SA').format(totalsByCurrency[currency.code] || 0)} {currency.symbol}
              </p>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold text-foreground mb-3">تصنيفات المصروفات</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = getCategoryIcon(category.type);
              return (
                <div
                  key={category.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getCategoryColor(category.type)}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{category.name}</span>
                  {!defaultExpenseCategories.find(d => d.id === category.id) && (
                    <button
                      onClick={() => {
                        setDeleteTarget({ type: 'category', id: category.id, name: category.name });
                        setIsDeleteModalOpen(true);
                      }}
                      className="hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Expenses Table */}
        <DataTable
          data={expenses}
          columns={columns}
          keyExtractor={(e) => e.id}
          emptyMessage="لا توجد مصروفات"
        />
      </div>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={() => { setIsAddModalOpen(false); setExpenseError(null); }} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in border border-border">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">إضافة مصروف</h2>
              <button onClick={() => { setIsAddModalOpen(false); setExpenseError(null); }} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Plus className="w-5 h-5 text-muted-foreground rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Current Balances */}
              <div className="grid grid-cols-3 gap-2">
                {supportedCurrencies.map((c) => (
                  <div key={c.code} className={`p-2 rounded-lg border text-center ${
                    expenseForm.currency === c.code ? 'border-primary bg-primary/5' : 'border-border'
                  }`}>
                    <p className="text-xs text-muted-foreground">{c.name}</p>
                    <p className="font-bold text-foreground text-sm">
                      {new Intl.NumberFormat('ar-SA').format(balances[c.code] || 0)} {c.symbol}
                    </p>
                  </div>
                ))}
              </div>

              {/* Error Alert */}
              {expenseError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{expenseError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">التصنيف</label>
                <select
                  value={expenseForm.categoryId}
                  onChange={(e) => setExpenseForm({ ...expenseForm, categoryId: e.target.value })}
                  className="input-field"
                >
                  <option value="">اختر التصنيف</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">المبلغ</label>
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="input-field"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">العملة</label>
                  <select
                    value={expenseForm.currency}
                    onChange={(e) => setExpenseForm({ ...expenseForm, currency: e.target.value })}
                    className="input-field"
                  >
                    {supportedCurrencies.map((c) => (
                      <option key={c.code} value={c.code}>{c.symbol} - {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">التاريخ</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">الوصف</label>
                <textarea
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="input-field min-h-[80px] resize-none"
                  placeholder="وصف المصروف..."
                />
              </div>
              <div className="flex items-center gap-3 pt-4">
                <button onClick={handleAddExpense} className="btn-primary flex-1">إضافة</button>
                <button onClick={() => setIsAddModalOpen(false)} className="btn-secondary">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={() => setIsAddCategoryModalOpen(false)} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in border border-border">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">إضافة تصنيف جديد</h2>
              <button onClick={() => setIsAddCategoryModalOpen(false)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Plus className="w-5 h-5 text-muted-foreground rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">اسم التصنيف</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="input-field"
                  placeholder="مثال: رواتب الموظفين"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">نوع التصنيف</label>
                <select
                  value={categoryForm.type}
                  onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value as ExpenseCategory['type'] })}
                  className="input-field"
                >
                  <option value="transfers">تحويلات</option>
                  <option value="purchases">مشتريات</option>
                  <option value="subscriptions">اشتراكات مواقع</option>
                  <option value="ads">إعلانات ممولة</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">الوصف (اختياري)</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="input-field min-h-[80px] resize-none"
                  placeholder="وصف التصنيف..."
                />
              </div>
              <div className="flex items-center gap-3 pt-4">
                <button onClick={handleAddCategory} className="btn-primary flex-1">إضافة</button>
                <button onClick={() => setIsAddCategoryModalOpen(false)} className="btn-secondary">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        title={deleteTarget?.type === 'category' ? 'حذف التصنيف' : 'حذف المصروف'}
        message={`هل أنت متأكد من حذف "${deleteTarget?.name}"؟`}
      />
    </MainLayout>
  );
};

export default Expenses;
