import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { DataTable } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ActionsMenu } from '@/components/common/ActionsMenu';
import { AddInvoiceModal } from '@/components/modals/AddInvoiceModal';
import { EditInvoiceModal } from '@/components/modals/EditInvoiceModal';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { Invoice, Customer } from '@/types';
import { FileText, Download, Filter, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteInvoice,
  hydrateInvoicePaymentStorageFromCloud,
  loadInvoices,
  saveInvoices,
  updateInvoice,
} from '@/utils/invoicePaymentUtils';

const CUSTOMERS_STORAGE_KEY = 'app_customers';

type FilterStatus = 'all' | 'paid' | 'unpaid' | 'partially_paid';

const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Load data from localStorage
  useEffect(() => {
    const bootstrap = async () => {
      await hydrateInvoicePaymentStorageFromCloud();
      setInvoices(loadInvoices());
    };
    bootstrap().catch((error) => {
      console.error('Failed to initialize invoices from cloud:', error);
      setInvoices(loadInvoices());
    });

    const savedCustomers = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (savedCustomers) {
      try {
        const parsed = JSON.parse(savedCustomers);
        setCustomers(parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
        })));
      } catch (e) {
        console.error('Error loading customers:', e);
      }
    }
  }, []);

  const handleAddInvoice = (invoiceData: Omit<Invoice, 'id'>) => {
    const newInvoice: Invoice = {
      ...invoiceData,
      id: `inv_${Date.now()}`,
    };
    const updated = [newInvoice, ...invoices];
    setInvoices(updated);
    saveInvoices(updated);
    toast.success('تم إنشاء الفاتورة بنجاح');
  };

  const handleEditInvoice = (updatedInvoice: Invoice) => {
    setInvoices(invoices.map(inv => 
      inv.id === updatedInvoice.id ? updatedInvoice : inv
    ));
    updateInvoice(updatedInvoice);
    toast.success('تم تحديث الفاتورة بنجاح');
  };

  const handleDeleteInvoice = () => {
    if (selectedInvoice) {
      const updated = invoices.filter(inv => inv.id !== selectedInvoice.id);
      setInvoices(updated);
      deleteInvoice(selectedInvoice.id);
      toast.success('تم حذف الفاتورة بنجاح');
      setIsDeleteModalOpen(false);
      setSelectedInvoice(null);
    }
  };

  // Filter invoices
  const filteredInvoices = filterStatus === 'all'
    ? invoices
    : invoices.filter(inv => inv.status === filterStatus);

  const columns = [
    {
      key: 'invoice',
      header: 'الفاتورة',
      render: (invoice: Invoice) => (
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{invoice.invoiceNumber}</p>
            <p className="text-xs text-muted-foreground">
              {invoice.issuedAt.toLocaleDateString('ar-SA')}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'العميل',
      render: (invoice: Invoice) => (
        <span className="text-foreground">{invoice.customerName}</span>
      ),
    },
    {
      key: 'amount',
      header: 'المبلغ',
      render: (invoice: Invoice) => (
        <div>
          <p className="font-semibold text-foreground">
            {invoice.amount.toLocaleString()} {invoice.currency}
          </p>
          {invoice.discount > 0 && (
            <p className="text-xs text-success">خصم: {invoice.discount}</p>
          )}
        </div>
      ),
    },
    {
      key: 'tax',
      header: 'الضريبة',
      render: (invoice: Invoice) => (
        <span className="text-muted-foreground">{invoice.tax} {invoice.currency}</span>
      ),
    },
    {
      key: 'total',
      header: 'الإجمالي',
      render: (invoice: Invoice) => {
        const total = invoice.amount + invoice.tax - invoice.discount;
        return (
          <span className="font-bold text-foreground">
            {total.toLocaleString()} {invoice.currency}
          </span>
        );
      },
    },
    {
      key: 'dueAt',
      header: 'تاريخ الاستحقاق',
      render: (invoice: Invoice) => {
        const isOverdue = invoice.status !== 'paid' && new Date(invoice.dueAt) < new Date();
        return (
          <span className={isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}>
            {invoice.dueAt.toLocaleDateString('ar-SA')}
            {isOverdue && ' (متأخر)'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (invoice: Invoice) => <StatusBadge status={invoice.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (invoice: Invoice) => (
        <ActionsMenu
          items={[
            {
              label: 'عرض التفاصيل',
              icon: Eye,
              onClick: () => console.log('View:', invoice),
            },
            {
              label: 'تعديل',
              icon: Edit,
              onClick: () => {
                setSelectedInvoice(invoice);
                setIsEditModalOpen(true);
              },
            },
            {
              label: 'تحميل PDF',
              icon: Download,
              onClick: () => toast.info('ستتوفر هذه الميزة قريباً'),
            },
            {
              label: 'حذف',
              icon: Trash2,
              onClick: () => {
                setSelectedInvoice(invoice);
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

  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalUnpaid = invoices.filter((i) => i.status === 'unpaid').reduce((sum, i) => sum + i.amount, 0);
  const totalPartial = invoices.filter((i) => i.status === 'partially_paid').reduce((sum, i) => sum + i.amount, 0);
  const overdueCount = invoices.filter(i => i.status !== 'paid' && new Date(i.dueAt) < new Date()).length;

  return (
    <MainLayout>
      <Header
        title="الفواتير"
        subtitle={`${invoices.length} فاتورة`}
        showAddButton
        addButtonLabel="إنشاء فاتورة"
        onAddClick={() => setIsAddModalOpen(true)}
      />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">إجمالي الفواتير</p>
            <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">المدفوعة</p>
            <p className="text-2xl font-bold text-success">{totalPaid.toLocaleString()} ر.س</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">غير المدفوعة</p>
            <p className="text-2xl font-bold text-destructive">{totalUnpaid.toLocaleString()} ر.س</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">متأخرة</p>
            <p className="text-2xl font-bold text-warning">{overdueCount}</p>
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
            تصدير
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
              onClick={() => setFilterStatus('paid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'paid' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              مدفوعة
            </button>
            <button 
              onClick={() => setFilterStatus('unpaid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'unpaid' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              غير مدفوعة
            </button>
            <button 
              onClick={() => setFilterStatus('partially_paid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'partially_paid' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              مدفوعة جزئياً
            </button>
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filteredInvoices}
          keyExtractor={(invoice) => invoice.id}
        />
      </div>

      {/* Add Invoice Modal */}
      <AddInvoiceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddInvoice}
        customers={customers}
      />

      {/* Edit Invoice Modal */}
      <EditInvoiceModal
        isOpen={isEditModalOpen}
        invoice={selectedInvoice}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedInvoice(null);
        }}
        onSave={handleEditInvoice}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title="حذف الفاتورة"
        message="هل أنت متأكد من حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء."
        itemName={selectedInvoice?.invoiceNumber}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedInvoice(null);
        }}
        onConfirm={handleDeleteInvoice}
      />
    </MainLayout>
  );
};

export default Invoices;
