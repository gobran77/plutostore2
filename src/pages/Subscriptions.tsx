import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ActionsMenu } from '@/components/common/ActionsMenu';
import { AddSubscriptionModal } from '@/components/subscriptions/AddSubscriptionModal';
import { WhatsAppMessageModal } from '@/components/subscriptions/WhatsAppMessageModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { PaymentMethodType, defaultPaymentMethods } from '@/components/modals/PaymentMethodsModal';
import { Subscription, SubscriptionStatus, Customer, PaymentStatus } from '@/types';
import { Service } from '@/types/services';
import { Calendar, RefreshCw, Filter, Edit, Trash2, Eye, Download, Package, CreditCard, AlertCircle, Clock, Building2, Wallet, Banknote, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  createInvoiceFromSubscription, 
  createPaymentFromSubscription, 
  addInvoice, 
  addPayment,
  loadPayments,
  savePayments,
  loadInvoices,
  saveInvoices
} from '@/utils/invoicePaymentUtils';
import { subtractFromBalance } from '@/types/currency';

const SUBSCRIPTIONS_STORAGE_KEY = 'app_subscriptions';
const SERVICES_STORAGE_KEY = 'app_services';
const PAYMENT_METHODS_STORAGE_KEY = 'app_payment_methods';

type FilterStatus = 'all' | SubscriptionStatus;

const getPaymentStatusBadge = (status: PaymentStatus, dueDate?: Date) => {
  const now = new Date();
  const isOverdue = dueDate && new Date(dueDate) < now;
  
  switch (status) {
    case 'paid':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-success/10 text-success text-xs font-medium">
          <CreditCard className="w-3 h-3" />
          مدفوع
        </span>
      );
    case 'partial':
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
          isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
        }`}>
          <Clock className="w-3 h-3" />
          جزئي {isOverdue && '(متأخر)'}
        </span>
      );
    case 'deferred':
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
          isOverdue ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-destructive/10 text-destructive'
        }`}>
          <AlertCircle className="w-3 h-3" />
          آجل {isOverdue && '(متأخر!)'}
        </span>
      );
    default:
      return null;
  }
};

