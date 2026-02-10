import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { DataTable } from '@/components/common/DataTable';
import { ActionsMenu } from '@/components/common/ActionsMenu';
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal';
import { AddServiceModal } from '@/components/services/AddServiceModal';
import { AddUserToServiceModal } from '@/components/services/AddUserToServiceModal';
import { AddDynamicServiceModal } from '@/components/services/dynamic';
import { Plus, Edit, Trash2, Eye, Package, Users, User, Mail, X, ChevronRight, ArrowRight, Zap, Settings2, ToggleLeft, ToggleRight, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Customer } from '@/types';
import { Service, ServiceAccount, ServiceEmail, ServiceUser, ServiceType } from '@/types/services';
import { DynamicService, DYNAMIC_SERVICES_KEY, workflowStageLabels, workflowStageColors } from '@/types/dynamicServices';
import { getCurrencySymbol } from '@/types/currency';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Storage key for services
const SERVICES_STORAGE_KEY = 'app_services';
const CUSTOMERS_STORAGE_KEY = 'app_customers';
const PAYMENT_METHODS_KEY = 'app_payment_methods';

const Services = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [dynamicServices, setDynamicServices] = useState<DynamicService[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<ServiceAccount | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<ServiceEmail | null>(null);
  
  // Active Tab
  const [activeTab, setActiveTab] = useState<'legacy' | 'dynamic'>('legacy');
  
  // Modals
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [isAddDynamicServiceModalOpen, setIsAddDynamicServiceModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isAddEmailModalOpen, setIsAddEmailModalOpen] = useState(false);
  const [isEditEmailModalOpen, setIsEditEmailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'service' | 'account' | 'email' | 'dynamic'; id: string; name: string } | null>(null);
  const [editingDynamicService, setEditingDynamicService] = useState<DynamicService | undefined>();

  // View state
  const [viewMode, setViewMode] = useState<'services' | 'accounts' | 'emails'>('services');

  // Form states
  const [accountForm, setAccountForm] = useState<{ type: ServiceType; subscriberEmail: string }>({ type: 'shared', subscriberEmail: '' });
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [editEmailForm, setEditEmailForm] = useState({ email: '', password: '' });

  // Load data from localStorage on mount
  useEffect(() => {
    const savedServices = localStorage.getItem(SERVICES_STORAGE_KEY);
    if (savedServices) {
      try {
        const parsed = JSON.parse(savedServices);
        const servicesWithDates = parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          accounts: s.accounts.map((a: any) => ({
            ...a,
            createdAt: new Date(a.createdAt),
            sharedEmails: a.sharedEmails.map((e: any) => ({
              ...e,
              addedAt: new Date(e.addedAt),
              users: e.users.map((u: any) => ({
                ...u,
                linkedAt: new Date(u.linkedAt),
              })),
            })),
          })),
        }));
        setServices(servicesWithDates);
      } catch (e) {
        console.error('Error loading services:', e);
      }
    }

    // Load dynamic services
    const savedDynamicServices = localStorage.getItem(DYNAMIC_SERVICES_KEY);
    if (savedDynamicServices) {
      try {
        const parsed = JSON.parse(savedDynamicServices);
        const servicesWithDates = parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        }));
        setDynamicServices(servicesWithDates);
      } catch (e) {
        console.error('Error loading dynamic services:', e);
      }
    }

    const savedCustomers = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (savedCustomers) {
      try {
        const parsed = JSON.parse(savedCustomers);
        const customersWithDates = parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
        }));
        setCustomers(customersWithDates);
      } catch (e) {
        console.error('Error loading customers:', e);
      }
    }

    // Customers are loaded from localStorage only.

    // Load payment methods
    const savedPaymentMethods = localStorage.getItem(PAYMENT_METHODS_KEY);
    if (savedPaymentMethods) {
      try {
        const parsed = JSON.parse(savedPaymentMethods);
        setPaymentMethods(parsed.map((m: any) => m.name));
      } catch (e) {
        console.error('Error loading payment methods:', e);
      }
    }
  }, []);

  // Save services to localStorage
  useEffect(() => {
    if (services.length > 0) {
      localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(services));
    }
  }, [services]);

  // Save dynamic services to localStorage
  useEffect(() => {
    if (dynamicServices.length > 0) {
      localStorage.setItem(DYNAMIC_SERVICES_KEY, JSON.stringify(dynamicServices));
    } else {
      localStorage.removeItem(DYNAMIC_SERVICES_KEY);
    }
  }, [dynamicServices]);

  // Service CRUD
  const handleAddService = (serviceData: Omit<Service, 'id' | 'accounts' | 'createdAt'>) => {
    const newService: Service = {
      ...serviceData,
      id: Date.now().toString(),
      accounts: [],
      createdAt: new Date(),
    };
    setServices([newService, ...services]);
    toast.success('تمت إضافة الخدمة بنجاح');
  };

  // Dynamic Service CRUD
  const handleAddDynamicService = (serviceData: Omit<DynamicService, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingDynamicService) {
      // Update existing
      const updated = dynamicServices.map(s => 
        s.id === editingDynamicService.id 
          ? { ...s, ...serviceData, updatedAt: new Date() }
          : s
      );
      setDynamicServices(updated);
      toast.success('تم تحديث الخدمة بنجاح');
      setEditingDynamicService(undefined);
    } else {
      // Create new
      const newService: DynamicService = {
        ...serviceData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setDynamicServices([newService, ...dynamicServices]);
      toast.success('تمت إضافة الخدمة بنجاح');
    }
  };

  const toggleDynamicServiceStatus = (id: string) => {
    const updated = dynamicServices.map(s => 
      s.id === id ? { ...s, isActive: !s.isActive, updatedAt: new Date() } : s
    );
    setDynamicServices(updated);
    const service = updated.find(s => s.id === id);
    toast.success(service?.isActive ? 'تم تفعيل الخدمة' : 'تم إيقاف الخدمة');
  };

  // Account CRUD
  const handleAddAccount = () => {
    if (!selectedService) return;
    if (accountForm.type === 'private' && !accountForm.subscriberEmail.trim()) return;
    
    const newAccount: ServiceAccount = {
      id: Date.now().toString(),
      type: accountForm.type,
      subscriberEmail: accountForm.type === 'private' ? accountForm.subscriberEmail : undefined,
      sharedEmails: [],
      createdAt: new Date(),
    };
    
    const updatedServices = services.map(s => 
      s.id === selectedService.id 
        ? { ...s, accounts: [newAccount, ...s.accounts] }
        : s
    );
    setServices(updatedServices);
    setSelectedService({ ...selectedService, accounts: [newAccount, ...selectedService.accounts] });
    setAccountForm({ type: selectedService.defaultType, subscriberEmail: '' });
    setIsAddAccountModalOpen(false);
    toast.success('تمت إضافة الحساب بنجاح');
  };

  // Email CRUD
  const handleAddEmail = () => {
    if (!selectedService || !selectedAccount) return;
    if (!emailForm.email.trim()) return;
    
    const newEmail: ServiceEmail = {
      id: Date.now().toString(),
      email: emailForm.email,
      password: emailForm.password,
      users: [],
      addedAt: new Date(),
    };
    
    const updatedServices = services.map(s => {
      if (s.id === selectedService.id) {
        return {
          ...s,
          accounts: s.accounts.map(a => 
            a.id === selectedAccount.id 
              ? { ...a, sharedEmails: [newEmail, ...a.sharedEmails] }
              : a
          ),
        };
      }
      return s;
    });
    
    setServices(updatedServices);
    const updatedService = updatedServices.find(s => s.id === selectedService.id);
    if (updatedService) {
      setSelectedService(updatedService);
      const updatedAccount = updatedService.accounts.find(a => a.id === selectedAccount.id);
      if (updatedAccount) setSelectedAccount(updatedAccount);
    }
    
    setEmailForm({ email: '', password: '' });
    setIsAddEmailModalOpen(false);
    toast.success('تمت إضافة الإيميل بنجاح');
  };

  const handleUpdateEmailCredentials = async () => {
    if (!selectedService || !selectedAccount || !selectedEmail) return;
    if (!editEmailForm.email.trim()) {
      toast.error('يرجى إدخال الإيميل');
      return;
    }
    const updated: ServiceEmail = {
      ...selectedEmail,
      email: editEmailForm.email.trim(),
      password: editEmailForm.password,
    };

    const updatedServices = services.map((s) => {
      if (s.id !== selectedService.id) return s;
      return {
        ...s,
        accounts: s.accounts.map((a) => {
          if (a.id !== selectedAccount.id) return a;
          return {
            ...a,
            sharedEmails: a.sharedEmails.map((e) => (e.id === selectedEmail.id ? updated : e)),
          };
        }),
      };
    });

    setServices(updatedServices);
    const updatedService = updatedServices.find((s) => s.id === selectedService.id);
    if (updatedService) {
      setSelectedService(updatedService);
      const updatedAccount = updatedService.accounts.find((a) => a.id === selectedAccount.id);
      if (updatedAccount) {
        setSelectedAccount(updatedAccount);
        const updatedEmail = updatedAccount.sharedEmails.find((e) => e.id === selectedEmail.id);
        if (updatedEmail) setSelectedEmail(updatedEmail);
      }
    }

    setIsEditEmailModalOpen(false);
    toast.success('تم تحديث بيانات الدخول');
  };

  // User CRUD
  const handleAddUser = (userData: Omit<ServiceUser, 'id' | 'linkedAt'>) => {
    if (!selectedService || !selectedAccount || !selectedEmail) return;
    
    const newUser: ServiceUser = {
      ...userData,
      id: Date.now().toString(),
      linkedAt: new Date(),
    };
    
    const updatedServices = services.map(s => {
      if (s.id === selectedService.id) {
        return {
          ...s,
          accounts: s.accounts.map(a => 
            a.id === selectedAccount.id 
              ? {
                  ...a,
                  sharedEmails: a.sharedEmails.map(e =>
                    e.id === selectedEmail.id
                      ? { ...e, users: [newUser, ...e.users] }
                      : e
                  ),
                }
              : a
          ),
        };
      }
      return s;
    });
    
    setServices(updatedServices);
    const updatedService = updatedServices.find(s => s.id === selectedService.id);
    if (updatedService) {
      setSelectedService(updatedService);
      const updatedAccount = updatedService.accounts.find(a => a.id === selectedAccount.id);
      if (updatedAccount) {
        setSelectedAccount(updatedAccount);
        const updatedEmail = updatedAccount.sharedEmails.find(e => e.id === selectedEmail.id);
        if (updatedEmail) setSelectedEmail(updatedEmail);
      }
    }
    
    toast.success('تمت إضافة المستخدم بنجاح');
  };

  const handleRemoveUser = (userId: string) => {
    if (!selectedService || !selectedAccount || !selectedEmail) return;
    
    const updatedServices = services.map(s => {
      if (s.id === selectedService.id) {
        return {
          ...s,
          accounts: s.accounts.map(a => 
            a.id === selectedAccount.id 
              ? {
                  ...a,
                  sharedEmails: a.sharedEmails.map(e =>
                    e.id === selectedEmail.id
                      ? { ...e, users: e.users.filter(u => u.id !== userId) }
                      : e
                  ),
                }
              : a
          ),
        };
      }
      return s;
    });
    
    setServices(updatedServices);
    const updatedService = updatedServices.find(s => s.id === selectedService.id);
    if (updatedService) {
      setSelectedService(updatedService);
      const updatedAccount = updatedService.accounts.find(a => a.id === selectedAccount.id);
      if (updatedAccount) {
        setSelectedAccount(updatedAccount);
        const updatedEmail = updatedAccount.sharedEmails.find(e => e.id === selectedEmail.id);
        if (updatedEmail) setSelectedEmail(updatedEmail);
      }
    }
    toast.success('تم إزالة المستخدم بنجاح');
  };

  // Delete handlers
  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === 'dynamic') {
      setDynamicServices(dynamicServices.filter(s => s.id !== deleteTarget.id));
      toast.success('تم حذف الخدمة بنجاح');
    } else if (deleteTarget.type === 'service') {
      const updatedServices = services.filter(s => s.id !== deleteTarget.id);
      setServices(updatedServices);
      if (updatedServices.length === 0) {
        localStorage.removeItem(SERVICES_STORAGE_KEY);
      }
      setViewMode('services');
      setSelectedService(null);
    } else if (deleteTarget.type === 'account' && selectedService) {
      const updatedServices = services.map(s => 
        s.id === selectedService.id 
          ? { ...s, accounts: s.accounts.filter(a => a.id !== deleteTarget.id) }
          : s
      );
      setServices(updatedServices);
      const updatedService = updatedServices.find(s => s.id === selectedService.id);
      if (updatedService) setSelectedService(updatedService);
      setViewMode('accounts');
      setSelectedAccount(null);
    } else if (deleteTarget.type === 'email' && selectedService && selectedAccount) {
      const updatedServices = services.map(s => {
        if (s.id === selectedService.id) {
          return {
            ...s,
            accounts: s.accounts.map(a => 
              a.id === selectedAccount.id 
                ? { ...a, sharedEmails: a.sharedEmails.filter(e => e.id !== deleteTarget.id) }
                : a
            ),
          };
        }
        return s;
      });
      setServices(updatedServices);
      const updatedService = updatedServices.find(s => s.id === selectedService.id);
      if (updatedService) {
        setSelectedService(updatedService);
        const updatedAccount = updatedService.accounts.find(a => a.id === selectedAccount.id);
        if (updatedAccount) setSelectedAccount(updatedAccount);
      }
    }
    
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  // Navigation
  const openServiceAccounts = (service: Service) => {
    setSelectedService(service);
    setAccountForm({ type: service.defaultType, subscriberEmail: '' });
    setViewMode('accounts');
  };

  const openAccountEmails = (account: ServiceAccount) => {
    setSelectedAccount(account);
    setViewMode('emails');
  };

  // Dynamic Services Columns
  const dynamicServiceColumns = [
    {
      key: 'name',
      header: 'الخدمة',
      render: (service: DynamicService) => (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            service.isActive ? 'bg-primary/10' : 'bg-muted'
          }`}>
            <Zap className={`w-5 h-5 ${service.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{service.name}</p>
              {!service.isActive && (
                <Badge variant="secondary" className="text-xs">متوقفة</Badge>
              )}
            </div>
            {service.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{service.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'pricing',
      header: 'التسعير',
      render: (service: DynamicService) => (
        <div className="text-sm">
          {service.pricingType === 'fixed' && service.fixedPrice ? (
            <span className="font-medium">
              {service.fixedPrice} {getCurrencySymbol(service.currency)}
            </span>
          ) : service.pricingType === 'dynamic' ? (
            <span className="text-muted-foreground">حسب الإدخال</span>
          ) : (
            <span className="text-muted-foreground">عرض سعر</span>
          )}
        </div>
      ),
    },
    {
      key: 'fields',
      header: 'الحقول',
      render: (service: DynamicService) => (
        <span className="text-muted-foreground text-sm">
          {service.customerFields.length} حقل
        </span>
      ),
    },
    {
      key: 'workflow',
      header: 'المراحل',
      render: (service: DynamicService) => (
        <span className="text-muted-foreground text-sm">
          {service.workflowSteps.filter(s => s.enabled).length} مرحلة
        </span>
      ),
    },
    {
      key: 'payment',
      header: 'الدفع',
      render: (service: DynamicService) => (
        <Badge variant={service.paymentConfig.required ? 'default' : 'secondary'}>
          {service.paymentConfig.required ? 'مطلوب' : 'غير مطلوب'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (service: DynamicService) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleDynamicServiceStatus(service.id)}
            className={`p-2 rounded-lg transition-colors ${
              service.isActive 
                ? 'hover:bg-muted text-success' 
                : 'hover:bg-muted text-muted-foreground'
            }`}
            title={service.isActive ? 'إيقاف الخدمة' : 'تفعيل الخدمة'}
          >
            {service.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <ActionsMenu
            items={[
              {
                label: 'تعديل',
                icon: Edit,
                onClick: () => {
                  setEditingDynamicService(service);
                  setIsAddDynamicServiceModalOpen(true);
                },
              },
              {
                label: 'حذف',
                icon: Trash2,
                onClick: () => {
                  setDeleteTarget({ type: 'dynamic', id: service.id, name: service.name });
                  setIsDeleteModalOpen(true);
                },
                variant: 'danger',
              },
            ]}
          />
        </div>
      ),
      className: 'w-24',
    },
  ];

  // Legacy Service Columns
  const serviceColumns = [
    {
      key: 'name',
      header: 'الخدمة',
      render: (service: Service) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{service.name}</p>
            {service.description && (
              <p className="text-xs text-muted-foreground">{service.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'defaultType',
      header: 'النوع الافتراضي',
      render: (service: Service) => (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${
          service.defaultType === 'shared' 
            ? 'bg-primary/10 text-primary' 
            : 'bg-success/10 text-success'
        }`}>
          {service.defaultType === 'shared' ? (
            <>
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">مشترك</span>
            </>
          ) : (
            <>
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">خاص</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'accounts',
      header: 'الحسابات',
      render: (service: Service) => (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-sm">
            <Users className="w-4 h-4 text-primary" />
            <span>{service.accounts.filter(a => a.type === 'shared').length} مشترك</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <User className="w-4 h-4 text-success" />
            <span>{service.accounts.filter(a => a.type === 'private').length} خاص</span>
          </div>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'تاريخ الإضافة',
      render: (service: Service) => (
        <span className="text-muted-foreground text-sm">
          {service.createdAt.toLocaleDateString('ar-SA')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (service: Service) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openServiceAccounts(service)}
            className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
            title="عرض الحسابات"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <ActionsMenu
            items={[
              {
                label: 'عرض الحسابات',
                icon: Eye,
                onClick: () => openServiceAccounts(service),
              },
              {
                label: 'حذف',
                icon: Trash2,
                onClick: () => {
                  setDeleteTarget({ type: 'service', id: service.id, name: service.name });
                  setIsDeleteModalOpen(true);
                },
                variant: 'danger',
              },
            ]}
          />
        </div>
      ),
      className: 'w-24',
    },
  ];

  const accountColumns = [
    {
      key: 'type',
      header: 'نوع الحساب',
      render: (account: ServiceAccount) => (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            account.type === 'shared' ? 'bg-primary/10' : 'bg-success/10'
          }`}>
            {account.type === 'shared' ? (
              <Users className="w-5 h-5 text-primary" />
            ) : (
              <User className="w-5 h-5 text-success" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">
              {account.type === 'shared' ? 'حساب مشترك' : 'حساب خاص'}
            </p>
            {account.type === 'private' && account.subscriberEmail && (
              <p className="text-xs text-muted-foreground" dir="ltr">{account.subscriberEmail}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'emails',
      header: 'الإيميلات',
      render: (account: ServiceAccount) => (
        <span className="text-muted-foreground">
          {account.type === 'shared' ? `${account.sharedEmails.length} إيميل` : '-'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'تاريخ الإضافة',
      render: (account: ServiceAccount) => (
        <span className="text-muted-foreground text-sm">
          {account.createdAt.toLocaleDateString('ar-SA')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (account: ServiceAccount) => (
        <div className="flex items-center gap-2">
          {account.type === 'shared' && (
            <button
              onClick={() => openAccountEmails(account)}
              className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
              title="عرض الإيميلات"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <ActionsMenu
            items={[
              ...(account.type === 'shared' ? [{
                label: 'إدارة الإيميلات',
                icon: Mail,
                onClick: () => openAccountEmails(account),
              }] : []),
              {
                label: 'حذف',
                icon: Trash2,
                onClick: () => {
                  setDeleteTarget({ 
                    type: 'account', 
                    id: account.id, 
                    name: account.type === 'shared' ? 'الحساب المشترك' : account.subscriberEmail || 'الحساب الخاص'
                  });
                  setIsDeleteModalOpen(true);
                },
                variant: 'danger',
              },
            ]}
          />
        </div>
      ),
      className: 'w-24',
    },
  ];

  const emailColumns = [
    {
      key: 'email',
      header: 'الإيميل',
      render: (email: ServiceEmail) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-accent-foreground" />
          </div>
          <span className="font-medium text-foreground" dir="ltr">{email.email}</span>
        </div>
      ),
    },
    {
      key: 'password',
      header: 'كلمة المرور',
      render: (email: ServiceEmail) => (
        <span className="text-muted-foreground font-mono text-sm" dir="ltr">
          {email.password ? '••••••••' : '-'}
        </span>
      ),
    },
    {
      key: 'users',
      header: 'المستخدمون',
      render: (email: ServiceEmail) => (
        <button
          onClick={() => {
            setSelectedEmail(email);
            setIsUsersModalOpen(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
        >
          <Users className="w-4 h-4 text-primary" />
          <span className="text-primary font-medium">{email.users.length} مستخدم</span>
        </button>
      ),
    },
    {
      key: 'addedAt',
      header: 'تاريخ الإضافة',
      render: (email: ServiceEmail) => (
        <span className="text-muted-foreground text-sm">
          {email.addedAt.toLocaleDateString('ar-SA')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (email: ServiceEmail) => (
        <ActionsMenu
          items={[
            {
              label: 'إدارة المستخدمين',
              icon: Users,
              onClick: () => {
                setSelectedEmail(email);
                setIsUsersModalOpen(true);
              },
            },
            {
              label: 'تحديث الإيميل والباسورد',
              icon: KeyRound,
              onClick: () => {
                setSelectedEmail(email);
                setEditEmailForm({ email: email.email, password: email.password || '' });
                setIsEditEmailModalOpen(true);
              },
            },
            {
              label: 'حذف',
              icon: Trash2,
              onClick: () => {
                setDeleteTarget({ type: 'email', id: email.id, name: email.email });
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

  // Breadcrumb
  const renderBreadcrumb = () => {
    if (viewMode === 'services') return null;
    
    return (
      <div className="flex items-center gap-2 text-sm mb-4">
        <button onClick={() => { setViewMode('services'); setSelectedService(null); setSelectedAccount(null); }} className="text-primary hover:underline">
          الخدمات
        </button>
        {viewMode === 'accounts' && selectedService && (
          <>
            <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
            <span className="text-foreground">{selectedService.name}</span>
          </>
        )}
        {viewMode === 'emails' && selectedService && selectedAccount && (
          <>
            <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
            <button onClick={() => { setViewMode('accounts'); setSelectedAccount(null); }} className="text-primary hover:underline">
              {selectedService.name}
            </button>
            <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
            <span className="text-foreground">حساب مشترك</span>
          </>
        )}
      </div>
    );
  };

  return (
    <MainLayout>
      <Header
        title={
          viewMode === 'services' ? 'الخدمات' :
          viewMode === 'accounts' ? `حسابات ${selectedService?.name}` :
          'إيميلات الحساب المشترك'
        }
        subtitle={
          viewMode === 'services' 
            ? `${dynamicServices.length + services.length} خدمة` 
            : viewMode === 'accounts' 
            ? `${selectedService?.accounts.length || 0} حساب` 
            : `${selectedAccount?.sharedEmails.length || 0} إيميل`
        }
        showAddButton={viewMode !== 'services' || activeTab === 'legacy'}
        addButtonLabel={
          viewMode === 'services' ? 'إضافة خدمة' :
          viewMode === 'accounts' ? 'إضافة حساب' :
          'إضافة إيميل'
        }
        onAddClick={() => {
          if (viewMode === 'services') {
            if (activeTab === 'legacy') {
              setIsAddServiceModalOpen(true);
            }
          } else if (viewMode === 'accounts') {
            setIsAddAccountModalOpen(true);
          } else {
            setIsAddEmailModalOpen(true);
          }
        }}
      >
        {viewMode === 'services' && activeTab === 'dynamic' && (
          <Button onClick={() => setIsAddDynamicServiceModalOpen(true)}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة خدمة ديناميكية
          </Button>
        )}
      </Header>

      <div className="p-6 space-y-6 animate-fade-in">
        {viewMode === 'services' && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'legacy' | 'dynamic')}>
            <TabsList className="mb-4">
              <TabsTrigger value="dynamic" className="gap-2">
                <Zap className="w-4 h-4" />
                الخدمات الديناميكية
              </TabsTrigger>
              <TabsTrigger value="legacy" className="gap-2">
                <Package className="w-4 h-4" />
                الاشتراكات (النظام القديم)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dynamic" className="mt-0">
              {dynamicServices.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-xl border border-border">
                  <Zap className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد خدمات ديناميكية</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    أنشئ خدمات مخصصة بحقول ومراحل وإجراءات مرنة حسب احتياجاتك
                  </p>
                  <Button onClick={() => setIsAddDynamicServiceModalOpen(true)}>
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة خدمة ديناميكية
                  </Button>
                </div>
              ) : (
                <DataTable
                  columns={dynamicServiceColumns}
                  data={dynamicServices}
                  keyExtractor={(s) => s.id}
                />
              )}
            </TabsContent>

            <TabsContent value="legacy" className="mt-0">
              {services.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-xl border border-border">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد خدمات</h3>
                  <p className="text-muted-foreground mb-4">ابدأ بإضافة الخدمات التي تقدمها</p>
                  <button onClick={() => setIsAddServiceModalOpen(true)} className="btn-primary">
                    <Plus className="w-4 h-4" />
                    إضافة خدمة
                  </button>
                </div>
              ) : (
                <DataTable
                  columns={serviceColumns}
                  data={services}
                  keyExtractor={(s) => s.id}
                />
              )}
            </TabsContent>
          </Tabs>
        )}

        {viewMode !== 'services' && renderBreadcrumb()}

        {viewMode === 'accounts' && selectedService && (
          selectedService.accounts.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد حسابات</h3>
              <p className="text-muted-foreground mb-4">أضف حسابات مشتركة أو خاصة لهذه الخدمة</p>
              <button onClick={() => setIsAddAccountModalOpen(true)} className="btn-primary">
                <Plus className="w-4 h-4" />
                إضافة حساب
              </button>
            </div>
          ) : (
            <DataTable
              columns={accountColumns}
              data={selectedService.accounts}
              keyExtractor={(a) => a.id}
            />
          )
        )}

        {viewMode === 'emails' && selectedAccount && (
          selectedAccount.sharedEmails.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد إيميلات</h3>
              <p className="text-muted-foreground mb-4">أضف إيميلات المستخدمين الذين يشاركون هذا الحساب</p>
              <button onClick={() => setIsAddEmailModalOpen(true)} className="btn-primary">
                <Plus className="w-4 h-4" />
                إضافة إيميل
              </button>
            </div>
          ) : (
            <DataTable
              columns={emailColumns}
              data={selectedAccount.sharedEmails}
              keyExtractor={(e) => e.id}
            />
          )
        )}
      </div>

      {/* Add Service Modal (Legacy) */}
      <AddServiceModal
        isOpen={isAddServiceModalOpen}
        onClose={() => setIsAddServiceModalOpen(false)}
        onAdd={handleAddService}
      />

      {/* Add Dynamic Service Modal */}
      <AddDynamicServiceModal
        isOpen={isAddDynamicServiceModalOpen}
        onClose={() => {
          setIsAddDynamicServiceModalOpen(false);
          setEditingDynamicService(undefined);
        }}
        onSave={handleAddDynamicService}
        existingService={editingDynamicService}
        paymentMethods={paymentMethods}
      />

      {/* Add Account Modal */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={() => setIsAddAccountModalOpen(false)} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in border border-border">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">إضافة حساب جديد</h2>
              <button onClick={() => setIsAddAccountModalOpen(false)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">نوع الحساب</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountForm({ ...accountForm, type: 'shared' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      accountForm.type === 'shared'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Users className={`w-6 h-6 mx-auto mb-2 ${accountForm.type === 'shared' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="font-medium text-foreground">مشترك</p>
                    <p className="text-xs text-muted-foreground">حساب واحد لعدة مستخدمين</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountForm({ ...accountForm, type: 'private' })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      accountForm.type === 'private'
                        ? 'border-success bg-success/5'
                        : 'border-border hover:border-success/50'
                    }`}
                  >
                    <User className={`w-6 h-6 mx-auto mb-2 ${accountForm.type === 'private' ? 'text-success' : 'text-muted-foreground'}`} />
                    <p className="font-medium text-foreground">خاص</p>
                    <p className="text-xs text-muted-foreground">حساب خاص بالمشترك</p>
                  </button>
                </div>
              </div>
              {accountForm.type === 'private' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    إيميل المشترك <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    value={accountForm.subscriberEmail}
                    onChange={(e) => setAccountForm({ ...accountForm, subscriberEmail: e.target.value })}
                    placeholder="subscriber@example.com"
                    className="input-field"
                    dir="ltr"
                  />
                </div>
              )}
              <div className="flex items-center gap-3 pt-4">
                <button onClick={handleAddAccount} className="btn-primary flex-1">إضافة الحساب</button>
                <button onClick={() => setIsAddAccountModalOpen(false)} className="btn-secondary">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Email Modal */}
      {isAddEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={() => setIsAddEmailModalOpen(false)} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in border border-border">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">إضافة إيميل مستخدم</h2>
              <button onClick={() => setIsAddEmailModalOpen(false)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  الإيميل <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  value={emailForm.email}
                  onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                  placeholder="user@example.com"
                  className="input-field"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">كلمة المرور (اختياري)</label>
                <input
                  type="text"
                  value={emailForm.password}
                  onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                  placeholder="كلمة المرور للحساب"
                  className="input-field"
                  dir="ltr"
                />
              </div>
              <div className="flex items-center gap-3 pt-4">
                <button onClick={handleAddEmail} className="btn-primary flex-1">إضافة الإيميل</button>
                <button onClick={() => setIsAddEmailModalOpen(false)} className="btn-secondary">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Email Credentials Modal */}
      {isEditEmailModalOpen && selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
            onClick={() => {
              setIsEditEmailModalOpen(false);
            }}
          />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in border border-border">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">تحديث بيانات الدخول</h2>
              <button
                onClick={() => setIsEditEmailModalOpen(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  الإيميل <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  value={editEmailForm.email}
                  onChange={(e) => setEditEmailForm({ ...editEmailForm, email: e.target.value })}
                  placeholder="user@example.com"
                  className="input-field"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">كلمة المرور</label>
                <input
                  type="text"
                  value={editEmailForm.password}
                  onChange={(e) => setEditEmailForm({ ...editEmailForm, password: e.target.value })}
                  placeholder="كلمة المرور للحساب"
                  className="input-field"
                  dir="ltr"
                />
              </div>
              <div className="flex items-center gap-3 pt-4">
                <button onClick={handleUpdateEmailCredentials} className="btn-primary flex-1">
                  حفظ
                </button>
                <button onClick={() => setIsEditEmailModalOpen(false)} className="btn-secondary">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Management Modal */}
      {isUsersModalOpen && selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={() => { setIsUsersModalOpen(false); setSelectedEmail(null); }} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in border border-border max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-bold text-foreground">إدارة المستخدمين</h2>
                <p className="text-sm text-muted-foreground" dir="ltr">{selectedEmail.email}</p>
              </div>
              <button onClick={() => { setIsUsersModalOpen(false); setSelectedEmail(null); }} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {selectedEmail.users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">لا يوجد مستخدمين مرتبطين بهذا الإيميل</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEmail.users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">{user.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{user.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span dir="ltr">{user.email}</span>
                            {user.phone && (
                              <>
                                <span>•</span>
                                <span dir="ltr">{user.phone}</span>
                              </>
                            )}
                            {user.customerId && (
                              <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">عميل مربوط</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveUser(user.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        title="إزالة المستخدم"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-border">
              <button onClick={() => setIsAddUserModalOpen(true)} className="btn-primary w-full">
                <Plus className="w-4 h-4" />
                إضافة مستخدم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <AddUserToServiceModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onAdd={handleAddUser}
        customers={customers}
      />

      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title={`حذف ${deleteTarget?.type === 'service' || deleteTarget?.type === 'dynamic' ? 'الخدمة' : deleteTarget?.type === 'account' ? 'الحساب' : 'الإيميل'}`}
        message="هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء."
        onConfirm={handleDelete}
        onClose={() => { setIsDeleteModalOpen(false); setDeleteTarget(null); }}
      />
    </MainLayout>
  );
};

export default Services;
