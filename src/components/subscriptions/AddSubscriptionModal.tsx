import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, CreditCard, Building2, Wallet, Banknote, Mail } from 'lucide-react';
import { Customer, SubscriptionService, Subscription, PaymentStatus, SubscriptionPaymentMethod } from '@/types';
import { Service } from '@/types/services';
import { CustomerSearchSelect } from './CustomerSearchSelect';
import { PaymentMethodType } from '@/components/modals/PaymentMethodsModal';
import { toast } from 'sonner';

// Subscription types
const subscriptionTypes = [
  { value: 'private', label: 'خاص' },
  { value: 'shared', label: 'مشترك' },
];

interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (subscription: Omit<Subscription, 'id' | 'status'>) => void;
  initialSubscription?: Subscription | null;
  customers: Customer[];
  services: Service[];
  paymentMethods: PaymentMethodType[];
}

interface AvailableSlot {
  id: string;
  email: string | null;
  slot_name: string | null;
  account_id: string;
  is_available: boolean;
  assigned_customer_id?: string | null;
  accountName?: string;
  subscriptionsCount?: number;
  password?: string | null;
}

const currencies = [
  { code: 'SAR', name: 'ريال سعودي' },
  { code: 'YER', name: 'ريال يمني' },
  { code: 'USD', name: 'دولار أمريكي' },
  { code: 'AED', name: 'درهم إماراتي' },
];

const durations = [
  { value: 7, label: 'أسبوع' },
  { value: 14, label: 'أسبوعين' },
  { value: 30, label: 'شهر' },
  { value: 60, label: 'شهرين' },
  { value: 90, label: '3 أشهر' },
  { value: 180, label: '6 أشهر' },
  { value: 365, label: 'سنة' },
];

const deferredDays = [
  { value: 1, label: 'يوم واحد' },
  { value: 2, label: 'يومين' },
  { value: 3, label: '3 أيام' },
  { value: 5, label: '5 أيام' },
  { value: 7, label: 'أسبوع' },
  { value: 14, label: 'أسبوعين' },
  { value: 30, label: 'شهر' },
];

const formatDateInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value: string): Date | null => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const buildEndDateFromStartAndDuration = (startValue: string, durationDays: number): string => {
  const start = parseDateInput(startValue) || new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(1, Number(durationDays || 1)));
  return formatDateInput(end);
};

const buildDurationFromDates = (startValue: string, endValue: string): number => {
  const start = parseDateInput(startValue);
  const end = parseDateInput(endValue);
  if (!start || !end) return 1;
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return Math.max(1, diffDays);
};

const getMethodIcon = (type: string) => {
  switch (type) {
    case 'bank': return Building2;
    case 'wallet': return Wallet;
    case 'card': return CreditCard;
    case 'cash': return Banknote;
    default: return CreditCard;
  }
};

