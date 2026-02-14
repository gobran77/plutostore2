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
import {
  hydrateInvoicePaymentStorageFromCloud,
  loadPayments,
  savePayments,
  updatePaymentInStorage,
  deletePaymentFromStorage,
} from '@/utils/invoicePaymentUtils';
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
            ? String(services[0]?.serviceName || 'خدمة')
            : String(s?.service_name || 'خدمة');

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
    const bootstrap = async () => {
      await hydrateInvoicePaymentStorageFromCloud();
      const loadedPayments = loadPayments() as ExtendedPayment[];
      setPayments(loadedPayments);
      loadDeferredDebts();
    };
    bootstrap().catch((error) => {
      console.error('Failed to initialize payments from cloud:', error);
      const loadedPayments = loadPayments() as ExtendedPayment[];
      setPayments(loadedPayments);
      loadDeferredDebts();
    });

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
    toast.success('تم حفظ طرق الدفع');
  };

  const handleAddPayment = (paymentData: any) => {
    const newPayment: ExtendedPayment = {
      id: `pay_${Date.now()}`,
      ...paymentData,
    };
    const updated = [newPayment, ...payments];
    setPayments(updated);
    savePayments(updated);
    
    // Debt entries are bookkeeping only and should not change cash balance.
    if (!paymentData?.isDebtAddition) {
      addToBalance(paymentData.currency, paymentData.amount);
    }
    loadDeferredDebts();
    
    toast.success('تم تسجيل الدفعة بنجاح');
  };

  const handleEditPayment = (updatedPayment: Payment) => {
    const updated = payments.map(p => 
      p.id === updatedPayment.id ? { ...p, ...updatedPayment } : p
    );
    setPayments(updated);
    updatePaymentInStorage(updatedPayment);
    toast.success('تم تحديث الدفعة بنجاح');
  };

  const handleDeletePayment = () => {
    if (selectedPayment) {
      // Revert cash-balance effect only for real incoming payments.
      if (!(selectedPayment as any)?.isDebtAddition) {
        subtractFromBalance(selectedPayment.currency, selectedPayment.amount);
      }
      
      const updated = payments.filter(p => p.id !== selectedPayment.id);
      setPayments(updated);
      deletePaymentFromStorage(selectedPayment.id);
      loadDeferredDebts();
      toast.success('تم حذف الدفعة بنجاح');
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
      header: 'الدفعة',
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
                {payment.paidAt.toLocaleDateString('ar-SA')}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'customer',
      header: 'العميل',
      render: (payment: ExtendedPayment) => (
        <span className="text-foreground">{payment.customerName}</span>
      ),
    },
    {
      key: 'invoice',
      header: 'الفاتورة',
      render: (payment: ExtendedPayment) => (
        <span className="text-primary font-medium">{payment.invoiceNumber}</span>
      ),
    },
    {
      key: 'amount',
      header: 'المبلغ',
      render: (payment: ExtendedPayment) => (
        <span className={`font-bold ${payment.amount < 0 ? 'text-destructive' : 'text-foreground'}`}>
          {payment.amount.toLocaleString()} {payment.currency}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'المرجع',
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
              label: 'عرض التفاصيل',
              icon: Eye,
              onClick: () => console.log('View:', payment),
            },
            {
              label: 'تعديل',
              icon: Edit,
              onClick: () => {
                setSelectedPayment(payment);
                setIsEditModalOpen(true);
              },
            },
            {
              label: 'حذف',
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
      case 'card': return 'بطاقة';
      case 'wallet': return 'محفظة';
      case 'bank': return 'تحويل بنكي';
      case 'transfer': return 'تحويل';
      case 'cash': return 'نقداً';
      default: return 'الكل';
    }
  };

  return (
    <MainLayout>
      <Header
        title="المدفوعات"
        subtitle={`${payments.length} عملية دفع`}
        showAddButton
        addButtonLabel="تسجيل دفعة"
        onAddClick={() => setIsAddModalOpen(true)}
      />

      <div className="p-6 space-y-6 animate-fade-in">
        {deferredDebts.length > 0 && (
          <div className="bg-card rounded-xl p-4 border border-border">
            <h3 className="font-semibold text-foreground mb-3">العملاء عليهم مدفوعات آجلة</h3>
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
                      الاستحقاق: {debt.dueDate.toLocaleDateString('ar-SA')}
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
                {filterMethod === 'all' ? 'إجمالي المدفوعات' : `مدفوعات ${getFilterLabel()}`}
              </p>
              {filterMethod !== 'all' && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {getFilterLabel()}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-success">{stats.total.count}</p>
            <p className="text-xs text-muted-foreground mt-1">عملية دفع</p>
          </div>
          
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">إجمالي المبلغ</p>
            <p className="text-2xl font-bold text-primary">
              {stats.total.amount.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {Object.keys(stats.byCurrency).length > 1 
                ? 'عملات متعددة' 
                : Object.keys(stats.byCurrency)[0] || 'ر.س'}
            </p>
          </div>
          
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">متوسط الدفعة</p>
            <p className="text-2xl font-bold text-warning">
              {stats.avgAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">لكل عملية</p>
          </div>
          
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">طرق الدفع النشطة</p>
            <p className="text-2xl font-bold text-accent">
              {paymentMethods.filter(m => m.active).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">من {paymentMethods.length} طريقة</p>
          </div>
        </div>

        {/* Currency Breakdown Report */}
        {Object.keys(stats.byCurrency).length > 0 && (
          <div className="bg-card rounded-xl p-4 border border-border">
            <h3 className="font-semibold text-foreground mb-3">تقرير المدفوعات حسب العملة</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats.byCurrency).map(([currency, data]) => (
                <div key={currency} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{currency}</p>
                    <p className="text-xs text-muted-foreground">{data.count} عملية</p>
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
            <h3 className="font-semibold text-foreground mb-3">توزيع طرق الدفع</h3>
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
            تصفية
          </button>
          <button className="btn-ghost">
            <Download className="w-4 h-4" />
            تصدير
          </button>
          <button 
            onClick={() => setIsMethodsModalOpen(true)}
            className="btn-ghost"
          >
            <Settings className="w-4 h-4" />
            إدارة طرق الدفع
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
              الكل
            </button>
            <button 
              onClick={() => setFilterMethod('card')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterMethod === 'card' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              بطاقة
            </button>
            <button 
              onClick={() => setFilterMethod('bank')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterMethod === 'bank' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              تحويل بنكي
            </button>
            <button 
              onClick={() => setFilterMethod('cash')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterMethod === 'cash' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              نقداً
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
        title="حذف الدفعة"
        message="هل أنت متأكد من حذف هذه الدفعة؟ لا يمكن التراجع عن هذا الإجراء."
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
