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
import { loadInvoices, saveInvoices, updateInvoice, deleteInvoice } from '@/utils/invoicePaymentUtils';

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
    setInvoices(loadInvoices());

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
    toast.success('ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø¨Ù†Ø¬Ø§Ø­');
  };

  const handleEditInvoice = (updatedInvoice: Invoice) => {
    setInvoices(invoices.map(inv => 
      inv.id === updatedInvoice.id ? updatedInvoice : inv
    ));
    updateInvoice(updatedInvoice);
    toast.success('ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø¨Ù†Ø¬Ø§Ø­');
  };

  const handleDeleteInvoice = () => {
    if (selectedInvoice) {
      const updated = invoices.filter(inv => inv.id !== selectedInvoice.id);
      setInvoices(updated);
      deleteInvoice(selectedInvoice.id);
      toast.success('ØªÙ… Ø­Ø°Ù Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø¨Ù†Ø¬Ø§Ø­');
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
      header: 'Ø§Ù„ÙØ§ØªÙˆØ±Ø©',
      render: (invoice: Invoice) => (
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{invoice.invoiceNumber}</p>
            <p className="text-xs text-muted-foreground">
              {invoice.issuedAt.toLocaleDateString('ar-SA-u-ca-gregory')}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Ø§Ù„Ø¹Ù…ÙŠÙ„',
      render: (invoice: Invoice) => (
        <span className="text-foreground">{invoice.customerName}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Ø§Ù„Ù…Ø¨Ù„Øº',
      render: (invoice: Invoice) => (
        <div>
          <p className="font-semibold text-foreground">
            {invoice.amount.toLocaleString()} {invoice.currency}
          </p>
          {invoice.discount > 0 && (
            <p className="text-xs text-success">Ø®ØµÙ…: {invoice.discount}</p>
          )}
        </div>
      ),
    },
    {
      key: 'tax',
      header: 'Ø§Ù„Ø¶Ø±ÙŠØ¨Ø©',
      render: (invoice: Invoice) => (
        <span className="text-muted-foreground">{invoice.tax} {invoice.currency}</span>
      ),
    },
    {
      key: 'total',
      header: 'Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ',
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
      header: 'ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ø³ØªØ­Ù‚Ø§Ù‚',
      render: (invoice: Invoice) => {
        const isOverdue = invoice.status !== 'paid' && new Date(invoice.dueAt) < new Date();
        return (
          <span className={isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}>
            {invoice.dueAt.toLocaleDateString('ar-SA-u-ca-gregory')}
            {isOverdue && ' (Ù…ØªØ£Ø®Ø±)'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Ø§Ù„Ø­Ø§Ù„Ø©',
      render: (invoice: Invoice) => <StatusBadge status={invoice.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (invoice: Invoice) => (
        <ActionsMenu
          items={[
            {
              label: 'Ø¹Ø±Ø¶ Ø§Ù„ØªÙØ§ØµÙŠÙ„',
              icon: Eye,
              onClick: () => console.log('View:', invoice),
            },
            {
              label: 'ØªØ¹Ø¯ÙŠÙ„',
              icon: Edit,
              onClick: () => {
                setSelectedInvoice(invoice);
                setIsEditModalOpen(true);
              },
            },
            {
              label: 'ØªØ­Ù…ÙŠÙ„ PDF',
              icon: Download,
              onClick: () => toast.info('Ø³ØªØªÙˆÙØ± Ù‡Ø°Ù‡ Ø§Ù„Ù…ÙŠØ²Ø© Ù‚Ø±ÙŠØ¨Ø§Ù‹'),
            },
            {
              label: 'Ø­Ø°Ù',
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
        title="Ø§Ù„ÙÙˆØ§ØªÙŠØ±"
        subtitle={`${invoices.length} ÙØ§ØªÙˆØ±Ø©`}
        showAddButton
        addButtonLabel="Ø¥Ù†Ø´Ø§Ø¡ ÙØ§ØªÙˆØ±Ø©"
        onAddClick={() => setIsAddModalOpen(true)}
      />

      <div className="p-6 space-y-6 animate-fade-in">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙÙˆØ§ØªÙŠØ±</p>
            <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø©</p>
            <p className="text-2xl font-bold text-success">{totalPaid.toLocaleString()} Ø±.Ø³</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">ØºÙŠØ± Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø©</p>
            <p className="text-2xl font-bold text-destructive">{totalUnpaid.toLocaleString()} Ø±.Ø³</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Ù…ØªØ£Ø®Ø±Ø©</p>
            <p className="text-2xl font-bold text-warning">{overdueCount}</p>
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
            ØªØµØ¯ÙŠØ±
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
              onClick={() => setFilterStatus('paid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'paid' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              Ù…Ø¯ÙÙˆØ¹Ø©
            </button>
            <button 
              onClick={() => setFilterStatus('unpaid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'unpaid' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              ØºÙŠØ± Ù…Ø¯ÙÙˆØ¹Ø©
            </button>
            <button 
              onClick={() => setFilterStatus('partially_paid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'partially_paid' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              Ù…Ø¯ÙÙˆØ¹Ø© Ø¬Ø²Ø¦ÙŠØ§Ù‹
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
        title="Ø­Ø°Ù Ø§Ù„ÙØ§ØªÙˆØ±Ø©"
        message="Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ù‡Ø°Ù‡ Ø§Ù„ÙØ§ØªÙˆØ±Ø©ØŸ Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„ØªØ±Ø§Ø¬Ø¹ Ø¹Ù† Ù‡Ø°Ø§ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡."
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