export const AddSubscriptionModal = ({
  isOpen, 
  onClose, 
  onAdd, 
  initialSubscription,
  customers,
  services,
  paymentMethods 
}: AddSubscriptionModalProps) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType | null>(null);
  const [formData, setFormData] = useState({
    duration: 30,
    autoRenew: true,
    currency: 'SAR',
    discount: 0,
    paymentStatus: 'paid' as PaymentStatus,
    paidAmount: 0,
    deferredDays: 2,
    paymentNotes: '',
    subscriptionType: 'private',
  });
  const [startDateInput, setStartDateInput] = useState<string>(formatDateInput(new Date()));
  const [endDateInput, setEndDateInput] = useState<string>(
    buildEndDateFromStartAndDuration(formatDateInput(new Date()), 30)
  );

  // Shared subscription state
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  // Legacy selection (UI).
  const [selectedLegacySharedServiceId, setSelectedLegacySharedServiceId] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  const [subscriptionServices, setSubscriptionServices] = useState<SubscriptionService[]>([
    { id: '1', serviceName: '', price: 0, cost: 0 }
  ]);

  const sharedServiceSelectOptions = (() => {
    const filtered = services.filter((s) =>
      s.defaultType === 'shared' || (Array.isArray(s.accounts) && s.accounts.some((a) => a.type === 'shared'))
    );
    return filtered.length > 0 ? filtered : services;
  })();

  const privateServiceSelectOptions = (() => {
    const filtered = services.filter((s) =>
      s.defaultType === 'private' || (Array.isArray(s.accounts) && s.accounts.some((a) => a.type === 'private'))
    );
    return filtered.length > 0 ? filtered : services;
  })();

  const isEditing = Boolean(initialSubscription);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialSubscription) {
        const matchedCustomer = customers.find((c) => c.id === initialSubscription.customerId) || null;
        const matchedPaymentMethod =
          paymentMethods.find((method) => method.id === initialSubscription.paymentMethod?.id) || null;
        const startValue = formatDateInput(new Date(initialSubscription.startDate));
        const endValue = formatDateInput(new Date(initialSubscription.endDate));
        const dueValue = initialSubscription.dueDate
          ? formatDateInput(new Date(initialSubscription.dueDate))
          : '';

        setSelectedCustomer(matchedCustomer);
        setSelectedPaymentMethod(matchedPaymentMethod);
        setFormData({
          duration: buildDurationFromDates(startValue, endValue),
          autoRenew: initialSubscription.autoRenew,
          currency: initialSubscription.currency || matchedCustomer?.currency || 'SAR',
          discount: Number(initialSubscription.discount || 0),
          paymentStatus: initialSubscription.paymentStatus,
          paidAmount: Number(initialSubscription.paidAmount || 0),
          deferredDays: dueValue ? buildDurationFromDates(startValue, dueValue) : 2,
          paymentNotes: initialSubscription.paymentNotes || '',
          subscriptionType: initialSubscription.subscriptionType || 'private',
        });
        setStartDateInput(startValue);
        setEndDateInput(endValue);
        setSubscriptionServices(
          Array.isArray(initialSubscription.services) && initialSubscription.services.length > 0
            ? initialSubscription.services.map((service, index) => ({
                ...service,
                id: service.id || `${index + 1}`,
              }))
            : [{ id: '1', serviceName: '', price: 0, cost: 0 }]
        );
        setSelectedLegacySharedServiceId(initialSubscription.services?.[0]?.serviceId || '');
        setSelectedSlotId(initialSubscription.slotId || '');
        setAvailableSlots([]);
        return;
      }

      const today = formatDateInput(new Date());
      setSelectedCustomer(null);
      setSelectedPaymentMethod(null);
      setFormData({
        duration: 30,
        autoRenew: true,
        currency: 'SAR',
        discount: 0,
        paymentStatus: 'paid',
        paidAmount: 0,
        deferredDays: 2,
        paymentNotes: '',
        subscriptionType: 'private',
      });
      setStartDateInput(today);
      setEndDateInput(buildEndDateFromStartAndDuration(today, 30));
      setSubscriptionServices([{ id: '1', serviceName: '', price: 0, cost: 0 }]);
      setSelectedLegacySharedServiceId('');
      setSelectedSlotId('');
      setAvailableSlots([]);
    }
  }, [isOpen, initialSubscription, customers, paymentMethods]);

  // Derive "shared slots" from legacy services in localStorage.
  useEffect(() => {
    if (formData.subscriptionType !== 'shared') return;
    if (!selectedLegacySharedServiceId) {
      setAvailableSlots([]);
      setSelectedSlotId('');
      return;
    }

    const legacyService = services.find((s) => s.id === selectedLegacySharedServiceId);
    const sharedAccounts = legacyService?.accounts?.filter((a: any) => a?.type === 'shared') || [];
    const sharedEmails = sharedAccounts.flatMap((a: any) => Array.isArray(a?.sharedEmails) ? a.sharedEmails : []);

    const slots: AvailableSlot[] = sharedEmails.map((e: any) => ({
      id: String(e?.id || ''),
      email: e?.email ? String(e.email) : null,
      password: e?.password ? String(e.password) : null,
      slot_name: null,
      account_id: sharedAccounts[0]?.id ? String(sharedAccounts[0].id) : 'legacy',
      is_available: true,
      assigned_customer_id: null,
      accountName: 'الحساب المشترك',
      subscriptionsCount: Array.isArray(e?.users) ? e.users.length : 0,
    })).filter((s) => s.id.length > 0);

    setAvailableSlots(slots);
    setSelectedSlotId('');
  }, [formData.subscriptionType, selectedLegacySharedServiceId, services]);

  // Auto-fill service when shared service is selected
  useEffect(() => {
    if (formData.subscriptionType === 'shared' && selectedLegacySharedServiceId) {
      const legacyService = services.find(s => s.id === selectedLegacySharedServiceId);
      if (legacyService) {
        const matchingPricing = legacyService.pricing?.find((p: any) => p.periodDays === formData.duration && String(p.currency || '') === String(formData.currency));
        const fallbackPricing = legacyService.pricing?.find((p: any) => p.periodDays === formData.duration);
        setSubscriptionServices([{
          id: '1',
          serviceId: legacyService.id,
          serviceName: legacyService.name,
          price: matchingPricing?.sellPrice || fallbackPricing?.sellPrice || 0,
          cost: matchingPricing?.buyPrice || fallbackPricing?.buyPrice || 0,
        }]);
      }
    }
  }, [selectedLegacySharedServiceId, formData.duration, formData.subscriptionType, services, formData.currency]);

  // Update currency based on selected customer
  useEffect(() => {
    if (selectedCustomer) {
      setFormData(prev => ({ ...prev, currency: selectedCustomer.currency }));
    }
  }, [selectedCustomer]);

  // Update prices when duration changes
  useEffect(() => {
    setSubscriptionServices(prev => prev.map(service => {
      if (service.serviceId) {
        const matchedService = services.find(s => s.id === service.serviceId);
        if (matchedService) {
          const matchingPricing = matchedService.pricing?.find(p => p.periodDays === formData.duration);
          if (matchingPricing) {
            return { ...service, price: matchingPricing.sellPrice, cost: matchingPricing.buyPrice };
          }
        }
      }
      return service;
    }));
  }, [formData.duration, services]);

  useEffect(() => {
    setEndDateInput(buildEndDateFromStartAndDuration(startDateInput, formData.duration));
  }, [startDateInput, formData.duration]);

  // Early return AFTER all hooks
  if (!isOpen) return null;

  const startDate = parseDateInput(startDateInput) || new Date();
  const endDate = parseDateInput(endDateInput) || new Date(startDate);
  const dueDate = formData.paymentStatus === 'deferred' 
    ? new Date(startDate.getTime() + formData.deferredDays * 24 * 60 * 60 * 1000)
    : undefined;

  const addService = () => {
    setSubscriptionServices([
      ...subscriptionServices,
      { id: Date.now().toString(), serviceName: '', price: 0, cost: 0 }
    ]);
  };

  const removeService = (id: string) => {
    if (subscriptionServices.length > 1) {
      setSubscriptionServices(subscriptionServices.filter(s => s.id !== id));
    }
  };

  const updateService = (id: string, field: keyof SubscriptionService, value: string | number) => {
    setSubscriptionServices(subscriptionServices.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const selectExistingService = (id: string, serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      const matchingPricing = service.pricing?.find(p => p.periodDays === formData.duration);
      const price = matchingPricing?.sellPrice || 0;
      const cost = matchingPricing?.buyPrice || 0;
      
      setSubscriptionServices(subscriptionServices.map(s => 
        s.id === id ? { ...s, serviceId: service.id, serviceName: service.name, price, cost } : s
      ));
    }
  };

  const totalPrice = subscriptionServices.reduce((sum, s) => sum + s.price, 0);
  const totalCost = subscriptionServices.reduce((sum, s) => sum + s.cost, 0);
  const finalPrice = totalPrice - formData.discount;
  const profit = finalPrice - totalCost;
  
  // Calculate remaining amount for deferred/partial payments
  const remainingAmount = formData.paymentStatus === 'paid' 
    ? 0 
    : finalPrice - formData.paidAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    // Validate based on subscription type
    if (formData.subscriptionType === 'shared') {
      if (!selectedLegacySharedServiceId) {
        toast.error('يرجى اختيار خدمة مشتركة');
        return;
      }
      if (!selectedSlotId) {
        toast.error('يرجى اختيار إيميل/سلوت متاح');
        return;
      }
    } else {
      const validServices = subscriptionServices.filter(s => s.serviceName.trim());
      if (validServices.length === 0) {
        toast.error('يرجى إضافة خدمة واحدة على الأقل');
        return;
      }
    }

    const validServices = formData.subscriptionType === 'shared' 
      ? subscriptionServices 
      : subscriptionServices.filter(s => s.serviceName.trim());

    onAdd({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerCode: selectedCustomer.id.slice(-4),
      services: validServices,
      startDate,
      endDate,
      autoRenew: formData.autoRenew,
      totalPrice: finalPrice,
      totalCost,
      discount: formData.discount,
      currency: formData.currency,
      paymentStatus: formData.paymentStatus,
      paidAmount: formData.paymentStatus === 'paid' ? finalPrice : formData.paidAmount,
      dueDate,
      paymentNotes: formData.paymentNotes,
      paymentMethod: selectedPaymentMethod ? {
        id: selectedPaymentMethod.id,
        name: selectedPaymentMethod.name,
        type: selectedPaymentMethod.type,
        details: selectedPaymentMethod.details,
      } : undefined,
      // Shared subscription data
      subscriptionType: formData.subscriptionType as 'private' | 'shared',
      slotId: selectedSlotId || undefined,
      loginEmail: availableSlots.find((s) => s.id === selectedSlotId)?.email || undefined,
      loginPassword: availableSlots.find((s) => s.id === selectedSlotId)?.password || undefined,
    });
    
    onClose();
  };

  const selectedSlot = availableSlots.find(s => s.id === selectedSlotId);
  const selectedSlotEmail = selectedSlot?.email?.trim() || '';
  const getLegacyEmailUsage = (email: string) => {
    try {
      const raw = localStorage.getItem('app_services');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const target = email.toLowerCase();
      const matches: {
        serviceName: string;
        accountType: string;
        subscriberEmail?: string;
        users: { name: string; email: string; phone?: string; customerId?: string }[];
      }[] = [];

      for (const svc of parsed) {
        const serviceName = String(svc?.name || '');
        const accounts = Array.isArray(svc?.accounts) ? svc.accounts : [];
        for (const acc of accounts) {
          const accountType = String(acc?.type || '');
          const subscriberEmail = acc?.subscriberEmail ? String(acc.subscriberEmail) : undefined;

          // Email as a shared slot in legacy system
          const sharedEmails = Array.isArray(acc?.sharedEmails) ? acc.sharedEmails : [];
          for (const se of sharedEmails) {
            const seEmail = String(se?.email || '').toLowerCase();
            if (seEmail !== target) continue;
            const usersRaw = Array.isArray(se?.users) ? se.users : [];
            const users = usersRaw.map((u: any) => ({
              name: String(u?.name || ''),
              email: String(u?.email || ''),
              phone: u?.phone ? String(u.phone) : undefined,
              customerId: u?.customerId ? String(u.customerId) : undefined,
            }));
            matches.push({ serviceName, accountType, subscriberEmail, users });
          }

          // Email as a private subscriber in legacy system
          if (subscriberEmail && subscriberEmail.toLowerCase() === target) {
            matches.push({ serviceName, accountType, subscriberEmail, users: [] });
          }
        }
      }

      return matches;
    } catch {
      return [];
    }
  };

  const legacyEmailUsage = selectedSlotEmail ? getLegacyEmailUsage(selectedSlotEmail) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-2xl mx-4 animate-scale-in border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-xl font-bold text-foreground">{isEditing ? 'تعديل الاشتراك' : 'إضافة اشتراك جديد'}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              العميل <span className="text-destructive">*</span> 
              <span className="text-xs text-muted-foreground mr-2">({customers.length} عميل متاح)</span>
            </label>
            <CustomerSearchSelect
              customers={customers}
              selectedCustomer={selectedCustomer}
              onSelect={setSelectedCustomer}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                مدة الاشتراك
              </label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="input-field"
              >
                {!durations.some((d) => d.value === formData.duration) && (
                  <option value={formData.duration}>{formData.duration} يوم</option>
                )}
                {durations.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                العملة
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="input-field"
              >
                {currencies.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Subscription Type */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                نوع الاشتراك
              </label>
              <select
                value={formData.subscriptionType}
                onChange={(e) => {
                  setFormData({ ...formData, subscriptionType: e.target.value });
                  if (e.target.value === 'private') {
                    setSelectedLegacySharedServiceId('');
                    setSelectedSlotId('');
                    setAvailableSlots([]);
                  }
                }}
                className="input-field"
              >
                {subscriptionTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            
          </div>

          {/* Shared Service Selection */}
          {formData.subscriptionType === 'shared' && (
            <div className="space-y-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 text-primary">
                <span className="font-medium">اختيار الخدمة المشتركة</span>
              </div>
              
              {/* Select Shared Service */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  الخدمة <span className="text-destructive">*</span>
                </label>
                <select
                  value={selectedLegacySharedServiceId}
                  onChange={(e) => {
                    const legacyId = e.target.value;
                    setSelectedLegacySharedServiceId(legacyId);
                    setSelectedSlotId('');
                    setAvailableSlots([]);
                    if (legacyId) {
                      // slots will be derived from legacy service data
                    }
                  }}
                  className="input-field"
                >
                  <option value="">اختر خدمة مشتركة</option>
                  {sharedServiceSelectOptions.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Select Available Slot/Email */}
              {selectedLegacySharedServiceId && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Mail className="w-4 h-4 inline ml-1" />
                    الإيميل / السلوت المتاح <span className="text-destructive">*</span>
                  </label>

                  {availableSlots.length === 0 ? (
                    <div className="text-center py-4 text-warning bg-warning/10 rounded-lg">
                      No emails found for this service
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                      {availableSlots.map(slot => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedSlotId(slot.id)}

                          className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition-all text-right ${
                            selectedSlotId === slot.id
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <Mail className="w-4 h-4 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {slot.email || slot.slot_name || 'سلوت متاح'}
                            </p>
                            {slot.accountName && (
                              <p className="text-xs text-muted-foreground">
                                {slot.accountName}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">Subscribers: {slot.subscriptionsCount ?? 0}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Legacy usage (read-only) */}
                  {selectedSlotEmail && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="text-sm font-medium text-foreground mb-2">
                        بيانات الإيميل من صفحة الخدمات (النظام القديم)
                      </div>
                      {legacyEmailUsage.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          لا توجد بيانات مخزنة في النظام القديم لهذا الإيميل.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {legacyEmailUsage.map((m, idx) => (
                            <div key={idx} className="p-2 rounded-md bg-background border border-border">
                              <div className="text-sm text-foreground">
                                <span className="font-medium">{m.serviceName || 'خدمة'}</span>
                                {m.accountType && (
                                  <span className="text-muted-foreground"> ({m.accountType})</span>
                                )}
                              </div>
                              {m.subscriberEmail && (
                                <div className="text-xs text-muted-foreground" dir="ltr">
                                  subscriber: {m.subscriberEmail}
                                </div>
                              )}
                              {m.users.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  users: {m.users.map(u => u.name).filter(Boolean).join('، ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Services Section */}
          {formData.subscriptionType === 'private' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                الخدمات <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={addService}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Plus className="w-4 h-4" />
                إضافة خدمة
              </button>
            </div>
            
            <div className="space-y-2">
              {subscriptionServices.map((service, index) => (
                <div key={service.id} className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                    
                    {services.length > 0 ? (
                      <select
                        value={service.serviceId || ''}
                        onChange={(e) => selectExistingService(service.id, e.target.value)}
                        className="input-field flex-1"
                      >
                        <option value="">اختر خدمة أو أدخل يدوياً</option>
                        {privateServiceSelectOptions.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex-1 text-sm text-muted-foreground">
                        No services found. Add services in the Services page first.
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => removeService(service.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                      disabled={subscriptionServices.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Manual service entry removed: services must be selected from the Services page. */}
                  
                  <div className="flex items-center gap-4 mr-8">
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="number"
                        placeholder="السعر"
                        value={service.price || ''}
                        onChange={(e) => updateService(service.id, 'price', parseFloat(e.target.value) || 0)}
                        className="input-field w-full text-center"
                        min="0"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formData.currency}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="number"
                        placeholder="التكلفة"
                        value={service.cost || ''}
                        onChange={(e) => updateService(service.id, 'cost', parseFloat(e.target.value) || 0)}
                        className="input-field w-full text-center"
                        min="0"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">تكلفة</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Discount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              الخصم ({formData.currency})
            </label>
            <input
              type="number"
              min="0"
              value={formData.discount || ''}
              onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="input-field"
            />
          </div>

          {/* Payment Status Section */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-4">
            <label className="text-sm font-medium text-foreground">حالة الدفع</label>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, paymentStatus: 'paid', paidAmount: 0 })}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  formData.paymentStatus === 'paid'
                    ? 'bg-success/10 border-success text-success'
                    : 'border-border text-muted-foreground hover:border-success/50'
                }`}
              >
                مدفوع كامل
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, paymentStatus: 'partial' })}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  formData.paymentStatus === 'partial'
                    ? 'bg-warning/10 border-warning text-warning'
                    : 'border-border text-muted-foreground hover:border-warning/50'
                }`}
              >
                دفع جزئي
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, paymentStatus: 'deferred', paidAmount: 0 })}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  formData.paymentStatus === 'deferred'
                    ? 'bg-destructive/10 border-destructive text-destructive'
                    : 'border-border text-muted-foreground hover:border-destructive/50'
                }`}
              >
                آجل
              </button>
            </div>

            {/* Payment Method Selection */}
            {(formData.paymentStatus === 'paid' || formData.paymentStatus === 'partial') && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <CreditCard className="w-4 h-4 inline ml-1" />
                  طريقة الدفع
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {paymentMethods.filter(m => m.active).map(method => {
                    const Icon = getMethodIcon(method.type);
                    const isSelected = selectedPaymentMethod?.id === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(isSelected ? null : method)}
                        className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="truncate">{method.name}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedPaymentMethod?.details && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedPaymentMethod.details}
                  </p>
                )}
              </div>
            )}

            {/* Partial Payment Amount */}
            {formData.paymentStatus === 'partial' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  المبلغ المدفوع ({formData.currency})
                </label>
                <input
                  type="number"
                  min="0"
                  max={finalPrice}
                  value={formData.paidAmount || ''}
                  onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="input-field"
                />
              </div>
            )}

            {/* Deferred Payment Options */}
            {(formData.paymentStatus === 'deferred' || formData.paymentStatus === 'partial') && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Calendar className="w-4 h-4 inline ml-1" />
                  موعد السداد
                </label>
                <select
                  value={formData.deferredDays}
                  onChange={(e) => setFormData({ ...formData, deferredDays: parseInt(e.target.value) })}
                  className="input-field"
                >
                  {deferredDays.map(d => (
                    <option key={d.value} value={d.value}>
                      بعد {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payment Notes */}
            {formData.paymentStatus !== 'paid' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  ملاحظات الدفع
                </label>
                <input
                  type="text"
                  value={formData.paymentNotes}
                  onChange={(e) => setFormData({ ...formData, paymentNotes: e.target.value })}
                  placeholder="مثال: سيتم السداد عند استلام الراتب"
                  className="input-field"
                />
              </div>
            )}

            {/* Remaining Amount Display */}
            {formData.paymentStatus !== 'paid' && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المبلغ المتبقي:</span>
                  <span className="font-bold text-destructive">
                    {remainingAmount} {formData.currency}
                  </span>
                </div>
                {dueDate && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">تاريخ السداد:</span>
                    <span className="font-medium text-foreground">
                      {dueDate.toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">إجمالي السعر:</span>
              <span className="font-medium text-foreground">{totalPrice} {formData.currency}</span>
            </div>
            {formData.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">الخصم:</span>
                <span className="font-medium text-destructive">-{formData.discount} {formData.currency}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">السعر بعد الخصم:</span>
              <span className="font-semibold text-foreground">{finalPrice} {formData.currency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">إجمالي التكلفة:</span>
              <span className="font-medium text-foreground">{totalCost} {formData.currency}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-border">
              <span className="text-muted-foreground">الربح المتوقع:</span>
              <span className={`font-bold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {profit} {formData.currency}
              </span>
            </div>
          </div>

          {/* Date Preview */}
          <div className="hidden">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">تاريخ البداية:</span>
              <span className="font-medium text-foreground">{startDate.toLocaleDateString('ar-SA')}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted-foreground">تاريخ الانتهاء:</span>
              <span className="font-medium text-foreground">{endDate.toLocaleDateString('ar-SA')}</span>
            </div>
          </div>

          {/* Editable Dates */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">تاريخ البداية:</label>
                <input
                  type="date"
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">تاريخ الانتهاء:</label>
                <input
                  type="date"
                  value={endDateInput}
                  min={startDateInput}
                  onChange={(e) => {
                    const nextEnd = e.target.value;
                    setEndDateInput(nextEnd);
                    const nextDuration = buildDurationFromDates(startDateInput, nextEnd);
                    setFormData((prev) => ({ ...prev, duration: nextDuration }));
                  }}
                  className="input-field"
                />
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              تغيير تاريخ الانتهاء يحدّث مدة الاشتراك تلقائيا.
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={formData.autoRenew}
              onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
              className="w-4 h-4 rounded border-input accent-primary"
            />
            <span className="text-foreground">تفعيل التجديد التلقائي</span>
          </label>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button 
              type="submit" 
              className="btn-primary flex-1"
              disabled={!selectedCustomer || subscriptionServices.every(s => !s.serviceName.trim())}
            >
              {isEditing ? 'حفظ التعديلات' : 'إضافة الاشتراك'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
