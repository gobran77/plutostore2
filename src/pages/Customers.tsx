import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ActionsMenu } from '@/components/common/ActionsMenu';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { AddCustomerAccountModal } from '@/components/customers/AddCustomerAccountModal';
import { AdjustBalanceModal } from '@/components/customers/AdjustBalanceModal';
import { EditCustomerModal } from '@/components/modals/EditCustomerModal';
import { Phone, Filter, Download, Edit, Trash2, Eye, MessageCircle, Key, Copy, Check, Send, Wallet, ExternalLink, UserCheck, UserX, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Customer } from '@/types';
import { CUSTOMER_ACCOUNTS_KEY } from '@/hooks/useCustomerPassword';

type CustomerStatus = 'active' | 'inactive' | 'blocked';

interface CustomerBalances {
  balance_sar: number;
  balance_yer: number;
  balance_usd: number;
}

interface CustomerAccount {
  id: string;
  name: string;
  whatsapp_number: string;
  balance: number;
  currency: string;
  balances: CustomerBalances;
  is_admin: boolean;
  is_activated: boolean;
  activation_code: string | null;
  account_type: string;
  status: CustomerStatus;
  created_at: string;
}

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAccount | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | CustomerStatus>('all');

  // Admin WhatsApp number
  const adminWhatsApp = '201030638992';

  const loadAccounts = (): any[] => {
    try {
      const raw = localStorage.getItem(CUSTOMER_ACCOUNTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveAccounts = (accounts: any[]) => {
    localStorage.setItem(CUSTOMER_ACCOUNTS_KEY, JSON.stringify(accounts));
  };

  const updateCachedCustomers = (customerData: CustomerAccount[]) => {
    const cached: Customer[] = customerData.map((c) => ({
      id: c.id,
      name: c.name,
      email: '',
      whatsapp: c.whatsapp_number,
      currency: c.currency || 'SAR',
      status: c.status,
      createdAt: new Date(c.created_at),
    }));
    localStorage.setItem('app_customers', JSON.stringify(cached));
  };

  const removeFromArrayStorage = (key: string, predicate: (x: any) => boolean) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const next = parsed.filter((x) => !predicate(x));
      if (next.length === 0) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Fetch customers from localStorage
  const fetchCustomers = async () => {
    try {
      const accounts = loadAccounts();
      const customerData: CustomerAccount[] = accounts
        .filter((c: any) => !c?.is_admin && c?.account_type !== 'admin')
        .map((c: any) => {
          const createdAt = c?.created_at ? String(c.created_at) : new Date().toISOString();
          const isActivated = Boolean(c?.is_activated);
          const status: CustomerStatus =
            (c?.status as CustomerStatus) || (isActivated ? 'active' : 'inactive');
          return {
            id: String(c?.id || ''),
            name: String(c?.name || ''),
            whatsapp_number: String(c?.whatsapp_number || ''),
            balance: Number(c?.balance || 0),
            currency: String(c?.currency || 'SAR'),
            balances: {
              balance_sar: Number(c?.balance_sar || 0),
              balance_yer: Number(c?.balance_yer || 0),
              balance_usd: Number(c?.balance_usd || 0),
            },
            is_admin: Boolean(c?.is_admin),
            is_activated: isActivated,
            activation_code: c?.activation_code ?? null,
            account_type: String(c?.account_type || 'customer'),
            status,
            created_at: createdAt,
          };
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setCustomers(customerData);
      updateCachedCustomers(customerData);
    } catch (err) {
      console.error('Error fetching customers:', err);
      toast.error('حدث خطأ في تحميل العملاء');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers based on active tab
  const filteredCustomers = customers.filter(customer => {
    if (activeTab === 'all') return true;
    return customer.status === activeTab;
  });

  // Count by status
  const statusCounts = {
    all: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    inactive: customers.filter(c => c.status === 'inactive').length,
    blocked: customers.filter(c => c.status === 'blocked').length,
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      // Remove from UI immediately for better UX
      setCustomers(prevCustomers => prevCustomers.filter(c => c.id !== selectedCustomer.id));
      setIsDeleteModalOpen(false);

      // Remove from accounts (portal auth + balances)
      const accounts = loadAccounts();
      const nextAccounts = accounts.filter((a: any) => String(a?.id || '') !== String(selectedCustomer.id));
      saveAccounts(nextAccounts);

      // Remove from cached customers list
      removeFromArrayStorage('app_customers', (c) => String(c?.id || '') === String(selectedCustomer.id));

      // Remove all subscriptions for this customer
      removeFromArrayStorage('app_subscriptions', (s) => String(s?.customerId || '') === String(selectedCustomer.id));

      // Remove service requests
      removeFromArrayStorage('app_service_requests', (r) => String(r?.customer_id || '') === String(selectedCustomer.id));

      // Remove tickets + ticket messages
      const ticketIds: string[] = (() => {
        try {
          const raw = localStorage.getItem('app_support_tickets');
          const parsed = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(parsed)) return [];
          return parsed
            .filter((t: any) => String(t?.customer_id || '') === String(selectedCustomer.id))
            .map((t: any) => String(t?.id || ''))
            .filter(Boolean);
        } catch {
          return [];
        }
      })();
      removeFromArrayStorage('app_support_tickets', (t) => String(t?.customer_id || '') === String(selectedCustomer.id));
      if (ticketIds.length > 0) {
        removeFromArrayStorage('app_ticket_messages', (m) => ticketIds.includes(String(m?.ticket_id || '')));
      }

      // Remove invoices/payments that belong to this customer
      removeFromArrayStorage('app_invoices', (inv) => String(inv?.customerId || '') === String(selectedCustomer.id));
      removeFromArrayStorage('app_payments', (pay) => String(pay?.customerId || '') === String(selectedCustomer.id));

      toast.success('تم حذف العميل بنجاح');
      setSelectedCustomer(null);
    } catch (err) {
      console.error('Error deleting customer:', err);
      toast.error('حدث خطأ في حذف العميل');
      fetchCustomers(); // Reload to restore correct state
    }
  };

  const updateCustomerStatus = async (customer: CustomerAccount, newStatus: CustomerStatus) => {
    try {
      const accounts = loadAccounts();
      const idx = accounts.findIndex((a: any) => String(a?.id || '') === String(customer.id));
      if (idx === -1) throw new Error('account_not_found');

      accounts[idx] = {
        ...accounts[idx],
        status: newStatus,
        is_activated: newStatus === 'active',
      };
      saveAccounts(accounts);

      setCustomers(customers.map(c =>
        c.id === customer.id ? { ...c, status: newStatus, is_activated: newStatus === 'active' } : c
      ));
      updateCachedCustomers(
        customers.map(c =>
          c.id === customer.id ? { ...c, status: newStatus, is_activated: newStatus === 'active' } : c
        )
      );
      toast.success(`تم تحديث حالة العميل`);
    } catch (err) {
      console.error('Error updating customer status:', err);
      toast.error('حدث خطأ في تحديث حالة العميل');
    }
  };

  const openDeleteModal = (customer: CustomerAccount) => {
    setSelectedCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  const openEditModal = (customer: CustomerAccount) => {
    setSelectedCustomer(customer);
    setIsEditModalOpen(true);
  };

  const handleSaveCustomer = async (updatedCustomer: Customer) => {
    try {
      const accounts = loadAccounts();
      const idx = accounts.findIndex((a: any) => String(a?.id || '') === String(updatedCustomer.id));
      if (idx === -1) throw new Error('account_not_found');
      accounts[idx] = {
        ...accounts[idx],
        name: updatedCustomer.name,
        whatsapp_number: String(updatedCustomer.whatsapp || '').replace(/\D/g, ''),
        currency: updatedCustomer.currency,
        status: updatedCustomer.status,
        is_activated: updatedCustomer.status === 'active',
      };
      saveAccounts(accounts);

      const next = customers.map(c => 
        c.id === updatedCustomer.id ? { 
          ...c, 
          name: updatedCustomer.name,
          whatsapp_number: String(updatedCustomer.whatsapp || '').replace(/\D/g, ''),
          currency: updatedCustomer.currency,
          status: updatedCustomer.status,
          is_activated: updatedCustomer.status === 'active',
        } : c
      );

      setCustomers(next);
      updateCachedCustomers(next);

      toast.success('تم تحديث بيانات العميل بنجاح');
    } catch (err) {
      console.error('Error updating customer:', err);
      toast.error('حدث خطأ في تحديث بيانات العميل');
    }
  };

  const copyActivationCode = (code: string, customerId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(customerId);
    toast.success('تم نسخ كود التفعيل');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendActivationCodeWhatsApp = (customer: CustomerAccount) => {
    if (!customer.activation_code) {
      toast.error('لا يوجد كود تفعيل');
      return;
    }

    const message = encodeURIComponent(
      `مرحباً ${customer.name}،\n\n` +
      `كود تفعيل حسابك في بلوتو ستور AI:\n\n` +
      `🔑 الكود: ${customer.activation_code}\n\n` +
      `رابط التفعيل: ${window.location.origin}/customer/activate\n\n` +
      `بعد التفعيل يمكنك الدخول من:\n` +
      `${window.location.origin}/customer`
    );
    
    window.open(`https://wa.me/${customer.whatsapp_number.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const activateCustomer = async (customer: CustomerAccount) => {
    try {
      const accounts = loadAccounts();
      const idx = accounts.findIndex((a: any) => String(a?.id || '') === String(customer.id));
      if (idx === -1) throw new Error('account_not_found');

      accounts[idx] = {
        ...accounts[idx],
        is_activated: true,
        status: 'active',
      };
      saveAccounts(accounts);

      const next = customers.map(c =>
        c.id === customer.id ? { ...c, is_activated: true, status: 'active' } : c
      );
      setCustomers(next);
      updateCachedCustomers(next);
      toast.success('تم تفعيل الحساب بنجاح');
    } catch (err) {
      console.error('Error activating customer:', err);
      toast.error('حدث خطأ في تفعيل الحساب');
    }
  };

  const openBalanceModal = (customer: CustomerAccount) => {
    setSelectedCustomer(customer);
    setIsBalanceModalOpen(true);
  };

  const viewAsCustomer = (customer: CustomerAccount) => {
    // Set customer session so admin can view customer dashboard
    localStorage.setItem('customer_session', JSON.stringify({
      id: customer.id,
      name: customer.name,
      whatsapp_number: customer.whatsapp_number,
      balance: customer.balance,
      currency: customer.currency,
      balances: customer.balances,
    }));
    navigate('/customer/dashboard');
  };

  // Convert CustomerAccount to Customer for EditCustomerModal
  const selectedCustomerForEdit: Customer | null = selectedCustomer ? {
    id: selectedCustomer.id,
    name: selectedCustomer.name,
    email: '', // Not stored in customer_accounts
    whatsapp: selectedCustomer.whatsapp_number,
    currency: selectedCustomer.currency,
    status: selectedCustomer.status,
    createdAt: new Date(selectedCustomer.created_at),
  } : null;

  const columns = [
    {
      key: 'name',
      header: 'العميل',
      render: (customer: CustomerAccount) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
            <span className="text-sm font-medium text-primary-foreground">
              {customer.name.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">{customer.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" />
              <span dir="ltr">{customer.whatsapp_number}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'balance',
      header: 'الأرصدة',
      render: (customer: CustomerAccount) => (
        <button 
          onClick={() => openBalanceModal(customer)}
          className="text-right hover:bg-muted/50 p-1 rounded transition-colors"
        >
          <div className="grid grid-cols-3 gap-1 text-xs">
            <span className={customer.balances.balance_sar < 0 ? 'text-destructive' : ''}>
              {customer.balances.balance_sar.toLocaleString()} <span className="text-muted-foreground">SAR</span>
            </span>
            <span className={customer.balances.balance_yer < 0 ? 'text-destructive' : ''}>
              {customer.balances.balance_yer.toLocaleString()} <span className="text-muted-foreground">YER</span>
            </span>
            <span className={customer.balances.balance_usd < 0 ? 'text-destructive' : ''}>
              {customer.balances.balance_usd.toLocaleString()} <span className="text-muted-foreground">USD</span>
            </span>
          </div>
        </button>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (customer: CustomerAccount) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={customer.status} />
          {!customer.is_activated && (
            <span className="text-xs text-warning">غير مفعل</span>
          )}
        </div>
      ),
    },
    {
      key: 'activation_code',
      header: 'كود التفعيل',
      render: (customer: CustomerAccount) => (
        <div className="flex items-center gap-2">
          {customer.activation_code ? (
            <>
              <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                {customer.activation_code}
              </code>
              <button
                onClick={() => copyActivationCode(customer.activation_code!, customer.id)}
                className="p-1 hover:bg-muted rounded"
              >
                {copiedId === customer.id ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {!customer.is_activated && (
                <button
                  onClick={() => sendActivationCodeWhatsApp(customer)}
                  className="p-1 hover:bg-success/10 rounded text-success"
                  title="إرسال عبر واتساب"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'تاريخ الإنشاء',
      render: (customer: CustomerAccount) => (
        <span className="text-muted-foreground text-sm">
          {new Date(customer.created_at).toLocaleDateString('ar-SA')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (customer: CustomerAccount) => (
        <ActionsMenu
          items={[
            {
              label: 'الدخول للحساب',
              icon: ExternalLink,
              onClick: () => viewAsCustomer(customer),
            },
            {
              label: 'تعديل البيانات',
              icon: Edit,
              onClick: () => openEditModal(customer),
            },
            {
              label: 'تعديل الرصيد',
              icon: Wallet,
              onClick: () => openBalanceModal(customer),
            },
            ...(!customer.is_activated ? [{
              label: 'تفعيل الحساب',
              icon: Key,
              onClick: () => activateCustomer(customer),
            }] : []),
            ...(customer.activation_code && !customer.is_activated ? [{
              label: 'إرسال كود التفعيل',
              icon: MessageCircle,
              onClick: () => sendActivationCodeWhatsApp(customer),
            }] : []),
            // Status change actions
            ...(customer.status !== 'active' ? [{
              label: 'تنشيط العميل',
              icon: UserCheck,
              onClick: () => updateCustomerStatus(customer, 'active'),
            }] : []),
            ...(customer.status !== 'inactive' ? [{
              label: 'إيقاف العميل',
              icon: UserX,
              onClick: () => updateCustomerStatus(customer, 'inactive'),
            }] : []),
            ...(customer.status !== 'blocked' ? [{
              label: 'حظر العميل',
              icon: Ban,
              onClick: () => updateCustomerStatus(customer, 'blocked'),
              variant: 'danger' as const,
            }] : []),
            {
              label: 'حذف',
              icon: Trash2,
              onClick: () => openDeleteModal(customer),
              variant: 'danger' as const,
            },
          ]}
        />
      ),
      className: 'w-12',
    },
  ];

  return (
    <MainLayout>
      <Header
        title="العملاء"
        subtitle={`${customers.length} عميل مسجل`}
        showAddButton
        addButtonLabel="إضافة عميل"
        onAddClick={() => setIsAddModalOpen(true)}
      />

      <div className="p-6 space-y-6 animate-fade-in">
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
        </div>

        {/* Status Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="all" className="flex items-center gap-2">
              الكل
              <span className="px-2 py-0.5 text-xs rounded-full bg-muted">
                {statusCounts.all}
              </span>
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-success" />
              نشط
              <span className="px-2 py-0.5 text-xs rounded-full bg-success/20 text-success">
                {statusCounts.active}
              </span>
            </TabsTrigger>
            <TabsTrigger value="inactive" className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-warning" />
              موقوف
              <span className="px-2 py-0.5 text-xs rounded-full bg-warning/20 text-warning">
                {statusCounts.inactive}
              </span>
            </TabsTrigger>
            <TabsTrigger value="blocked" className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-destructive" />
              محظور
              <span className="px-2 py-0.5 text-xs rounded-full bg-destructive/20 text-destructive">
                {statusCounts.blocked}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Info Box */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-foreground">
            💡 العملاء يسجلون من صفحة <code className="px-1 bg-muted rounded">/customer/register</code> ويحصلون على كود تفعيل. أرسل الكود عبر واتساب لتفعيل حساباتهم.
          </p>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredCustomers}
            keyExtractor={(customer) => customer.id}
            emptyMessage={
              activeTab === 'all' 
                ? 'لا يوجد عملاء مسجلين' 
                : activeTab === 'active'
                ? 'لا يوجد عملاء نشطين'
                : activeTab === 'inactive'
                ? 'لا يوجد عملاء موقوفين'
                : 'لا يوجد عملاء محظورين'
            }
          />
        )}
      </div>

      {/* Add Customer Modal */}
      <AddCustomerAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchCustomers}
      />

      {/* Edit Customer Modal */}
      <EditCustomerModal
        isOpen={isEditModalOpen}
        customer={selectedCustomerForEdit}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCustomer(null);
        }}
        onSave={handleSaveCustomer}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title="حذف العميل"
        message="هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء."
        itemName={selectedCustomer?.name}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedCustomer(null);
        }}
        onConfirm={handleDeleteCustomer}
      />

      {/* Adjust Balance Modal */}
      <AdjustBalanceModal
        isOpen={isBalanceModalOpen}
        onClose={() => {
          setIsBalanceModalOpen(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        onSuccess={fetchCustomers}
      />
    </MainLayout>
  );
};

export default Customers;
