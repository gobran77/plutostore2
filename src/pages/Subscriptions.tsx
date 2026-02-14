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
import { getCustomerAccounts, updateCustomerAccountRecord } from '@/lib/customerAccountsStorage';
import { addCustomerActivity } from '@/lib/customerActivityLog';
import { fixTextEncoding } from '@/lib/textEncoding';
import { CLOUD_STATE_UPDATED_EVENT } from '@/lib/cloudStorageSync';

const SUBSCRIPTIONS_STORAGE_KEY = 'app_subscriptions';
const SERVICES_STORAGE_KEY = 'app_services';
const CUSTOMERS_STORAGE_KEY = 'app_customers';
const PAYMENT_METHODS_STORAGE_KEY = 'app_payment_methods';

type CustomerBalanceField = 'balance_sar' | 'balance_yer' | 'balance_usd';

const getCustomerBalanceField = (currency: string): CustomerBalanceField | null => {
  switch (String(currency || '').toUpperCase()) {
    case 'SAR':
      return 'balance_sar';
    case 'YER':
      return 'balance_yer';
    case 'USD':
      return 'balance_usd';
    default:
      return null;
  }
};

type FilterStatus = 'all' | SubscriptionStatus;

const getPaymentStatusBadge = (status: PaymentStatus, dueDate?: Date) => {
  const now = new Date();
  const isOverdue = dueDate && new Date(dueDate) < now;
  
  switch (status) {
    case 'paid':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-success/10 text-success text-xs font-medium">
          <CreditCard className="w-3 h-3" />
          Ù…Ø¯ÙÙˆØ¹
        </span>
      );
    case 'partial':
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
          isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
        }`}>
          <Clock className="w-3 h-3" />
          Ø¬Ø²Ø¦ÙŠ {isOverdue && '(Ù…ØªØ£Ø®Ø±)'}
        </span>
      );
    case 'deferred':
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
          isOverdue ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-destructive/10 text-destructive'
        }`}>
          <AlertCircle className="w-3 h-3" />
          Ø¢Ø¬Ù„ {isOverdue && '(Ù…ØªØ£Ø®Ø±!)'}
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
  const [subscriptionsHydrated, setSubscriptionsHydrated] = useState(false);

  const loadSubscriptions = () => {
    const savedSubscriptions = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
    if (!savedSubscriptions) {
      setSubscriptions([]);
      setSubscriptionsHydrated(true);
      return;
    }
    try {
      const parsed = JSON.parse(savedSubscriptions);
      const subscriptionsWithDates = parsed.map((s: any) => {
        const totalPrice = Number(s?.totalPrice || 0);
        const paidAmount =
          typeof s?.paidAmount === 'number'
            ? s.paidAmount
            : typeof s?.paid_amount === 'number'
            ? s.paid_amount
            : totalPrice;

        return ({
        ...s,
        customerName: fixTextEncoding(String(s?.customerName || '')),
        startDate: new Date(s.startDate),
        endDate: new Date(s.endDate),
        dueDate: s.dueDate ? new Date(s.dueDate) : undefined,
        paymentNotes: s?.paymentNotes ? fixTextEncoding(String(s.paymentNotes)) : undefined,
        paymentMethod: s?.paymentMethod
          ? {
              ...s.paymentMethod,
              name: fixTextEncoding(String(s.paymentMethod?.name || '')),
              details: s.paymentMethod?.details ? fixTextEncoding(String(s.paymentMethod.details)) : undefined,
            }
          : undefined,
        services: Array.isArray(s?.services)
          ? s.services.map((x: any) => ({
              ...x,
              serviceName: fixTextEncoding(String(x?.serviceName || '')),
            }))
          : [],
        paymentStatus: s.paymentStatus || 'paid',
        // Keep 0 for deferred subscriptions; don't coerce to totalPrice on refresh.
        paidAmount,
      });
      });
      setSubscriptions(subscriptionsWithDates);
      setSubscriptionsHydrated(true);
    } catch (e) {
      console.error('Error loading subscriptions:', e);
      setSubscriptions([]);
      setSubscriptionsHydrated(true);
    }
  };

  // Customers are loaded from localStorage only.
  const loadCustomers = () => {
    const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (!raw) {
      setCustomers([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const customersWithDates = (Array.isArray(parsed) ? parsed : []).map((c: any) => ({
        ...c,
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
      }));
      setCustomers(customersWithDates);
    } catch (e) {
      console.error('Error loading customers:', e);
      setCustomers([]);
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
    loadSubscriptions();

    // Load customers from localStorage
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

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SUBSCRIPTIONS_STORAGE_KEY || e.key === null) {
        loadSubscriptions();
      }
      if (e.key === CUSTOMERS_STORAGE_KEY || e.key === null) {
        loadCustomers();
      }
      if (e.key === SERVICES_STORAGE_KEY || e.key === null) {
        loadServices();
      }
      if (e.key === PAYMENT_METHODS_STORAGE_KEY || e.key === null) {
        const raw = localStorage.getItem(PAYMENT_METHODS_STORAGE_KEY);
        if (!raw) {
          setPaymentMethods(defaultPaymentMethods);
          return;
        }
        try {
          const parsed = JSON.parse(raw);
          setPaymentMethods(parsed);
        } catch {
          setPaymentMethods(defaultPaymentMethods);
        }
      }
    };

    const onCloudStateUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ keys?: string[] }>;
      const changed = new Set(customEvent?.detail?.keys || []);
      if (changed.has(SUBSCRIPTIONS_STORAGE_KEY)) {
        loadSubscriptions();
      }
      if (changed.has(CUSTOMERS_STORAGE_KEY)) {
        loadCustomers();
      }
      if (changed.has(SERVICES_STORAGE_KEY)) {
        loadServices();
      }
      if (changed.has(PAYMENT_METHODS_STORAGE_KEY)) {
        const raw = localStorage.getItem(PAYMENT_METHODS_STORAGE_KEY);
        if (!raw) {
          setPaymentMethods(defaultPaymentMethods);
          return;
        }
        try {
          const parsed = JSON.parse(raw);
          setPaymentMethods(parsed);
        } catch {
          setPaymentMethods(defaultPaymentMethods);
        }
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(CLOUD_STATE_UPDATED_EVENT, onCloudStateUpdated as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CLOUD_STATE_UPDATED_EVENT, onCloudStateUpdated as EventListener);
    };
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
    if (!subscriptionsHydrated) return;

    if (subscriptions.length === 0) {
      localStorage.removeItem(SUBSCRIPTIONS_STORAGE_KEY);
      return;
    }
    const nextSerialized = JSON.stringify(subscriptions);
    if (localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY) === nextSerialized) return;
    localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, nextSerialized);
  }, [subscriptions, subscriptionsHydrated]);

  // Send WhatsApp notification to customer
  const sendWhatsAppNotification = async (_subscription: Subscription, _customerWhatsapp: string) => {
    // WhatsApp sending from backend is disabled.
    return;
  };

  const applyCustomerDebtDelta = async (customerId: string, currency: string, delta: number) => {
    if (!Number.isFinite(delta) || delta === 0) return;

    const balanceField = getCustomerBalanceField(currency);
    if (!balanceField) return;

    try {
      const accounts = await getCustomerAccounts();
      const account = accounts.find((a) => String(a.id) === String(customerId));
      if (!account) return;

      const currentBalance = Number((account as any)?.[balanceField] || 0);
      const nextBalance = currentBalance + delta;

      await updateCustomerAccountRecord(account.id, { [balanceField]: nextBalance } as any);

      const rawSession = localStorage.getItem('customer_session');
      if (!rawSession) return;

      const session = JSON.parse(rawSession);
      if (String(session?.id || '') !== String(customerId)) return;

      const nextSession = {
        ...session,
        balances: {
          balance_sar: Number(session?.balances?.balance_sar || 0),
          balance_yer: Number(session?.balances?.balance_yer || 0),
          balance_usd: Number(session?.balances?.balance_usd || 0),
          [balanceField]: nextBalance,
        },
      };

      localStorage.setItem('customer_session', JSON.stringify(nextSession));
    } catch (error) {
      console.error('Failed to update customer debt balance:', error);
    }
  };

  const handleAddSubscription = async (subscriptionData: Omit<Subscription, 'id' | 'status'>) => {
    let newSubscription: Subscription = {
      ...subscriptionData,
      id: Date.now().toString(),
      status: 'active',
    };
    
    // Get customer WhatsApp number
    const customer = customers.find(c => c.id === subscriptionData.customerId);
    const customerWhatsapp = customer?.whatsapp?.replace(/[^0-9]/g, '') || '';
    
    setSubscriptions((prev) => [newSubscription, ...prev]);
    
    // Create invoice from subscription
    const invoice = createInvoiceFromSubscription(newSubscription);
    addInvoice(invoice);
    
    // Create payment if paid or partial
    const payment = createPaymentFromSubscription(newSubscription, invoice.invoiceNumber);
    if (payment) {
      addPayment(payment);
    }

    // Debt should appear as negative customer balance.
    const remainingDebt = Math.max(
      0,
      Number(newSubscription.totalPrice || 0) - Number(newSubscription.paidAmount || 0)
    );
    if (newSubscription.paymentStatus !== 'paid' && remainingDebt > 0) {
      await applyCustomerDebtDelta(newSubscription.customerId, newSubscription.currency, -remainingDebt);
    }

    addCustomerActivity({
      customerId: newSubscription.customerId,
      type: 'subscription_add',
      title: 'ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© Ø§Ø´ØªØ±Ø§Ùƒ Ø¬Ø¯ÙŠØ¯',
      description: `${newSubscription.services.map((s) => s.serviceName).join('ØŒ ') || 'Ø®Ø¯Ù…Ø©'}`,
      amount: Number(newSubscription.totalPrice || 0),
      currency: newSubscription.currency,
      meta: {
        subscriptionId: newSubscription.id,
      },
    });
    
    toast.success('ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ ÙˆØ¥Ù†Ø´Ø§Ø¡ Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø¨Ù†Ø¬Ø§Ø­');
  };

  const handleDeleteSubscription = async () => {
    if (selectedSubscription) {
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
      localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(updatedSubscriptions));
      if (updatedSubscriptions.length === 0) {
        localStorage.removeItem(SUBSCRIPTIONS_STORAGE_KEY);
      }

      // Remove debt effect when deleting deferred/partial subscription.
      const remainingDebt = Math.max(
        0,
        Number(selectedSubscription.totalPrice || 0) - Number(selectedSubscription.paidAmount || 0)
      );
      if (selectedSubscription.paymentStatus !== 'paid' && remainingDebt > 0) {
        await applyCustomerDebtDelta(
          selectedSubscription.customerId,
          selectedSubscription.currency,
          remainingDebt
        );
      }

      addCustomerActivity({
        customerId: selectedSubscription.customerId,
        type: 'subscription_delete',
        title: 'ØªÙ… Ø­Ø°Ù Ø§Ø´ØªØ±Ø§Ùƒ',
        description: selectedSubscription.services.map((s) => s.serviceName).join('ØŒ ') || 'Ø§Ø´ØªØ±Ø§Ùƒ',
        amount: Number(selectedSubscription.totalPrice || 0),
        currency: selectedSubscription.currency,
        meta: {
          subscriptionId: selectedSubscription.id,
        },
      });

      toast.success('ØªÙ… Ø­Ø°Ù Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ ÙˆØ§Ù„ÙØ§ØªÙˆØ±Ø© ÙˆØ§Ù„Ø¯ÙØ¹Ø© Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ù†Ø¬Ø§Ø­');
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
      header: 'Ø§Ù„Ø¹Ù…ÙŠÙ„',
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
      header: 'Ø§Ù„Ø®Ø¯Ù…Ø§Øª',
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
      header: 'ÙØªØ±Ø© Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ',
      render: (sub: Subscription) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {sub.startDate.toLocaleDateString('ar-SA-u-ca-gregory')} - {sub.endDate.toLocaleDateString('ar-SA-u-ca-gregory')}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Ø§Ù„Ø­Ø§Ù„Ø©',
      render: (sub: Subscription) => <StatusBadge status={sub.status} />,
    },
    {
      key: 'paymentStatus',
      header: 'Ø§Ù„Ø¯ÙØ¹',
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
                {new Date(sub.dueDate).toLocaleDateString('ar-SA-u-ca-gregory')}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: 'Ø§Ù„Ù…Ø¨Ù„Øº',
      render: (sub: Subscription) => {
        const remaining = sub.totalPrice - sub.paidAmount;
        return (
          <div>
            <p className="font-semibold text-foreground">{sub.totalPrice} {sub.currency}</p>
            {sub.paymentStatus !== 'paid' && (
              <p className="text-xs text-destructive font-medium">
                Ù…ØªØ¨Ù‚ÙŠ: {remaining} {sub.currency}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'profit',
      header: 'Ø§Ù„Ø±Ø¨Ø­',
      render: (sub: Subscription) => {
        const profit = sub.totalPrice - sub.totalCost;
        const profitMargin = sub.totalPrice > 0 ? ((profit / sub.totalPrice) * 100).toFixed(1) : '0';
        return (
          <div>
            <p className={`font-semibold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {profit} {sub.currency}
            </p>
            <p className="text-xs text-muted-foreground">{profitMargin}% Ù‡Ø§Ù…Ø´</p>
          </div>
        );
      },
    },
    {
      key: 'autoRenew',
      header: 'Ø§Ù„ØªØ¬Ø¯ÙŠØ¯ Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ',
      render: (sub: Subscription) => (
        <div className="flex items-center gap-2">
          <RefreshCw
            className={`w-4 h-4 ${sub.autoRenew ? 'text-success' : 'text-muted-foreground'}`}
          />
          <span className={sub.autoRenew ? 'text-success text-sm' : 'text-muted-foreground text-sm'}>
            {sub.autoRenew ? 'Ù…ÙØ¹Ù‘Ù„' : 'Ù…Ø¹Ø·Ù‘Ù„'}
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
            toast.error('Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø±Ù‚Ù… ÙˆØ§ØªØ³Ø§Ø¨ Ù…Ø³Ø¬Ù„ Ù„Ù‡Ø°Ø§ Ø§Ù„Ø¹Ù…ÙŠÙ„');
            return;
          }
          
          const statusText = sub.status === 'active' ? 'Ù†Ø´Ø·' : sub.status === 'expiring_soon' ? 'Ù‚Ø±ÙŠØ¨ Ù…Ù† Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡' : sub.status === 'expired' ? 'Ù…Ù†ØªÙ‡ÙŠ' : sub.status;
          const paymentText = sub.paymentStatus === 'paid' ? 'Ù…Ø¯ÙÙˆØ¹' : sub.paymentStatus === 'partial' ? `Ø¬Ø²Ø¦ÙŠ (${sub.paidAmount} Ù…Ù† ${sub.totalPrice})` : 'Ø¢Ø¬Ù„';
          
          const message = [
            `*ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ*`,
            ``,
            `Ø§Ù„Ø¹Ù…ÙŠÙ„: ${sub.customerName}`,
            `Ø§Ù„ÙƒÙˆØ¯: #${sub.customerCode || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯'}`,
            ``,
            `Ø§Ù„Ø®Ø¯Ù…Ø§Øª:`,
            ...sub.services.map(s => `- ${s.serviceName}: ${s.price} ${sub.currency}`),
            ``,
            `ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©: ${sub.startDate.toLocaleDateString('ar-SA-u-ca-gregory')}`,
            `ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡: ${sub.endDate.toLocaleDateString('ar-SA-u-ca-gregory')}`,
            ``,
            `Ø­Ø§Ù„Ø© Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ: ${statusText}`,
            `Ø­Ø§Ù„Ø© Ø§Ù„Ø¯ÙØ¹: ${paymentText}`,
            ``,
            `Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: ${sub.totalPrice} ${sub.currency}`,
            sub.discount > 0 ? `Ø§Ù„Ø®ØµÙ…: ${sub.discount} ${sub.currency}` : '',
            ``,
            `Ø´ÙƒØ±Ø§Ù‹ Ù„Ø«Ù‚ØªÙƒÙ… Ø¨Ù†Ø§!`,
            ``,
            `ðŸ“± *Ù…Ù„Ø§Ø­Ø¸Ø©:*`,
            `Ù„Ù„ØªØ³Ø¬ÙŠÙ„ ÙˆÙ…ØªØ§Ø¨Ø¹Ø© ØªÙØ§ØµÙŠÙ„ Ø­Ø³Ø§Ø¨ÙƒØŒ ÙŠØ±Ø¬Ù‰ Ø¥Ù†Ø´Ø§Ø¡ Ø­Ø³Ø§Ø¨ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø§Ù„ØªØ§Ù„ÙŠ:`,
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
                label: 'Ø¥Ø±Ø³Ø§Ù„ Ø¹Ø¨Ø± ÙˆØ§ØªØ³Ø§Ø¨',
                icon: MessageCircle,
                onClick: sendWhatsApp,
              },
              {
                label: 'Ø¹Ø±Ø¶ Ø§Ù„ØªÙØ§ØµÙŠÙ„',
                icon: Eye,
                onClick: () => console.log('View:', sub),
              },
              {
                label: 'ØªØ¹Ø¯ÙŠÙ„',
                icon: Edit,
                onClick: () => console.log('Edit:', sub),
              },
              {
                label: 'Ø­Ø°Ù',
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
        title="Ø§Ù„Ø§Ø´ØªØ±Ø§ÙƒØ§Øª"
        subtitle={`${subscriptions.length} Ø§Ø´ØªØ±Ø§Ùƒ`}
        showAddButton
        addButtonLabel="Ø¥Ø¶Ø§ÙØ© Ø§Ø´ØªØ±Ø§Ùƒ"
        onAddClick={() => setIsModalOpen(true)}
      />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Ù†Ø´Ø·</p>
            <p className="text-2xl font-bold text-success">{activeCount}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Ù‚Ø±ÙŠØ¨ Ù…Ù† Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡</p>
            <p className="text-2xl font-bold text-warning">{expiringCount}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Ù…Ù†ØªÙ‡ÙŠ</p>
            <p className="text-2xl font-bold text-destructive">{expiredCount}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Ø¢Ø¬Ù„ / Ø¬Ø²Ø¦ÙŠ</p>
            <p className="text-2xl font-bold text-warning">{deferredCount}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¯ÙŠÙˆÙ†ÙŠØ©</p>
            <p className="text-2xl font-bold text-destructive">{totalDebt.toLocaleString()} Ø±.Ø³</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <button className="btn-secondary">
            <Filter className="w-4 h-4" />
            ØªØµÙÙŠØ©
          </button>
          <button className="btn-ghost">
            <Download className="w-4 h-4" />
            ØªØµØ¯ÙŠØ± CSV
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
              Ø§Ù„ÙƒÙ„
            </button>
            <button 
              onClick={() => setFilterStatus('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'active' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              Ù†Ø´Ø·
            </button>
            <button 
              onClick={() => setFilterStatus('expiring_soon')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'expiring_soon' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              Ù‚Ø±ÙŠØ¨ Ù…Ù† Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡
            </button>
            <button 
              onClick={() => setFilterStatus('expired')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'expired' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              Ù…Ù†ØªÙ‡ÙŠ
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
        title="Ø­Ø°Ù Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ"
        message="Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ø§Ø´ØªØ±Ø§ÙƒØŸ Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„ØªØ±Ø§Ø¬Ø¹ Ø¹Ù† Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡."
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