const getPaymentMethodIcon = (type?: string) => {
  switch (type) {
    case 'bank': return Building2;
    case 'wallet': return Wallet;
    case 'card': return CreditCard;
    case 'cash': return Banknote;
    default: return CreditCard;
  }
};

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodType[]>(defaultPaymentMethods);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [whatsAppData, setWhatsAppData] = useState<{ customerName: string; whatsappNumber: string; message: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Load customers from Supabase
  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_accounts')
        .select('*')
        .eq('is_admin', false)
        .neq('account_type', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform to Customer type
      const customerData: Customer[] = (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        email: '', // Not stored in customer_accounts
        whatsapp: c.whatsapp_number,
        status: 'active' as const,
        createdAt: new Date(c.created_at),
        currency: c.currency || 'SAR',
      }));

      console.log('Loaded customers for subscriptions:', customerData.length);
      setCustomers(customerData);
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  };

  // Load services function (from localStorage for now)
  const loadServices = () => {
    const savedServices = localStorage.getItem(SERVICES_STORAGE_KEY);
    if (savedServices) {
      try {
        const parsed = JSON.parse(savedServices);
        const servicesWithDates = parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          accounts: s.accounts || [],
        }));
        setServices(servicesWithDates);
      } catch (e) {
        console.error('Error loading services:', e);
      }
    } else {
      setServices([]);
    }
  };

  // Load data on mount
  useEffect(() => {
    // Load subscriptions from localStorage
    const savedSubscriptions = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
    if (savedSubscriptions) {
      try {
        const parsed = JSON.parse(savedSubscriptions);
        const subscriptionsWithDates = parsed.map((s: any) => ({
          ...s,
          startDate: new Date(s.startDate),
          endDate: new Date(s.endDate),
          dueDate: s.dueDate ? new Date(s.dueDate) : undefined,
          paymentStatus: s.paymentStatus || 'paid',
          paidAmount: s.paidAmount || s.totalPrice,
        }));
        setSubscriptions(subscriptionsWithDates);
      } catch (e) {
        console.error('Error loading subscriptions:', e);
      }
    }

    // Load customers from Supabase
    loadCustomers();

    // Load services from localStorage
    loadServices();

    // Load payment methods from localStorage
    const savedPaymentMethods = localStorage.getItem(PAYMENT_METHODS_STORAGE_KEY);
    if (savedPaymentMethods) {
      try {
        const parsed = JSON.parse(savedPaymentMethods);
        setPaymentMethods(parsed);
      } catch (e) {
        console.error('Error loading payment methods:', e);
      }
    }
  }, []);

  // Refresh customers when modal opens
  useEffect(() => {
    if (isModalOpen) {
      loadCustomers();
      loadServices();
    }
  }, [isModalOpen]);

  // Save subscriptions to localStorage
  useEffect(() => {
    if (subscriptions.length > 0) {
      localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(subscriptions));
    }
  }, [subscriptions]);

  // Send WhatsApp notification to customer
  const sendWhatsAppNotification = async (subscription: Subscription, customerWhatsapp: string) => {
    const statusText = subscription.status === 'active' ? 'نشط' : subscription.status === 'expiring_soon' ? 'قريب من الانتهاء' : subscription.status === 'expired' ? 'منتهي' : subscription.status;
    const paymentText = subscription.paymentStatus === 'paid' ? 'مدفوع' : subscription.paymentStatus === 'partial' ? `جزئي (${subscription.paidAmount} من ${subscription.totalPrice})` : 'آجل';
    
    const message = [
      `🎉 *تم تفعيل اشتراكك بنجاح!*`,
      ``,
      `مرحباً ${subscription.customerName}،`,
      ``,
      `*تفاصيل الاشتراك:*`,
      ``,
      `📦 الخدمات:`,
      ...subscription.services.map(s => `   • ${s.serviceName}: ${s.price} ${subscription.currency}`),
      ``,
      `📅 تاريخ البداية: ${subscription.startDate.toLocaleDateString('ar-SA')}`,
      `📅 تاريخ الانتهاء: ${subscription.endDate.toLocaleDateString('ar-SA')}`,
      ``,
      `💳 حالة الدفع: ${paymentText}`,
      `💰 المبلغ الإجمالي: ${subscription.totalPrice} ${subscription.currency}`,
      subscription.discount > 0 ? `🎁 الخصم: ${subscription.discount} ${subscription.currency}` : '',
      ``,
      `شكراً لثقتكم بنا! 🙏`,
      ``,
      `📱 *ملاحظة:*`,
      `للتسجيل ومتابعة تفاصيل حسابك، يرجى إنشاء حساب على الموقع التالي:`,
      `https://plutostoreai.lovable.app`,
    ].filter(Boolean).join('\n');

    try {
      const response = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: customerWhatsapp,
          message,
          customerName: subscription.customerName,
        },
      });

      if (response.error) {
        console.error('WhatsApp notification error:', response.error);
      } else {
        console.log('WhatsApp notification sent successfully');
      }
    } catch (err) {
      console.error('Error sending WhatsApp notification:', err);
    }
  };

  const handleAddSubscription = async (subscriptionData: Omit<Subscription, 'id' | 'status'>) => {
    const newSubscription: Subscription = {
      ...subscriptionData,
      id: Date.now().toString(),
      status: 'active',
    };
    
    // Get customer WhatsApp number
    const customer = customers.find(c => c.id === subscriptionData.customerId);
    const customerWhatsapp = customer?.whatsapp?.replace(/[^0-9]/g, '') || '';
    
    // Save to Supabase customer_subscriptions table
    try {
      const { error } = await supabase
        .from('customer_subscriptions')
        .insert({
          customer_id: subscriptionData.customerId,
          service_name: subscriptionData.services.map(s => s.serviceName).join(', '),
          price: subscriptionData.totalPrice,
          currency: subscriptionData.currency,
          start_date: subscriptionData.startDate.toISOString(),
          end_date: subscriptionData.endDate.toISOString(),
          status: 'active',
        });

      if (error) {
        console.error('Error saving subscription to database:', error);
        toast.error('حدث خطأ في حفظ الاشتراك');
        return;
      }

      // If payment is deferred, deduct the amount from customer balance (make it negative/debt)
      if (subscriptionData.paymentStatus === 'deferred') {
        const { data: customerData, error: fetchError } = await supabase
          .from('customer_accounts')
          .select('balance')
          .eq('id', subscriptionData.customerId)
          .single();

        if (!fetchError && customerData) {
          const currentBalance = customerData.balance || 0;
          const newBalance = currentBalance - subscriptionData.totalPrice;

          const { error: updateError } = await supabase
            .from('customer_accounts')
            .update({ balance: newBalance })
            .eq('id', subscriptionData.customerId);

          if (updateError) {
            console.error('Error updating customer balance:', updateError);
          }
        }
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('حدث خطأ في حفظ الاشتراك');
      return;
    }

    setSubscriptions([newSubscription, ...subscriptions]);
    
    // Create invoice from subscription
    const invoice = createInvoiceFromSubscription(newSubscription);
    addInvoice(invoice);
    
    // Create payment if paid or partial
    const payment = createPaymentFromSubscription(newSubscription, invoice.invoiceNumber);
    if (payment) {
      addPayment(payment);
    }
    
    // Send WhatsApp notification to customer
    if (customerWhatsapp) {
      sendWhatsAppNotification(newSubscription, customerWhatsapp);
      toast.success('تمت إضافة الاشتراك وإرسال التفاصيل للعميل عبر واتساب');
    } else {
      toast.success('تمت إضافة الاشتراك وإنشاء الفاتورة بنجاح');
    }
  };

  const handleDeleteSubscription = async () => {
    if (selectedSubscription) {
      // Delete from Supabase first
      try {
        const { error } = await supabase
          .from('customer_subscriptions')
          .delete()
          .eq('customer_id', selectedSubscription.customerId)
          .ilike('service_name', `%${selectedSubscription.services[0]?.serviceName || ''}%`);

        if (error) {
          console.error('Error deleting from Supabase:', error);
        }
      } catch (err) {
        console.error('Error:', err);
      }

      // Delete associated payment and subtract from balance
      const payments = loadPayments();
      const relatedPayments = payments.filter(p => p.invoiceId === selectedSubscription.id);
      relatedPayments.forEach(payment => {
        subtractFromBalance(payment.currency, payment.amount);
      });
      const updatedPayments = payments.filter(p => p.invoiceId !== selectedSubscription.id);
      if (updatedPayments.length === 0) {
        localStorage.removeItem('app_payments');
      } else {
        savePayments(updatedPayments);
      }

      // Delete associated invoice
      const invoices = loadInvoices();
      const updatedInvoices = invoices.filter(inv => inv.subscriptionId !== selectedSubscription.id);
      if (updatedInvoices.length === 0) {
        localStorage.removeItem('app_invoices');
      } else {
        saveInvoices(updatedInvoices);
      }

      // Delete subscription
      const updatedSubscriptions = subscriptions.filter(s => s.id !== selectedSubscription.id);
      setSubscriptions(updatedSubscriptions);
      if (updatedSubscriptions.length === 0) {
        localStorage.removeItem(SUBSCRIPTIONS_STORAGE_KEY);
      }
      toast.success('تم حذف الاشتراك والفاتورة والدفعة المرتبطة بنجاح');
      setIsDeleteModalOpen(false);
      setSelectedSubscription(null);
    }
  };

  const openDeleteModal = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsDeleteModalOpen(true);
  };

  // Filter subscriptions based on selected status
  const filteredSubscriptions = filterStatus === 'all'
    ? subscriptions
    : subscriptions.filter(s => s.status === filterStatus);

  const columns = [
    {
      key: 'customer',
      header: 'العميل',
      render: (sub: Subscription) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-sm font-medium text-foreground">
              {sub.customerName.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">{sub.customerName}</p>
            <p className="text-xs text-muted-foreground font-mono">#{sub.customerCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'services',
      header: 'الخدمات',
      render: (sub: Subscription) => (
        <div className="flex flex-wrap gap-1">
          {sub.services.map((service, idx) => (
            <span 
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs"
            >
              <Package className="w-3 h-3" />
              {service.serviceName}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'فترة الاشتراك',
      render: (sub: Subscription) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {sub.startDate.toLocaleDateString('ar-SA')} - {sub.endDate.toLocaleDateString('ar-SA')}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (sub: Subscription) => <StatusBadge status={sub.status} />,
    },
    {
      key: 'paymentStatus',
      header: 'الدفع',
      render: (sub: Subscription) => {
        const Icon = getPaymentMethodIcon(sub.paymentMethod?.type);
        return (
          <div className="space-y-1">
            {getPaymentStatusBadge(sub.paymentStatus, sub.dueDate)}
            {sub.paymentMethod && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Icon className="w-3 h-3" />
                <span>{sub.paymentMethod.name}</span>
              </div>
            )}
            {sub.paymentStatus !== 'paid' && sub.dueDate && (
              <p className="text-xs text-muted-foreground">
                {new Date(sub.dueDate).toLocaleDateString('ar-SA')}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: 'المبلغ',
      render: (sub: Subscription) => {
        const remaining = sub.totalPrice - sub.paidAmount;
        return (
          <div>
            <p className="font-semibold text-foreground">{sub.totalPrice} {sub.currency}</p>
            {sub.paymentStatus !== 'paid' && (
              <p className="text-xs text-destructive font-medium">
                متبقي: {remaining} {sub.currency}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'profit',
      header: 'الربح',
      render: (sub: Subscription) => {
        const profit = sub.totalPrice - sub.totalCost;
        const profitMargin = sub.totalPrice > 0 ? ((profit / sub.totalPrice) * 100).toFixed(1) : '0';
        return (
          <div>
            <p className={`font-semibold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {profit} {sub.currency}
            </p>
            <p className="text-xs text-muted-foreground">{profitMargin}% هامش</p>
          </div>
        );
      },
    },
    {
      key: 'autoRenew',
      header: 'التجديد التلقائي',
      render: (sub: Subscription) => (
        <div className="flex items-center gap-2">
          <RefreshCw
            className={`w-4 h-4 ${sub.autoRenew ? 'text-success' : 'text-muted-foreground'}`}
          />
          <span className={sub.autoRenew ? 'text-success text-sm' : 'text-muted-foreground text-sm'}>
            {sub.autoRenew ? 'مفعّل' : 'معطّل'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (sub: Subscription) => {
        const customer = customers.find(c => c.id === sub.customerId);
        const whatsappNumber = customer?.whatsapp?.replace(/[^0-9]/g, '') || '';
        
        const sendWhatsApp = () => {
          if (!whatsappNumber) {
            toast.error('لا يوجد رقم واتساب مسجل لهذا العميل');
            return;
          }
          
          const statusText = sub.status === 'active' ? 'نشط' : sub.status === 'expiring_soon' ? 'قريب من الانتهاء' : sub.status === 'expired' ? 'منتهي' : sub.status;
          const paymentText = sub.paymentStatus === 'paid' ? 'مدفوع' : sub.paymentStatus === 'partial' ? `جزئي (${sub.paidAmount} من ${sub.totalPrice})` : 'آجل';
          
          const message = [
            `*تفاصيل الاشتراك*`,
            ``,
            `العميل: ${sub.customerName}`,
            `الكود: #${sub.customerCode || 'غير محدد'}`,
            ``,
            `الخدمات:`,
            ...sub.services.map(s => `- ${s.serviceName}: ${s.price} ${sub.currency}`),
            ``,
            `تاريخ البداية: ${sub.startDate.toLocaleDateString('ar-SA')}`,
            `تاريخ الانتهاء: ${sub.endDate.toLocaleDateString('ar-SA')}`,
            ``,
            `حالة الاشتراك: ${statusText}`,
            `حالة الدفع: ${paymentText}`,
            ``,
            `المبلغ الإجمالي: ${sub.totalPrice} ${sub.currency}`,
            sub.discount > 0 ? `الخصم: ${sub.discount} ${sub.currency}` : '',
            ``,
            `شكراً لثقتكم بنا!`,
            ``,
            `📱 *ملاحظة:*`,
            `للتسجيل ومتابعة تفاصيل حسابك، يرجى إنشاء حساب على الموقع التالي:`,
            `https://plutostoreai.lovable.app`,
          ].filter(Boolean).join('\n');
          
          setWhatsAppData({
            customerName: sub.customerName,
            whatsappNumber,
            message,
          });
          setIsWhatsAppModalOpen(true);
        };
        
        return (
          <ActionsMenu
            items={[
              {
                label: 'إرسال عبر واتساب',
                icon: MessageCircle,
                onClick: sendWhatsApp,
              },
              {
                label: 'عرض التفاصيل',
                icon: Eye,
                onClick: () => console.log('View:', sub),
              },
              {
                label: 'تعديل',
                icon: Edit,
                onClick: () => console.log('Edit:', sub),
              },
              {
                label: 'حذف',
                icon: Trash2,
                onClick: () => openDeleteModal(sub),
                variant: 'danger',
              },
            ]}
          />
        );
      },
      className: 'w-12',
    },
  ];

  const activeCount = subscriptions.filter(s => s.status === 'active').length;
  const expiringCount = subscriptions.filter(s => s.status === 'expiring_soon').length;
  const expiredCount = subscriptions.filter(s => s.status === 'expired').length;
  const deferredCount = subscriptions.filter(s => s.paymentStatus === 'deferred' || s.paymentStatus === 'partial').length;
  const totalDebt = subscriptions
    .filter(s => s.paymentStatus !== 'paid')
    .reduce((sum, s) => sum + (s.totalPrice - s.paidAmount), 0);

  return (
    <MainLayout>
      <Header
        title="الاشتراكات"
        subtitle={`${subscriptions.length} اشتراك`}
        showAddButton
        addButtonLabel="إضافة اشتراك"
        onAddClick={() => setIsModalOpen(true)}
      />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">نشط</p>
            <p className="text-2xl font-bold text-success">{activeCount}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">قريب من الانتهاء</p>
            <p className="text-2xl font-bold text-warning">{expiringCount}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">منتهي</p>
            <p className="text-2xl font-bold text-destructive">{expiredCount}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">آجل / جزئي</p>
            <p className="text-2xl font-bold text-warning">{deferredCount}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">إجمالي المديونية</p>
            <p className="text-2xl font-bold text-destructive">{totalDebt.toLocaleString()} ر.س</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <button className="btn-secondary">
            <Filter className="w-4 h-4" />
            تصفية
          </button>
          <button className="btn-ghost">
            <Download className="w-4 h-4" />
            تصدير CSV
          </button>
          <div className="flex items-center gap-2 mr-auto">
            <button 
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'all' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              الكل
            </button>
            <button 
              onClick={() => setFilterStatus('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'active' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              نشط
            </button>
            <button 
              onClick={() => setFilterStatus('expiring_soon')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'expiring_soon' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              قريب من الانتهاء
            </button>
            <button 
              onClick={() => setFilterStatus('expired')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'expired' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              منتهي
            </button>
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filteredSubscriptions}
          keyExtractor={(sub) => sub.id}
        />
      </div>

      {/* Add Subscription Modal */}
      <AddSubscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddSubscription}
        customers={customers}
        services={services}
        paymentMethods={paymentMethods}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title="حذف الاشتراك"
        message="هل أنت متأكد من حذف هذا الاشتراك؟ لا يمكن التراجع عن هذا الإجراء."
        itemName={selectedSubscription?.customerName}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedSubscription(null);
        }}
        onConfirm={handleDeleteSubscription}
      />

      {/* WhatsApp Message Modal */}
      {whatsAppData && (
        <WhatsAppMessageModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setWhatsAppData(null);
          }}
          customerName={whatsAppData.customerName}
          whatsappNumber={whatsAppData.whatsappNumber}
          message={whatsAppData.message}
        />
      )}
    </MainLayout>
  );
};

export default Subscriptions;
