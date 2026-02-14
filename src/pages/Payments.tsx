import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { DataTable } from '@/components/common/DataTable';
import { ActionsMenu } from '@/components/common/ActionsMenu';
import { AddPaymentModal } from '@/components/modals/AddPaymentModal';
import { EditPaymentModal } from '@/components/modals/EditPaymentModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { PaymentMethodsModal, PaymentMethodType, defaultPaymentMethods } from '@/components/modals/PaymentMethodsModal';
import { Payment, PaymentMethod } from '@/types';
import { CreditCard, Banknote, Building2, Wallet, Filter, Download, Settings, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { loadPayments, savePayments, updatePaymentInStorage, deletePaymentFromStorage } from '@/utils/invoicePaymentUtils';
import { addToBalance, subtractFromBalance } from '@/types/currency';

const PAYMENT_METHODS_STORAGE_KEY = 'app_payment_methods';
const SUBSCRIPTIONS_STORAGE_KEY = 'app_subscriptions';

// Extended Payment type with methodName
interface ExtendedPayment extends Payment {
  methodName?: string;
}

interface DeferredDebtItem {
  id: string;
  customerName: string;
  serviceName: string;
  remaining: number;
  currency: string;
  dueDate?: Date;
}

const getMethodIcon = (method: PaymentMethod | string) => {
  switch (method) {
    case 'card': return CreditCard;
    case 'transfer': return Building2;
    case 'bank': return Building2;
    case 'wallet': return Wallet;
    case 'cash': return Banknote;
    default: return CreditCard;
  }
};

const getMethodStyle = (method: PaymentMethod | string) => {
  switch (method) {
    case 'card': return 'bg-primary/10 text-primary';
    case 'transfer': return 'bg-warning/10 text-warning';
    case 'bank': return 'bg-warning/10 text-warning';
    case 'wallet': return 'bg-success/10 text-success';
    case 'cash': return 'bg-secondary text-foreground';
    default: return 'bg-secondary text-foreground';
  }
};

type FilterMethod = 'all' | 'card' | 'wallet' | 'bank' | 'transfer' | 'cash';

const Payments = () => {
  const [payments, setPayments] = useState<ExtendedPayment[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodType[]>(defaultPaymentMethods);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMethodsModalOpen, setIsMethodsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<ExtendedPayment | null>(null);
  const [filterMethod, setFilterMethod] = useState<FilterMethod>('all');
  const [deferredDebts, setDeferredDebts] = useState<DeferredDebtItem[]>([]);

  const loadDeferredDebts = () => {
    try {
      const raw = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const list = (Array.isArray(parsed) ? parsed : [])
        .map((s: any) => {
          const totalPrice = Number(s?.totalPrice || 0);
          const paidAmount = Number(s?.paidAmount || 0);
          const remaining = Math.max(0, totalPrice - paidAmount);
          const paymentStatus = String(s?.paymentStatus || 'paid');
          const services = Array.isArray(s?.services) ? s.services : [];
          const serviceName = services.length > 0
            ? String(services[0]?.serviceName || 'Ø®Ø¯Ù…Ø©')
            : String(s?.service_name || 'Ø®Ø¯Ù…Ø©');

          return {
            id: String(s?.id || ''),
            customerName: String(s?.customerName || ''),
            serviceName,
            remaining,
            currency: String(s?.currency || 'SAR'),
            dueDate: s?.dueDate ? new Date(s.dueDate) : undefined,
            paymentStatus,
          };
        })
        .filter((s: any) => (s.paymentStatus === 'deferred' || s.paymentStatus === 'partial') && s.remaining > 0)
        .sort((a: any, b: any) => {
          const at = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const bt = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          return at - bt;
        }) as DeferredDebtItem[];

      setDeferredDebts(list);
    } catch (error) {
      console.error('Error loading deferred debts:', error);
      setDeferredDebts([]);
    }
  };

  // Load payments and payment methods from localStorage on mount
  useEffect(() => {
    // Load payments
    const loadedPayments = loadPayments() as ExtendedPayment[];
    setPayments(loadedPayments);
    loadDeferredDebts();

    // Load payment methods
    const savedMethods = localStorage.getItem(PAYMENT_METHODS_STORAGE_KEY);
    if (savedMethods) {
      try {
        const parsed = JSON.parse(savedMethods);
        if (parsed.length > 0) {
          setPaymentMethods(parsed);
        } else {
          setPaymentMethods(defaultPaymentMethods);
          localStorage.setItem(PAYMENT_METHODS_STORAGE_KEY, JSON.stringify(defaultPaymentMethods));
        }
      } catch (e) {
        console.error('Error loading payment methods:', e);
        localStorage.setItem(PAYMENT_METHODS_STORAGE_KEY, JSON.stringify(defaultPaymentMethods));
      }
    } else {
      localStorage.setItem(PAYMENT_METHODS_STORAGE_KEY, JSON.stringify(defaultPaymentMethods));
    }
  }, []);

  // Handle payment methods change and save to localStorage
  const handlePaymentMethodsChange = (methods: PaymentMethodType[]) => {
    setPaymentMethods(methods);
    localStorage.setItem(PAYMENT_METHODS_STORAGE_KEY, JSON.stringify(methods));
    toast.success('ØªÙ… Ø­ÙØ¸ Ø·Ø±Ù‚ Ø§Ù„Ø¯ÙØ¹');
  };

  const handleAddPayment = (paymentData: any) => {
    const newPayment: ExtendedPayment = {
      id: `pay_${Date.now()}`,
      ...paymentData,
    };
    const updated = [newPayment, ...payments];
    setPayments(updated);
    savePayments(updated);
    
    // Add to currency balance
    addToBalance(paymentData.currency, paymentData.amount);
    loadDeferredDebts();
    
    toast.success('ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯ÙØ¹Ø© Ø¨Ù†Ø¬Ø§Ø­');
  };

  const handleEditPayment = (updatedPayment: Payment) => {
    const updated = payments.map(p => 
      p.id === updatedPayment.id ? { ...p, ...updatedPayment } : p
    );
    setPayments(updated);
    updatePaymentInStorage(updatedPayment);
    toast.success('ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¯ÙØ¹Ø© Ø¨Ù†Ø¬Ø§Ø­');
  };

  const handleDeletePayment = () => {
    if (selectedPayment) {
      // Subtract from currency balance when deleting payment
      subtractFromBalance(selectedPayment.currency, selectedPayment.amount);
      
      const updated = payments.filter(p => p.id !== selectedPayment.id);
      setPayments(updated);
      deletePaymentFromStorage(selectedPayment.id);
      loadDeferredDebts();
      toast.success('ØªÙ… Ø­Ø°Ù Ø§Ù„Ø¯ÙØ¹Ø© Ø¨Ù†Ø¬Ø§Ø­');
      setIsDeleteModalOpen(false);
      setSelectedPayment(null);
    }
  };

  // Filter payments
  const filteredPayments = filterMethod === 'all'
    ? payments
    : payments.filter(p => p.method === filterMethod);

  const columns = [
    {
      key: 'payment',
      header: 'Ø§Ù„Ø¯ÙØ¹Ø©',
      render: (payment: ExtendedPayment) => {
        const Icon = getMethodIcon(payment.method);
        const style = getMethodStyle(payment.method);
        return (
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${style}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-foreground">{payment.methodName || payment.method}</p>
              <p className="text-xs text-muted-foreground">
                {payment.paidAt.toLocaleDateString('ar-SA-u-ca-gregory')}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'customer',
      header: 'Ø§Ù„Ø¹Ù…ÙŠÙ„',
      render: (payment: ExtendedPayment) => (
        <span className="text-foreground">{payment.customerName}</span>
      ),
    },
    {
      key: 'invoice',
      header: 'Ø§Ù„ÙØ§ØªÙˆØ±Ø©',
      render: (payment: ExtendedPayment) => (
        <span className="text-primary font-medium">{payment.invoiceNumber}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Ø§Ù„Ù…Ø¨Ù„Øº',
      render: (payment: ExtendedPayment) => (
        <span className="font-bold text-foreground">
          {payment.amount.toLocaleString()} {payment.currency}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'Ø§Ù„Ù…Ø±Ø¬Ø¹',
      render: (payment: ExtendedPayment) => (
        <span className="text-muted-foreground text-sm font-mono">
          {payment.reference || '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (payment: ExtendedPayment) => (
        <ActionsMenu
          items={[
            {
              label: 'Ø¹Ø±Ø¶ Ø§Ù„ØªÙØ§ØµÙŠÙ„',
              icon: Eye,
              onClick: () => console.log('View:', payment),
            },
            {
              label: 'ØªØ¹Ø¯ÙŠÙ„',
              icon: Edit,
              onClick: () => {
                setSelectedPayment(payment);
                setIsEditModalOpen(true);
              },
            },
            {
              label: 'Ø­Ø°Ù',
              icon: Trash2,
              onClick: () => {
                setSelectedPayment(payment);
                setIsDeleteModalOpen(true);
              },
              variant: 'danger',
            },
          ]}
        />
      ),
      className: 'w-12',
    },
  ];

  // Calculate statistics based on filter
  const stats = {
    total: {
      count: filteredPayments.length,
      amount: filteredPayments.reduce((sum, p) => sum + p.amount, 0),
    },
    byCurrency: filteredPayments.reduce((acc, p) => {
      if (!acc[p.currency]) {
        acc[p.currency] = { count: 0, amount: 0 };
      }
      acc[p.currency].count++;
      acc[p.currency].amount += p.amount;
      return acc;
    }, {} as Record<string, { count: number; amount: number }>),
    byMethod: payments.reduce((acc, p) => {
      if (!acc[p.method]) {
        acc[p.method] = { count: 0, amount: 0 };
      }
      acc[p.method].count++;
      acc[p.method].amount += p.amount;
      return acc;
    }, {} as Record<string, { count: number; amount: number }>),
    avgAmount: filteredPayments.length > 0 
      ? filteredPayments.reduce((sum, p) => sum + p.amount, 0) / filteredPayments.length 
      : 0,
    lastPayment: filteredPayments.length > 0 
      ? filteredPayments.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())[0]
      : null,
  };

  const getFilterLabel = () => {
    switch (filterMethod) {
      case 'card': return 'Ø¨Ø·Ø§Ù‚Ø©';
      case 'wallet': return 'Ù…Ø­ÙØ¸Ø©';
      case 'bank': return 'ØªØ­ÙˆÙŠÙ„ Ø¨Ù†ÙƒÙŠ';
      case 'transfer': return 'ØªØ­ÙˆÙŠÙ„';
      case 'cash': return 'Ù†Ù‚Ø¯Ø§Ù‹';
      default: return 'Ø§Ù„ÙƒÙ„';
    }
  };

  return (
    <MainLayout>
      <Header
        title="Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª"
        subtitle={`${payments.length} Ø¹Ù…Ù„ÙŠØ© Ø¯ÙØ¹`}
        showAddButton
        addButtonLabel="ØªØ³Ø¬ÙŠÙ„ Ø¯ÙØ¹Ø©"
        onAddClick={() => setIsAddModalOpen(true)}
      />

      <div className="p-6 space-y-6 animate-fade-in">
        {deferredDebts.length > 0 && (
          <div className="bg-card rounded-xl p-4 border border-border">
            <h3 className="font-semibold text-foreground mb-3">Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø¹Ù„ÙŠÙ‡Ù… Ù…Ø¯ÙÙˆØ¹Ø§Øª Ø¢Ø¬Ù„Ø©</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {deferredDebts.slice(0, 8).map((debt) => (
                <div key={debt.id} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{debt.customerName}</p>
                    <p className="font-bold text-destructive">
                      {debt.remaining.toLocaleString()} {debt.currency}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{debt.serviceName}</p>
                  {debt.dueDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Ø§Ù„Ø§Ø³ØªØ­Ù‚Ø§Ù‚: {debt.dueDate.toLocaleDateString('ar-SA-u-ca-gregory')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm text-muted-foreground">
                {filterMethod === 'all' ? 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª' : `Ù…Ø¯ÙÙˆØ¹Ø§Øª ${getFilterLabel()}`}
              </p>
              {filterMethod !== 'all' && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {getFilterLabel()}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-success">{stats.total.count}</p>
            <p className="text-xs text-muted-foreground mt-1">Ø¹Ù…Ù„ÙŠØ© Ø¯ÙØ¹</p>
          </div>
          
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¨Ù„Øº</p>
            <p className="text-2xl font-bold text-primary">
              {stats.total.amount.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {Object.keys(stats.byCurrency).length > 1 
                ? 'Ø¹Ù…Ù„Ø§Øª Ù…ØªØ¹Ø¯Ø¯Ø©' 
                : Object.keys(stats.byCurrency)[0] || 'Ø±.Ø³'}
            </p>
          </div>
          
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Ù…ØªÙˆØ³Ø· Ø§Ù„Ø¯ÙØ¹Ø©</p>
            <p className="text-2xl font-bold text-warning">
              {stats.avgAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Ù„ÙƒÙ„ Ø¹Ù…Ù„ÙŠØ©</p>
          </div>
          
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Ø·Ø±Ù‚ Ø§Ù„Ø¯ÙØ¹ Ø§Ù„Ù†Ø´Ø·Ø©</p>
            <p className="text-2xl font-bold text-accent">
              {paymentMethods.filter(m => m.active).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Ù…Ù† {paymentMethods.length} Ø·Ø±ÙŠÙ‚Ø©</p>
          </div>
        </div>

        {/* Currency Breakdown Report */}
        {Object.keys(stats.byCurrency).length > 0 && (
          <div className="bg-card rounded-xl p-4 border border-border">
            <h3 className="font-semibold text-foreground mb-3">ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª Ø­Ø³Ø¨ Ø§Ù„Ø¹Ù…Ù„Ø©</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats.byCurrency).map(([currency, data]) => (
                <div key={currency} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{currency}</p>
                    <p className="text-xs text-muted-foreground">{data.count} Ø¹Ù…Ù„ÙŠØ©</p>
                  </div>
                  <p className="text-lg font-bold text-success">{data.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Method Distribution (only show when filter is 'all') */}
        {filterMethod === 'all' && Object.keys(stats.byMethod).length > 0 && (
          <div className="bg-card rounded-xl p-4 border border-border">
            <h3 className="font-semibold text-foreground mb-3">ØªÙˆØ²ÙŠØ¹ Ø·Ø±Ù‚ Ø§Ù„Ø¯ÙØ¹</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(stats.byMethod).map(([method, data]) => {
                const Icon = getMethodIcon(method);
                const style = getMethodStyle(method);
                const methodObj = paymentMethods.find(m => m.type === method);
                return (
                  <div key={method} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className={`p-2 rounded-lg ${style}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {methodObj?.name || method}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {data.count} ({data.amount.toLocaleString()})
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <button className="btn-secondary">
            <Filter className="w-4 h-4" />
            ØªØµÙÙŠØ©
          </button>
          <button className="btn-ghost">
            <Download className="w-4 h-4" />
            ØªØµØ¯ÙŠØ±
          </button>
          <button 
            onClick={() => setIsMethodsModalOpen(true)}
            className="btn-ghost"
          >
            <Settings className="w-4 h-4" />
            Ø¥Ø¯Ø§Ø±Ø© Ø·Ø±Ù‚ Ø§Ù„Ø¯ÙØ¹
          </button>
          <div className="flex items-center gap-2 mr-auto">
            <button 
              onClick={() => setFilterMethod('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterMethod === 'all' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              Ø§Ù„ÙƒÙ„
            </button>
            <button 
              onClick={() => setFilterMethod('card')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterMethod === 'card' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              Ø¨Ø·Ø§Ù‚Ø©
            </button>
            <button 
              onClick={() => setFilterMethod('bank')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterMethod === 'bank' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              ØªØ­ÙˆÙŠÙ„ Ø¨Ù†ÙƒÙŠ
            </button>
            <button 
              onClick={() => setFilterMethod('cash')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterMethod === 'cash' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              Ù†Ù‚Ø¯Ø§Ù‹
            </button>
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filteredPayments}
          keyExtractor={(payment) => payment.id}
        />
      </div>

      {/* Add Payment Modal */}
      <AddPaymentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddPayment}
        paymentMethods={paymentMethods}
      />

      {/* Edit Payment Modal */}
      <EditPaymentModal
        isOpen={isEditModalOpen}
        payment={selectedPayment}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPayment(null);
        }}
        onSave={handleEditPayment}
        paymentMethods={paymentMethods}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title="Ø­Ø°Ù Ø§Ù„Ø¯ÙØ¹Ø©"
        message="Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ù‡Ø°Ù‡ Ø§Ù„Ø¯ÙØ¹Ø©ØŸ Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„ØªØ±Ø§Ø¬Ø¹ Ø¹Ù† Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡."
        itemName={selectedPayment ? `${selectedPayment.amount} ${selectedPayment.currency} - ${selectedPayment.invoiceNumber}` : undefined}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedPayment(null);
        }}
        onConfirm={handleDeletePayment}
      />

      {/* Payment Methods Modal */}
      <PaymentMethodsModal
        isOpen={isMethodsModalOpen}
        onClose={() => setIsMethodsModalOpen(false)}
        methods={paymentMethods}
        onMethodsChange={handlePaymentMethodsChange}
      />
    </MainLayout>
  );
};

export default Payments;

