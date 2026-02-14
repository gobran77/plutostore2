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
      setExpenseError(`Ø±ØµÙŠØ¯ ${getCurrencySymbol(currency)} ØºÙŠØ± ÙƒØ§ÙÙ. Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø­Ø§Ù„ÙŠ: ${currentBalance.toLocaleString()}`);
      return;
    }

    // Deduct from balance
    const success = subtractFromBalance(currency, amount);
    if (!success) {
      setExpenseError('ÙØ´Ù„ ÙÙŠ Ø®ØµÙ… Ø§Ù„Ù…Ø¨Ù„Øº Ù…Ù† Ø§Ù„Ø±ØµÙŠØ¯');
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
    
    toast.success('ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù…ØµØ±ÙˆÙ ÙˆØ®ØµÙ…Ù‡ Ù…Ù† Ø§Ù„Ø±ØµÙŠØ¯');
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
    toast.success('ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© Ø§Ù„ØªØµÙ†ÙŠÙ Ø¨Ù†Ø¬Ø§Ø­');
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
      toast.success('ØªÙ… Ø­Ø°Ù Ø§Ù„Ù…ØµØ±ÙˆÙ ÙˆØ¥Ø±Ø¬Ø§Ø¹ Ø§Ù„Ù…Ø¨Ù„Øº Ù„Ù„Ø±ØµÙŠØ¯');
    } else {
      setCategories(categories.filter(c => c.id !== deleteTarget.id));
      toast.success('ØªÙ… Ø­Ø°Ù Ø§Ù„ØªØµÙ†ÙŠÙ');
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
      header: 'Ø§Ù„ØªØµÙ†ÙŠÙ',
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
      header: 'Ø§Ù„ÙˆØµÙ',
      render: (expense: Expense) => (
        <span className="text-muted-foreground">{expense.description || '-'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Ø§Ù„Ù…Ø¨Ù„Øº',
      render: (expense: Expense) => (
        <span className="font-bold text-destructive">
          {new Intl.NumberFormat('ar-SA-u-ca-gregory').format(expense.amount)} {getCurrencySymbol(expense.currency)}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Ø§Ù„ØªØ§Ø±ÙŠØ®',
      render: (expense: Expense) => (
        <span className="text-muted-foreground text-sm">
          {expense.date.toLocaleDateString('ar-SA-u-ca-gregory')}
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
              label: 'Ø­Ø°Ù',
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
        title="Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª"
        subtitle="Ø¥Ø¯Ø§Ø±Ø© ÙˆØªØªØ¨Ø¹ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª ÙˆØ§Ù„Ù†ÙÙ‚Ø§Øª"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddCategoryModalOpen(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Tag className="w-4 h-4" />
              <span>ØªØµÙ†ÙŠÙ Ø¬Ø¯ÙŠØ¯</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Ø¥Ø¶Ø§ÙØ© Ù…ØµØ±ÙˆÙ</span>
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
                <span className="text-sm text-muted-foreground">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª ({currency.symbol})</span>
                <Receipt className="w-4 h-4 text-destructive" />
              </div>
              <p className="text-xl font-bold text-destructive">
                {new Intl.NumberFormat('ar-SA-u-ca-gregory').format(totalsByCurrency[currency.code] || 0)} {currency.symbol}
              </p>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <h3 className="font-semibold text-foreground mb-3">ØªØµÙ†ÙŠÙØ§Øª Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª</h3>
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
          emptyMessage="Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…ØµØ±ÙˆÙØ§Øª"
        />
      </div>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={() => { setIsAddModalOpen(false); setExpenseError(null); }} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in border border-border">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Ø¥Ø¶Ø§ÙØ© Ù…ØµØ±ÙˆÙ</h2>
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
                      {new Intl.NumberFormat('ar-SA-u-ca-gregory').format(balances[c.code] || 0)} {c.symbol}
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
                <label className="block text-sm font-medium text-foreground mb-2">Ø§Ù„ØªØµÙ†ÙŠÙ</label>
                <select
                  value={expenseForm.categoryId}
                  onChange={(e) => setExpenseForm({ ...expenseForm, categoryId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Ø§Ø®ØªØ± Ø§Ù„ØªØµÙ†ÙŠÙ</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Ø§Ù„Ù…Ø¨Ù„Øº</label>
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
                  <label className="block text-sm font-medium text-foreground mb-2">Ø§Ù„Ø¹Ù…Ù„Ø©</label>
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
                <label className="block text-sm font-medium text-foreground mb-2">Ø§Ù„ØªØ§Ø±ÙŠØ®</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Ø§Ù„ÙˆØµÙ</label>
                <textarea
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="input-field min-h-[80px] resize-none"
                  placeholder="ÙˆØµÙ Ø§Ù„Ù…ØµØ±ÙˆÙ..."
                />
              </div>
              <div className="flex items-center gap-3 pt-4">
                <button onClick={handleAddExpense} className="btn-primary flex-1">Ø¥Ø¶Ø§ÙØ©</button>
                <button onClick={() => setIsAddModalOpen(false)} className="btn-secondary">Ø¥Ù„ØºØ§Ø¡</button>
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
              <h2 className="text-xl font-bold text-foreground">Ø¥Ø¶Ø§ÙØ© ØªØµÙ†ÙŠÙ Ø¬Ø¯ÙŠØ¯</h2>
              <button onClick={() => setIsAddCategoryModalOpen(false)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Plus className="w-5 h-5 text-muted-foreground rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Ø§Ø³Ù… Ø§Ù„ØªØµÙ†ÙŠÙ</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="input-field"
                  placeholder="Ù…Ø«Ø§Ù„: Ø±ÙˆØ§ØªØ¨ Ø§Ù„Ù…ÙˆØ¸ÙÙŠÙ†"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Ù†ÙˆØ¹ Ø§Ù„ØªØµÙ†ÙŠÙ</label>
                <select
                  value={categoryForm.type}
                  onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value as ExpenseCategory['type'] })}
                  className="input-field"
                >
                  <option value="transfers">ØªØ­ÙˆÙŠÙ„Ø§Øª</option>
                  <option value="purchases">Ù…Ø´ØªØ±ÙŠØ§Øª</option>
                  <option value="subscriptions">Ø§Ø´ØªØ±Ø§ÙƒØ§Øª Ù…ÙˆØ§Ù‚Ø¹</option>
                  <option value="ads">Ø¥Ø¹Ù„Ø§Ù†Ø§Øª Ù…Ù…ÙˆÙ„Ø©</option>
                  <option value="other">Ø£Ø®Ø±Ù‰</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Ø§Ù„ÙˆØµÙ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="input-field min-h-[80px] resize-none"
                  placeholder="ÙˆØµÙ Ø§Ù„ØªØµÙ†ÙŠÙ..."
                />
              </div>
              <div className="flex items-center gap-3 pt-4">
                <button onClick={handleAddCategory} className="btn-primary flex-1">Ø¥Ø¶Ø§ÙØ©</button>
                <button onClick={() => setIsAddCategoryModalOpen(false)} className="btn-secondary">Ø¥Ù„ØºØ§Ø¡</button>
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
        title={deleteTarget?.type === 'category' ? 'Ø­Ø°Ù Ø§Ù„ØªØµÙ†ÙŠÙ' : 'Ø­Ø°Ù Ø§Ù„Ù…ØµØ±ÙˆÙ'}
        message={`Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù "${deleteTarget?.name}"ØŸ`}
      />
    </MainLayout>
  );
};

export default Expenses;

